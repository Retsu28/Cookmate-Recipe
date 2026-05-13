const { Router } = require('express');
const ingredientController = require('../controllers/ingredientController');
const requireAdmin = require('../middleware/requireAdmin');
const { auditLog } = require('../middleware/auditLog');

const router = Router();

router.get('/', ingredientController.getAll);
router.post('/', requireAdmin, auditLog('create_ingredient', 'ingredient'), ingredientController.create);
router.put('/:id', requireAdmin, auditLog('update_ingredient', 'ingredient'), ingredientController.update);
router.delete('/:id', requireAdmin, auditLog('delete_ingredient', 'ingredient'), ingredientController.remove);

module.exports = router;
