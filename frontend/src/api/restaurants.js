import api from './axios';

export const restaurantsAPI = {
    list: (params) => api.get('/api/restaurants', { params }).then(r => r.data),
    show: (id) => api.get(`/api/restaurants/${id}`).then(r => r.data),
    create: (data) => api.post('/api/restaurants', data).then(r => r.data),
    update: (id, data) => api.patch(`/api/restaurants/${id}`, data).then(r => r.data),
    toggleActive: (id) => api.patch(`/api/restaurants/${id}/toggle-active`).then(r => r.data),
    delete: (id) => api.delete(`/api/restaurants/${id}`).then(r => r.data),
};
