import api from './axios';

export const creditsAPI = {
    list: (params) => api.get('/api/employee-credits', { params }).then(r => r.data),
    create: (data) => api.post('/api/employee-credits', data).then(r => r.data),
    pay: (id, data) => api.post(`/api/employee-credits/${id}/pay`, data).then(r => r.data),
    cancel: (id) => api.post(`/api/employee-credits/${id}/cancel`).then(r => r.data),
};
