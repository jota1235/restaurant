import api from './axios';

export const ordersAPI = {
    list: (params) => api.get('/api/orders', { params }).then(r => r.data),
    show: (id) => api.get(`/api/orders/${id}`).then(r => r.data),
    create: (data) => api.post('/api/orders', data).then(r => r.data),
    updateStatus: (id, status) => api.patch(`/api/orders/${id}/status`, { status }).then(r => r.data),
    updateDeliveryFee: (id, delivery_fee) => api.patch(`/api/orders/${id}/delivery-fee`, { delivery_fee }).then(r => r.data),
    updateItemStatus: (orderId, itemId, status) =>
        api.patch(`/api/orders/${orderId}/items/${itemId}/status`, { status }).then(r => r.data),
    addItems: (orderId, data) => api.post(`/api/orders/${orderId}/items`, data).then(r => r.data),
    removeItem: (orderId, itemId) => api.delete(`/api/orders/${orderId}/items/${itemId}`).then(r => r.data),
    getTicket: (id) => api.get(`/api/orders/${id}/ticket`).then(r => r.data),
    cancel: (id) => api.delete(`/api/orders/${id}`).then(r => r.data),
    markCookItemsReady: (id) => api.post(`/api/orders/${id}/mark-cook-items-ready`).then(r => r.data),
    ringBell: (id) => api.post(`/api/orders/${id}/ring-bell`).then(r => r.data),
    toggleTax: (id) => api.patch(`/api/orders/${id}/toggle-tax`).then(r => r.data),
};
