const express = require('express');
const router = express.Router();
const { getBackupData } = require('../controllers/backupController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

// Backup endpoints require admin authorization
router.use(requireAdminAuth);

router.get('/', getBackupData);

module.exports = router;

