const express = require('express');
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  getCustomerByPhone,
  updateCustomer,
  getCallList,
  updateCustomerRemark
} = require('../controllers/customerController');
const { addTransaction } = require('../controllers/transactionController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { transactionLimiter } = require('../middleware/rateLimiter');

// All customer routes require authenticated admin access
router.use(requireAdminAuth);

// Call Queue & Circular Daily List (must be before /:phone)
router.get('/call-list', getCallList);

// Customer management
router.get('/', getCustomers);
router.post('/', transactionLimiter, createCustomer);
router.get('/:phone', getCustomerByPhone);
router.patch('/:phone', updateCustomer);
router.patch('/:phone/remarks', updateCustomerRemark);

// Account transactions
router.post('/:phone/transactions', transactionLimiter, addTransaction);

module.exports = router;

