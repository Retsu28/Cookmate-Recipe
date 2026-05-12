const BG_REMOVAL_INPUT_MAX_EDGE = Number(process.env.BG_REMOVAL_INPUT_MAX_EDGE || 768);
const BG_REMOVAL_INPUT_QUALITY = Number(process.env.BG_REMOVAL_INPUT_QUALITY || 82);

// ── HF API config ─────────────────────────────────────────────────────────
const HF_API_URL = 'https://api-inference.huggingface.co/models/briaai/RMBG-1.4';
const HF_API_TIMEOUT_MS = Number(process.env.HF_API_TIMEOUT_MS || 60000);

async function resizeInputForBackgroundRemoval(inputBuffer) {
  const Jimp = require('jimp-compact');
  const source = await Jimp.read(inputBuffer);
  const { width, height } = source.bitmap;
  const maxEdge = Math.max(width, height);

  if (maxEdge <= BG_REMOVAL_INPUT_MAX_EDGE) {
    return { buffer: inputBuffer, mimeType: source.getMIME?.() || 'image/jpeg' };
  }

  const resized = source.clone();
  if (width >= height) {
    resized.resize(BG_REMOVAL_INPUT_MAX_EDGE, Jimp.AUTO, Jimp.RESIZE_BILINEAR);
  } else {
    resized.resize(Jimp.AUTO, BG_REMOVAL_INPUT_MAX_EDGE, Jimp.RESIZE_BILINEAR);
  }

  resized.quality(BG_REMOVAL_INPUT_QUALITY);
  return {
    buffer: await resized.getBufferAsync(Jimp.MIME_JPEG),
    mimeType: Jimp.MIME_JPEG,
  };
}

async function addWhiteOutlineToPng(pngBuffer, thickness = 6) {
  const Jimp = require('jimp-compact');
  const source = await Jimp.read(pngBuffer);
  const pad = thickness + 2;
  const width = source.bitmap.width + pad * 2;
  const height = source.bitmap.height + pad * 2;
  const transparent = Jimp.rgbaToInt(0, 0, 0, 0);
  const white = Jimp.rgbaToInt(255, 255, 255, 255);
  const mask = new Jimp(source.bitmap.width, source.bitmap.height, transparent);

  source.scan(0, 0, source.bitmap.width, source.bitmap.height, function copyAlphaToMask(x, y, idx) {
    const alpha = this.bitmap.data[idx + 3];
    if (alpha > 12) mask.setPixelColor(white, x, y);
  });

  const outlined = new Jimp(width, height, transparent);
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    const dx = Math.round(Math.cos(angle) * thickness);
    const dy = Math.round(Math.sin(angle) * thickness);
    outlined.composite(mask, pad + dx, pad + dy);
  }
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    const dx = Math.round(Math.cos(angle) * (thickness * 0.6));
    const dy = Math.round(Math.sin(angle) * (thickness * 0.6));
    outlined.composite(mask, pad + dx, pad + dy);
  }

  outlined.composite(source, pad, pad);
  return outlined.getBufferAsync(Jimp.MIME_PNG);
}

// ── Strategy 1: Hugging Face Inference API ────────────────────────────────
async function removeBackgroundViaHF(inputBuffer, mimeType) {
  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken || hfToken.trim() === '') {
    throw new Error('HF_API_TOKEN not set.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HF_API_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken.trim()}`,
        'Content-Type': mimeType || 'image/jpeg',
        'Accept': 'image/png',
      },
      body: inputBuffer,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 503) {
    const body = await response.json().catch(() => ({}));
    const waitSec = body?.estimated_time ? Math.ceil(body.estimated_time) : 30;
    throw new Error(`HF model loading, retry after ${waitSec}s.`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`HF API error ${response.status}: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ── Strategy 2: @imgly/background-removal-node (local fallback) ──────────
async function removeBackgroundViaImgly(inputBuffer, mimeType) {
  const { removeBackground } = await import('@imgly/background-removal-node');
  const blob = new Blob([inputBuffer], { type: mimeType || 'image/jpeg' });
  const resultBlob = await removeBackground(blob, {
    model: process.env.BG_REMOVAL_MODEL || 'small',
    output: { format: 'image/png', quality: 1, type: 'foreground' },
  });
  const arrayBuffer = await resultBlob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

process.once('message', async (payload) => {
  try {
    const { base64Data, mimeType } = payload || {};
    if (!base64Data) {
      throw new Error('No image data received by background removal worker.');
    }

    const inputBuffer = Buffer.from(base64Data, 'base64');

    // Resize input (jimp-compact) — shared for both strategies
    let optimizedInput = { buffer: inputBuffer, mimeType: mimeType || 'image/jpeg' };
    try {
      optimizedInput = await resizeInputForBackgroundRemoval(inputBuffer);
    } catch (resizeErr) {
      console.warn('[remove-bg worker] Input resize skipped:', resizeErr.message);
    }

    // ── Hybrid: try HF first, fallback to @imgly ──────────────────────────
    let resultBuffer;
    let strategyUsed = 'hf';
    try {
      console.log('[remove-bg worker] Trying Hugging Face API...');
      resultBuffer = await removeBackgroundViaHF(optimizedInput.buffer, optimizedInput.mimeType);
      console.log('[remove-bg worker] HF API succeeded.');
    } catch (hfErr) {
      console.warn('[remove-bg worker] HF API failed, falling back to local @imgly:', hfErr.message);
      strategyUsed = 'imgly';
      resultBuffer = await removeBackgroundViaImgly(optimizedInput.buffer, optimizedInput.mimeType);
      console.log('[remove-bg worker] @imgly local succeeded.');
    }

    // White outline (jimp-compact) — same for both strategies
    try {
      resultBuffer = await addWhiteOutlineToPng(resultBuffer, 6);
    } catch (outlineErr) {
      console.warn('[remove-bg worker] White outline failed:', outlineErr.message);
    }

    process.send?.({
      type: 'remove-bg-result',
      ok: true,
      cutout: `data:image/png;base64,${resultBuffer.toString('base64')}`,
      strategyUsed,
    });
    process.exit(0);
  } catch (err) {
    process.send?.({
      type: 'remove-bg-result',
      ok: false,
      error: err.message || 'Background removal failed.',
    });
    process.exit(1);
  }
});
