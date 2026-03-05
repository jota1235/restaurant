import api from './axios';

export const categoriesAPI = {
    list: (params) => api.get('/api/categories', { params }).then(r => r.data),
    create: (data) => api.post('/api/categories', data).then(r => r.data),
    update: (id, data) => api.patch(`/api/categories/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/api/categories/${id}`).then(r => r.data),
};

export const productsAPI = {
    list: (params) => api.get('/api/products', { params }).then(r => r.data),
    show: (id) => api.get(`/api/products/${id}`).then(r => r.data),
    create: (data) => api.post('/api/products', data).then(r => r.data),
    update: (id, data) => api.patch(`/api/products/${id}`, data).then(r => r.data),
    toggleAvailability: (id) => api.patch(`/api/products/${id}/toggle-availability`).then(r => r.data),
    delete: (id) => api.delete(`/api/products/${id}`).then(r => r.data),
};

export const extrasAPI = {
    list: (params) => api.get('/api/extras', { params }).then(r => r.data),
    create: (data) => api.post('/api/extras', data).then(r => r.data),
    update: (id, data) => api.patch(`/api/extras/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/api/extras/${id}`).then(r => r.data),
};
