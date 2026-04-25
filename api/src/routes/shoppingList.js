const { Router } = require('express');
const shoppingListController = require('../controllers/shoppingListController');

const router = Router();

router.get('/generate/:userId', shoppingListController.generate);

module.exports = router;
