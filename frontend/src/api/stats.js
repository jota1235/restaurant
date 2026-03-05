import api from './axios';

export const statsAPI = {
    dashboard: () => api.get('/api/stats/dashboard').then(r => r.data),
};
