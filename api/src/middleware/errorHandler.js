/**
 * Centralized error-handling middleware.
 * Must be registered AFTER all routes.
 */
function errorHandler(err, _req, res, _next) {
  console.error('[API Error]', err);

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
