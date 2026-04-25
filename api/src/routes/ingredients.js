const { Router } = require('express');
const ingredientController = require('../controllers/ingredientController');

const router = Router();

router.get('/', ingredientController.getAll);

module.exports = router;
