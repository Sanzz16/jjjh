// Thin fetch wrappers around our own /api/* routes. Centralizing these here
// keeps the two big page components focused on markup/state instead of
// repeating fetch boilerplate, and gives one place to fix a URL/shape if a
// route changes.

async function req(url, options) {
  const res = await fetch(url, options);
  let json;
  try {
    json = await res.json();
  } catch (e) {
    json = null;
  }
  if (!res.ok) {
    throw new Error((json && json.error) || `Request failed: ${res.status}`);
  }
  return json;
}

function jsonBody(body) {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const api = {
  // ---- products ----
  getProducts: (opts = {}) => req(`/api/products${opts.all ? '?all=1' : ''}`),
  createProduct: (data) => req('/api/products', { method: 'POST', ...jsonBody(data) }),
  updateProduct: (id, data) => req(`/api/products/${id}`, { method: 'PATCH', ...jsonBody(data) }),
  deleteProduct: (id) => req(`/api/products/${id}`, { method: 'DELETE' }),

  // ---- stock ----
  getStock: () => req('/api/stock'),

  // ---- accounts ----
  getAccounts: () => req('/api/accounts'),
  createAccount: (data) => req('/api/accounts', { method: 'POST', ...jsonBody(data) }),
  createAccountsBulk: (rows) => req('/api/accounts', { method: 'POST', ...jsonBody({ rows }) }),
  updateAccountStatus: (id, status) => req(`/api/accounts/${id}`, { method: 'PATCH', ...jsonBody({ status }) }),
  deleteAccount: (id) => req(`/api/accounts/${id}`, { method: 'DELETE' }),
  clearSoldAccounts: () => req('/api/accounts?status=sold', { method: 'DELETE' }),

  // ---- orders ----
  getOrders: () => req('/api/orders'),
  getOrder: (id) => req(`/api/orders?id=${encodeURIComponent(id)}`),
  getOrdersByIds: (ids) => req(`/api/orders?ids=${encodeURIComponent(ids.join(','))}`),
  createOrder: (data) => req('/api/orders', { method: 'POST', ...jsonBody(data) }),
  updateOrder: (id, data) => req(`/api/orders/${id}`, { method: 'PATCH', ...jsonBody(data) }),
  confirmOrder: (id, data) => req(`/api/orders/${id}/confirm`, { method: 'POST', ...jsonBody(data) }),
  verifyOrderLink: (id, action, message) =>
    req(`/api/orders/${id}/link`, { method: 'POST', ...jsonBody({ action, message }) }),

  // ---- categories ----
  getCategories: () => req('/api/categories'),

  // ---- banners ----
  getBanners: () => req('/api/banners'),
  getActiveBanner: () => req('/api/banners?active=1'),
  saveBanner: (data) => req('/api/banners', { method: 'POST', ...jsonBody(data) }),
  deleteBanner: (id) => req(`/api/banners/${id}`, { method: 'DELETE' }),

  // ---- announcements ----
  getAnnouncements: () => req('/api/announcements'),
  getActiveAnnouncements: () => req('/api/announcements?active=1'),
  saveAnnouncement: (data) => req('/api/announcements', { method: 'POST', ...jsonBody(data) }),
  deleteAnnouncement: (id) => req(`/api/announcements/${id}`, { method: 'DELETE' }),

  // ---- payment methods ----
  getPaymentMethods: () => req('/api/payment-methods'),
  getActivePaymentMethods: () => req('/api/payment-methods?active=1'),
  savePaymentMethod: (data) => req('/api/payment-methods', { method: 'POST', ...jsonBody(data) }),
  updatePaymentMethod: (id, data) => req(`/api/payment-methods/${id}`, { method: 'PATCH', ...jsonBody(data) }),
  deletePaymentMethod: (id) => req(`/api/payment-methods/${id}`, { method: 'DELETE' }),

  // ---- settings ----
  getSettings: () => req('/api/settings'),
  saveSetting: (key, value) => req('/api/settings', { method: 'POST', ...jsonBody({ key, value }) }),
  saveSettings: (entries) => req('/api/settings', { method: 'POST', ...jsonBody({ entries }) }),

  // ---- stats ----
  getStats: () => req('/api/stats'),

  // ---- leaderboard / feeds ----
  getLeaderboard: () => req('/api/leaderboard'),
  getAllTransactions: () => req('/api/all-transactions'),
  getLiveFeed: () => req('/api/live-feed'),

  // ---- upload ----
  upload: async (file, folder) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder || 'proofs');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Upload failed');
    return json.url;
  },
};
