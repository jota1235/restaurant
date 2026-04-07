import api from './axios';

export const statsAPI = {
    dashboard: () => api.get('/api/stats/dashboard').then(r => r.data),
    reports: (params) => api.get('/api/stats/reports', { params }).then(r => r.data),
};
