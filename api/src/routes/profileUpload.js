const busboy = require('busboy');
const logger = require('../config/logger');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/requireAuth');

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

function handleAvatarUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('multipart/form-data')) {
    return next();
  }
  const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_AVATAR_SIZE } });
  req.body = req.body || {};
  req.file = null;
  let fileError = null;
  let chunks = [];

  bb.on('file', (fieldname, stream, info) => {
    const { filename, mimeType } = info;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      stream.resume();
      fileError = new Error('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    let limitHit = false;
    stream.on('data', (chunk) => { chunks.push(chunk); });
    stream.on('limit', () => {
      limitHit = true;
      chunks = [];
      fileError = new Error('Avatar image must be 2MB or smaller.');
    });
    stream.on('end', () => {
      if (!limitHit) {
        req.file = {
          fieldname,
          originalname: filename,
          mimetype: mimeType,
          buffer: Buffer.concat(chunks),
          size: chunks.reduce((s, c) => s + c.length, 0),
        };
      }
    });
  });

  bb.on('field', (name, val) => { req.body[name] = val; });

  bb.on('finish', () => {
    if (fileError) {
      return res.status(400).json({ error: fileError.message });
    }
    next();
  });

  bb.on('error', (err) => {
    logger.error('[busboy avatar error]', err);
    res.status(500).json({ error: err.message || 'Avatar upload failed.' });
  });

  req.pipe(bb);
}

function uploadAvatarHandler(req, res, next) {
  requireAuth(req, res, () => profileController.uploadAvatar(req, res, next));
}

module.exports = { handleAvatarUpload, uploadAvatarHandler };
