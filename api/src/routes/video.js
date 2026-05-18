const { Router } = require('express');
const axios = require('axios');
const logger = require('../config/logger');

const router = Router();

/**
 * GET /api/video/proxy
 * Proxies video files to avoid CORS issues in web offline mode.
 * Fetches video from external URL (e.g., Cloudinary) and streams it to client.
 * 
 * Query params:
 *   - url: The external video URL to proxy
 */
router.get('/proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Validate URL is a valid HTTP/HTTPS URL
  let targetUrl;
  try {
    targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    logger.info(`[video/proxy] Proxying video from: ${url}`);

    // Stream the video from the external source
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      timeout: 60000, // 60 second timeout for large videos
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Set appropriate headers
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
    res.setHeader('Content-Length', response.headers['content-length'] || '');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Stream the response to client
    response.data.pipe(res);

    response.data.on('end', () => {
      logger.info(`[video/proxy] Successfully proxied video: ${url}`);
    });

    response.data.on('error', (err) => {
      logger.error(`[video/proxy] Stream error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });

  } catch (err) {
    logger.error(`[video/proxy] Error fetching video: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to proxy video',
        message: err.message 
      });
    }
  }
});

/**
 * GET /api/video/stream/:recipeId
 * Streams a video file for a specific recipe (for local file fallback).
 * This is used when videos are stored locally on the server.
 */
router.get('/stream/:recipeId', async (req, res) => {
  const { recipeId } = req.params;
  
  try {
    // Get video filename from database
    const { getVideoFilename } = require('../../repositories/recipeRepository');
    const videoFilename = await getVideoFilename(recipeId);
    
    if (!videoFilename) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // If it's a full URL, redirect to it
    if (videoFilename.startsWith('http')) {
      return res.redirect(videoFilename);
    }

    // Otherwise, serve from local uploads directory
    const path = require('path');
    const fs = require('fs');
    const videoPath = path.join(process.cwd(), 'uploads', 'mp4', videoFilename);

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for video streaming
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      file.pipe(res);
    } else {
      // Full file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    logger.error(`[video/stream] Error: ${err.message}`);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

module.exports = router;
