const { Router } = require('express');
const { getSeasonalData, updateSeasonalData } = require('../controllers/seasonalController');
const requireAdmin = require('../middleware/requireAdmin');

const router = Router();

router.get('/', getSeasonalData);
router.put('/', requireAdmin, updateSeasonalData);

module.exports = router;
