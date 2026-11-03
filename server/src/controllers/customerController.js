const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const { normalizePhone } = require('../utils/phoneNormalizer');
const { getBilingualMessage } = require('../utils/i18nMessages');
const { formatCurrency } = require('../utils/currency');

/**
 * GET /api/customers
 * List customers with searching, sorting, and pagination
 */
async function getCustomers(req, res, next) {
  try {
    const {
      search = '',
      sortBy = 'activity_desc',
      page = 1,
      limit = 10,
      includeArchived = 'false'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const query = {};
    if (includeArchived !== 'true') {
      query.isArchived = false;
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedTerm, 'i');

      // Also clean search term to match digits for phone numbers
      const digits = term.replace(/\D/g, '');

      const searchOr = [
        { name: regex },
        { address: regex },
        { phoneDisplay: regex },
        { phoneNormalized: regex }
      ];

      if (digits.length >= 3) {
        searchOr.push({ phoneNormalized: new RegExp(digits) });
      }

      query.$or = searchOr;
    }

    // Determine sorting criteria
    let sortOptions = {};
    switch (sortBy) {
      case 'balance_asc':
        sortOptions = { currentBalanceMinor: 1, name: 1 };
        break;
      case 'balance_desc':
        sortOptions = { currentBalanceMinor: -1, name: 1 };
        break;
      case 'name_asc':
        sortOptions = { name: 1 };
        break;
      case 'name_desc':
        sortOptions = { name: -1 };
        break;
      case 'address_asc':
        sortOptions = { address: 1, name: 1 };
        break;
      case 'address_desc':
        sortOptions = { address: -1, name: 1 };
        break;
      case 'activity_asc':
        sortOptions = { lastActivityAt: 1 };
        break;
      case 'activity_desc':
      default:
        sortOptions = { lastActivityAt: -1, createdAt: -1 };
        break;
    }

    const [customers, total] = await Promise.all([
      Customer.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Customer.countDocuments(query)
    ]);

    const currency = await Setting.getSetting('currency', 'INR');

    // Attach human-readable formatted balance
    const enrichedCustomers = customers.map((c) => ({
      ...c,
      id: c._id.toString(),
      balanceFormattedEn: formatCurrency(c.currentBalanceMinor, 'en-IN', currency),
      balanceFormattedHi: formatCurrency(c.currentBalanceMinor, 'hi-IN', currency)
    }));

    res.json({
      success: true,
      data: enrichedCustomers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/customers
 * Create a new customer account
 */
async function createCustomer(req, res, next) {
  try {
    const { name, address = '', phone } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      const msg = getBilingualMessage('INVALID_NAME');
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    const phoneValidation = normalizePhone(phone);
    if (!phoneValidation.isValid) {
      const msg = getBilingualMessage('INVALID_PHONE');
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        code: msg.code,
        messageEn: phoneValidation.error || msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    // Check for existing customer with the normalized phone
    const existingCustomer = await Customer.findOne({
      phoneNormalized: phoneValidation.normalized
    });

    if (existingCustomer) {
      const msg = getBilingualMessage('DUPLICATE_PHONE');
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    const customer = new Customer({
      name: name.trim(),
      address: address ? address.trim() : '',
      phoneNormalized: phoneValidation.normalized,
      phoneDisplay: phoneValidation.display,
      currentBalanceMinor: 0,
      lastActivityAt: new Date()
    });

    await customer.save();

    const currency = await Setting.getSetting('currency', 'INR');
    const msg = getBilingualMessage('CUSTOMER_CREATED');

    res.status(201).json({
      success: true,
      messageEn: msg.messageEn,
      messageHi: msg.messageHi,
      data: {
        ...customer.toObject(),
        id: customer._id.toString(),
        balanceFormattedEn: formatCurrency(0, 'en-IN', currency),
        balanceFormattedHi: formatCurrency(0, 'hi-IN', currency)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customers/:phone
 * Retrieve customer account and full transaction history
 */
async function getCustomerByPhone(req, res, next) {
  try {
    const rawPhone = decodeURIComponent(req.params.phone);
    const phoneValidation = normalizePhone(rawPhone);
    const lookupPhone = phoneValidation.isValid ? phoneValidation.normalized : rawPhone;

    const customer = await Customer.findOne({
      $or: [{ phoneNormalized: lookupPhone }, { phoneNormalized: rawPhone }]
    });

    if (!customer) {
      const msg = getBilingualMessage('CUSTOMER_NOT_FOUND');
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    // Retrieve transactions sorted newest first
    const transactions = await Transaction.find({ customerId: customer._id })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Verify server-side balance calculation: credits minus debits
    let totalCreditsMinor = 0;
    let totalDebitsMinor = 0;

    for (const tx of transactions) {
      if (tx.type === 'credit') {
        totalCreditsMinor += tx.amountMinor;
      } else if (tx.type === 'debit') {
        totalDebitsMinor += tx.amountMinor;
      }
    }

    const computedBalanceMinor = totalCreditsMinor - totalDebitsMinor;

    // Self-healing: if cached balance drifted, update it
    if (customer.currentBalanceMinor !== computedBalanceMinor) {
      customer.currentBalanceMinor = computedBalanceMinor;
      await customer.save();
    }

    const currency = await Setting.getSetting('currency', 'INR');

    const enrichedTransactions = transactions.map((t) => ({
      ...t,
      id: t._id.toString(),
      amountFormattedEn: formatCurrency(t.amountMinor, 'en-IN', currency),
      amountFormattedHi: formatCurrency(t.amountMinor, 'hi-IN', currency),
      balanceAfterFormattedEn: formatCurrency(t.balanceAfterMinor, 'en-IN', currency),
      balanceAfterFormattedHi: formatCurrency(t.balanceAfterMinor, 'hi-IN', currency)
    }));

    res.json({
      success: true,
      data: {
        customer: {
          ...customer.toObject(),
          id: customer._id.toString(),
          balanceFormattedEn: formatCurrency(customer.currentBalanceMinor, 'en-IN', currency),
          balanceFormattedHi: formatCurrency(customer.currentBalanceMinor, 'hi-IN', currency),
          totalCreditsMinor,
          totalDebitsMinor
        },
        transactions: enrichedTransactions
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/customers/:phone
 * Update customer's editable details (name, address)
 * Prevents phone number modifications
 */
async function updateCustomer(req, res, next) {
  try {
    const rawPhone = decodeURIComponent(req.params.phone);
    const phoneValidation = normalizePhone(rawPhone);
    const lookupPhone = phoneValidation.isValid ? phoneValidation.normalized : rawPhone;

    const customer = await Customer.findOne({
      $or: [{ phoneNormalized: lookupPhone }, { phoneNormalized: rawPhone }]
    });

    if (!customer) {
      const msg = getBilingualMessage('CUSTOMER_NOT_FOUND');
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    // Check if client attempted to alter phone number
    if (req.body.phone !== undefined) {
      const attemptedPhone = normalizePhone(req.body.phone);
      if (attemptedPhone.isValid && attemptedPhone.normalized !== customer.phoneNormalized) {
        const msg = getBilingualMessage('PHONE_CANNOT_BE_CHANGED');
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          code: msg.code,
          messageEn: msg.messageEn,
          messageHi: msg.messageHi
        });
      }
    }

    // Validate name if provided
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || req.body.name.trim().length < 2) {
        const msg = getBilingualMessage('INVALID_NAME');
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          code: msg.code,
          messageEn: msg.messageEn,
          messageHi: msg.messageHi
        });
      }
      customer.name = req.body.name.trim();
    }

    if (req.body.address !== undefined) {
      customer.address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
    }

    await customer.save();

    const currency = await Setting.getSetting('currency', 'INR');
    const msg = getBilingualMessage('CUSTOMER_UPDATED');

    res.json({
      success: true,
      messageEn: msg.messageEn,
      messageHi: msg.messageHi,
      data: {
        ...customer.toObject(),
        id: customer._id.toString(),
        balanceFormattedEn: formatCurrency(customer.currentBalanceMinor, 'en-IN', currency),
        balanceFormattedHi: formatCurrency(customer.currentBalanceMinor, 'hi-IN', currency)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customers/call-list
 * Returns a circular list of 50 customers per day,
 * ordered by last updated date (oldest first, newer customers at the last of list).
 */
async function getCallList(req, res, next) {
  try {
    const rawDay = parseInt(req.query.day, 10);
    const day = isNaN(rawDay) || rawDay < 1 ? 1 : rawDay;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    // Only active customers
    const query = { isArchived: false };

    // Total active customers
    const totalCustomers = await Customer.countDocuments(query);
    const totalDays = Math.ceil(totalCustomers / limit) || 1;

    // Circular day resolution
    const currentDay = ((day - 1) % totalDays) + 1;
    const nextDay = (currentDay % totalDays) + 1;
    const prevDay = currentDay === 1 ? totalDays : currentDay - 1;

    if (totalCustomers === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          day: 1,
          totalDays: 1,
          totalCustomers: 0,
          limit,
          nextDay: 1,
          prevDay: 1,
          isWrapped: false
        }
      });
    }

    // Order customers with respect to last updated date (ascending: oldest updated first, newer at the last of list)
    const allCustomers = await Customer.find(query)
      .sort({ updatedAt: 1, createdAt: 1 })
      .lean();

    // Circular selection of 50 customers for currentDay
    const startIndex = ((currentDay - 1) * limit) % totalCustomers;
    let selected = [];
    let isWrapped = false;

    if (totalCustomers <= limit) {
      selected = allCustomers;
    } else if (startIndex + limit <= totalCustomers) {
      selected = allCustomers.slice(startIndex, startIndex + limit);
    } else {
      // Wrap around circularly to the beginning to provide full 50 customers
      isWrapped = true;
      const head = allCustomers.slice(startIndex);
      const remainingNeeded = limit - head.length;
      const tail = allCustomers.slice(0, remainingNeeded);
      selected = [...head, ...tail];
    }

    // Include customers added to today's call list (searched & added or called today)
    const todayDateStr = req.query.date || new Date().toISOString().split('T')[0];
    let addedCustomers = [];

    if (currentDay === 1 || req.query.includeAdded === 'true') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const addedCustomersRaw = await Customer.find({
        isArchived: false,
        $or: [
          { addedToCallListDate: todayDateStr },
          { lastCalledAt: { $gte: startOfToday, $lte: endOfToday } }
        ]
      })
        .sort({ lastCalledAt: -1, updatedAt: -1 })
        .lean();

      const selectedIdSet = new Set(selected.map((c) => c._id.toString()));
      addedCustomers = addedCustomersRaw
        .filter((c) => !selectedIdSet.has(c._id.toString()))
        .map((c) => ({
          ...c,
          isManuallyAdded: true
        }));
    }

    const combined = [...addedCustomers, ...selected];
    const currency = await Setting.getSetting('currency', 'INR');

    const enriched = combined.map((c, index) => ({
      ...c,
      id: c._id.toString(),
      isManuallyAdded: !!c.isManuallyAdded,
      queuePosition: c.isManuallyAdded
        ? `+${index + 1}`
        : ((startIndex + (index - addedCustomers.length)) % totalCustomers) + 1,
      balanceFormattedEn: formatCurrency(c.currentBalanceMinor, 'en-IN', currency),
      balanceFormattedHi: formatCurrency(c.currentBalanceMinor, 'hi-IN', currency)
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: {
        day: currentDay,
        requestedDay: day,
        totalDays,
        totalCustomers,
        limit,
        nextDay,
        prevDay,
        isWrapped,
        addedTodayCount: addedCustomers.length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/customers/:phone/remarks
 * Add / update call remark and notes for a customer
 */
async function updateCustomerRemark(req, res, next) {
  try {
    const rawPhone = decodeURIComponent(req.params.phone);
    const phoneValidation = normalizePhone(rawPhone);
    const lookupPhone = phoneValidation.isValid ? phoneValidation.normalized : rawPhone;

    const customer = await Customer.findOne({
      $or: [{ phoneNormalized: lookupPhone }, { phoneNormalized: rawPhone }]
    });

    if (!customer) {
      const msg = getBilingualMessage('CUSTOMER_NOT_FOUND');
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    const { remark = '', markCalled = true } = req.body;
    const todayDateStr = req.body.date || new Date().toISOString().split('T')[0];

    customer.remarks = typeof remark === 'string' ? remark.trim() : '';
    if (markCalled) {
      customer.lastCalledAt = new Date();
      customer.addedToCallListDate = todayDateStr;
    }

    if (remark && remark.trim()) {
      if (!customer.callHistory) {
        customer.callHistory = [];
      }
      customer.callHistory.unshift({
        remark: remark.trim(),
        calledAt: new Date(),
        calledBy: req.auth?.userId || req.adminUser?.userId || 'admin'
      });
      // Keep last 50 call entries
      if (customer.callHistory.length > 50) {
        customer.callHistory = customer.callHistory.slice(0, 50);
      }
    }

    await customer.save();

    const currency = await Setting.getSetting('currency', 'INR');

    res.json({
      success: true,
      messageEn: 'Remark saved successfully.',
      messageHi: 'टिप्पणी सफलतापूर्वक सहेजी गई।',
      data: {
        ...customer.toObject(),
        id: customer._id.toString(),
        balanceFormattedEn: formatCurrency(customer.currentBalanceMinor, 'en-IN', currency),
        balanceFormattedHi: formatCurrency(customer.currentBalanceMinor, 'hi-IN', currency)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/customers/:phone/add-to-call-list
 * Add a customer to today's daily call list (for searched & called customers)
 */
async function addToCallList(req, res, next) {
  try {
    const rawPhone = decodeURIComponent(req.params.phone);
    const phoneValidation = normalizePhone(rawPhone);
    const lookupPhone = phoneValidation.isValid ? phoneValidation.normalized : rawPhone;

    const customer = await Customer.findOne({
      $or: [{ phoneNormalized: lookupPhone }, { phoneNormalized: rawPhone }]
    });

    if (!customer) {
      const msg = getBilingualMessage('CUSTOMER_NOT_FOUND');
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        code: msg.code,
        messageEn: msg.messageEn,
        messageHi: msg.messageHi
      });
    }

    const todayDateStr = req.body.date || new Date().toISOString().split('T')[0];
    customer.addedToCallListDate = todayDateStr;
    await customer.save();

    const currency = await Setting.getSetting('currency', 'INR');

    res.json({
      success: true,
      messageEn: "Customer added to today's call list successfully.",
      messageHi: 'ग्राहक को आज की कॉल सूची में सफलतापूर्वक जोड़ दिया गया।',
      data: {
        ...customer.toObject(),
        id: customer._id.toString(),
        isManuallyAdded: true,
        balanceFormattedEn: formatCurrency(customer.currentBalanceMinor, 'en-IN', currency),
        balanceFormattedHi: formatCurrency(customer.currentBalanceMinor, 'hi-IN', currency)
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCustomers,
  createCustomer,
  getCustomerByPhone,
  updateCustomer,
  getCallList,
  updateCustomerRemark,
  addToCallList
};

