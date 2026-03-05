import api from './axios';

export const tablesAPI = {
    list: (params) => api.get('/api/tables', { params }).then(r => r.data),
    create: (data) => api.post('/api/tables', data).then(r => r.data),
    update: (id, data) => api.patch(`/api/tables/${id}`, data).then(r => r.data),
    changeStatus: (id, status) => api.patch(`/api/tables/${id}/status`, { status }).then(r => r.data),
    delete: (id) => api.delete(`/api/tables/${id}`).then(r => r.data),
};
