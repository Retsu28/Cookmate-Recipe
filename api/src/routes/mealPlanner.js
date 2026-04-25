const { Router } = require('express');
const mealPlannerController = require('../controllers/mealPlannerController');

const router = Router();

router.get('/:userId', mealPlannerController.getPlan);
router.post('/assign', mealPlannerController.assignMeal);

module.exports = router;
