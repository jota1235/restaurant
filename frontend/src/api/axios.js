import axios from 'axios';

// Crear instancia de Axios
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Para CSRF cookies de Sanctum
});

// Interceptor de request: Adjuntar token Bearer + Restaurant ID
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const restaurantId = localStorage.getItem('active_restaurant_id');
        if (restaurantId) {
            config.headers['X-Restaurant-Id'] = restaurantId;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor de response: Manejo global de errores
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // 401: No autenticado → limpiar token y redirigir a login
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        // 403: Suscripción expirada o sin permisos
        if (error.response?.status === 403) {
            const data = error.response.data;
            if (data?.subscription_expired) {
                // Mostrar modal o notificación de suscripción expirada
                console.error('Suscripción expirada');
            }
        }

        return Promise.reject(error);
    }
);

export default api;
