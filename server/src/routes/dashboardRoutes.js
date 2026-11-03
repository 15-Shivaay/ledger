const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

// All dashboard endpoints require admin access
router.use(requireAdminAuth);

router.get('/', getDashboardSummary);

module.exports = router;

