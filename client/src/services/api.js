/**
 * Frontend API client with Clerk token injection
 */

let getTokenFunction = null;

/**
 * Configure token provider from Clerk useAuth hook
 */
export function setAuthTokenProvider(getTokenFn) {
  getTokenFunction = getTokenFn;
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (getTokenFunction) {
    try {
      const token = await getTokenFunction();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Could not retrieve Clerk session token:', e);
    }
  }

  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.messageEn || data.error || 'API Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Dashboard metrics
  getDashboard: () => fetchWithAuth('/api/dashboard'),

  // Customers
  getCustomers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    return fetchWithAuth(`/api/customers?${query.toString()}`);
  },

  getCustomer: (phone) => fetchWithAuth(`/api/customers/${encodeURIComponent(phone)}`),

  // Call Queue & Circular Daily List
  getCallList: (day, limit = 50) => {
    const dayParam = day !== undefined && day !== null ? `day=${day}&` : '';
    return fetchWithAuth(`/api/customers/call-list?${dayParam}limit=${limit}`);
  },

  setCallQueueDay: (day) =>
    fetchWithAuth('/api/customers/call-list/day', {
      method: 'POST',
      body: JSON.stringify({ day })
    }),

  // Update Customer Remark
  updateCustomerRemark: (phone, data) =>
    fetchWithAuth(`/api/customers/${encodeURIComponent(phone)}/remarks`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  // Add customer to today's call list
  addToCallList: (phone, data = {}) =>
    fetchWithAuth(`/api/customers/${encodeURIComponent(phone)}/add-to-call-list`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  createCustomer: (customerData) =>
    fetchWithAuth('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    }),

  updateCustomer: (phone, customerData) =>
    fetchWithAuth(`/api/customers/${encodeURIComponent(phone)}`, {
      method: 'PATCH',
      body: JSON.stringify(customerData)
    }),

  // Transactions
  addTransaction: (phone, txData) =>
    fetchWithAuth(`/api/customers/${encodeURIComponent(phone)}/transactions`, {
      method: 'POST',
      body: JSON.stringify(txData)
    }),

  // Correct / Update Due Amount
  correctCustomerBalance: (phone, data) =>
    fetchWithAuth(`/api/customers/${encodeURIComponent(phone)}/correct-balance`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Settings
  getSettings: () => fetchWithAuth('/api/settings'),

  updateSettings: (settingsData) =>
    fetchWithAuth('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settingsData)
    }),

  // Complete Database Backup
  getBackupData: () => fetchWithAuth('/api/backup')
};

