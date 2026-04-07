import api from './axios';

export const inventoryAPI = {
    list: (params) => api.get('/api/inventory', { params }).then(r => r.data),
    create: (data) => api.post('/api/inventory', data).then(r => r.data),
    update: (id, data) => api.patch(`/api/inventory/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/api/inventory/${id}`).then(r => r.data),
    movements: (id) => api.get(`/api/inventory/${id}/movements`).then(r => r.data),
    addMovement: (id, data) => api.post(`/api/inventory/${id}/movements`, data).then(r => r.data),
};
