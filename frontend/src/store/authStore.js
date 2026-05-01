import { create } from 'zustand';
import { authAPI } from '../api/auth';

const useAuthStore = create((set, get) => ({
    // Estado
    // Estado con persistencia segura
    user: (() => {
        try {
            const stored = localStorage.getItem('user');
            return (stored && stored !== 'undefined') ? JSON.parse(stored) : null;
        } catch (e) { return null; }
    })(),
    token: localStorage.getItem('auth_token') || null,
    isAuthenticated: !!localStorage.getItem('auth_token'),
    loading: false,
    error: null,

    restaurants: (() => {
        try {
            const stored = localStorage.getItem('restaurants');
            return (stored && stored !== 'undefined') ? JSON.parse(stored) : [];
        } catch (e) { return []; }
    })(),
    activeRestaurantId: localStorage.getItem('active_restaurant_id') || null,
    requiresBranchSelection: localStorage.getItem('requires_branch_selection') === 'true',

    // Acciones
    login: async (credentials) => {
        set({ loading: true, error: null });
        try {
            await authAPI.getCsrf();
            const data = await authAPI.login(credentials);

            // Guardar token y usuario
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('restaurants', JSON.stringify(data.restaurants || []));
            localStorage.setItem('requires_branch_selection', data.requires_branch_selection ? 'true' : 'false');

            const activeId = data.active_restaurant_id || data.user?.restaurant_id;
            if (activeId) {
                localStorage.setItem('active_restaurant_id', activeId);
            }

            set({
                user: data.user,
                token: data.token,
                isAuthenticated: true,
                loading: false,
                restaurants: data.restaurants || [],
                activeRestaurantId: activeId,
                requiresBranchSelection: data.requires_branch_selection || false,
            });

            return { success: true, data };
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error al iniciar sesión';
            set({ error: errorMessage, loading: false });
            return { success: false, error: errorMessage };
        }
    },

    selectBranch: async (restaurantId) => {
        try {
            await authAPI.selectBranch(restaurantId);
            localStorage.setItem('active_restaurant_id', restaurantId);
            localStorage.setItem('requires_branch_selection', 'false');

            const restaurant = get().restaurants.find(r => r.id === restaurantId);

            set({
                activeRestaurantId: restaurantId,
                requiresBranchSelection: false,
            });

            return { success: true, restaurant };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Error al seleccionar sucursal' };
        }
    },

    switchBranch: async (restaurantId) => {
        const result = await get().selectBranch(restaurantId);
        if (result.success) {
            // Force page reload to clear all cached data
            window.location.reload();
        }
        return result;
    },

    register: async (userData) => {
        set({ loading: true, error: null });
        try {
            const data = await authAPI.register(userData);

            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            set({
                user: data.user,
                token: data.token,
                isAuthenticated: true,
                loading: false,
            });

            return { success: true, data };
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error al registrarse';
            set({ error: errorMessage, loading: false });
            return { success: false, error: errorMessage };
        }
    },

    logout: async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('restaurants');
            localStorage.removeItem('active_restaurant_id');
            localStorage.removeItem('requires_branch_selection');

            set({
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: null,
                restaurants: [],
                activeRestaurantId: null,
                requiresBranchSelection: false,
            });
        }
    },

    fetchUser: async () => {
        set({ loading: true });
        try {
            const data = await authAPI.me();

            localStorage.setItem('user', JSON.stringify(data.user));
            if (data.restaurants) {
                localStorage.setItem('restaurants', JSON.stringify(data.restaurants));
            }

            set({
                user: data.user,
                loading: false,
                restaurants: data.restaurants || get().restaurants,
            });
        } catch (error) {
            console.error('Error al obtener usuario:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('restaurants');
            localStorage.removeItem('active_restaurant_id');
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                restaurants: [],
                activeRestaurantId: null,
            });
        }
    },

    setToken: (token) => {
        localStorage.setItem('auth_token', token);
        set({ token, isAuthenticated: true });
    },

    clearError: () => set({ error: null }),
}));

export default useAuthStore;
