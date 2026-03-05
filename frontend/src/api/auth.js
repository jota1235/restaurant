import api from '../api/axios';

export const authAPI = {
    // CSRF Cookie
    getCsrf: () => api.get('/sanctum/csrf-cookie'),

    // Login
    login: async (credentials) => {
        const response = await api.post('/api/auth/login', credentials);
        return response.data;
    },

    // Register
    register: async (userData) => {
        const response = await api.post('/api/auth/register', userData);
        return response.data;
    },

    // Logout
    logout: async () => {
        const response = await api.post('/api/auth/logout');
        return response.data;
    },

    // Get authenticated user
    me: async () => {
        const response = await api.get('/api/auth/me');
        return response.data;
    },

    // Select branch
    selectBranch: async (restaurantId) => {
        const response = await api.post('/api/auth/select-branch', { restaurant_id: restaurantId });
        return response.data;
    },
};
