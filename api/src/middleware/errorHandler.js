/**
 * Centralized error-handling middleware.
 * Must be registered AFTER all routes.
 */
function errorHandler(err, _req, res, _next) {
  console.error('[API Error]', err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large. Upload an image smaller than 5MB.' });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON request body.' });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
