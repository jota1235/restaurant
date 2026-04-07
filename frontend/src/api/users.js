import api from './axios';

export const usersAPI = {
    list: (params) => api.get('/api/users', { params }).then(r => r.data),
    listCooks: () => api.get('/api/users', { params: { role: 'cocina' } }).then(r => r.data),
    show: (id) => api.get(`/api/users/${id}`).then(r => r.data),
    create: (data) => api.post('/api/users', data).then(r => r.data),
    update: (id, data) => api.patch(`/api/users/${id}`, data).then(r => r.data),
    toggleActive: (id) => api.patch(`/api/users/${id}/toggle-active`).then(r => r.data),
    delete: (id) => api.delete(`/api/users/${id}`).then(r => r.data),
};
