const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

// All settings endpoints require admin access
router.use(requireAdminAuth);

router.get('/', getSettings);
router.patch('/', updateSettings);

module.exports = router;

