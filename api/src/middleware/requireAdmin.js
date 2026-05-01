const { requireAuth } = require('./requireAuth');

/**
 * requireAdmin — composed middleware that first authenticates the user via
 * requireAuth, then checks that user has role === 'admin'.
 *
 * Usage in routes:
 *   router.post('/', requireAdmin, controller.create);
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);

    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    next();
  });
}

module.exports = requireAdmin;
