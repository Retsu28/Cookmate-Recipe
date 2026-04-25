const { Router } = require('express');
const inventoryController = require('../controllers/inventoryController');

const router = Router();

router.get('/:userId', inventoryController.getInventory);

module.exports = router;
