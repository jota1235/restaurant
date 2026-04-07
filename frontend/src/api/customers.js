import api from './axios';
import useAuthStore from '../store/authStore';

// Helper for passing the correct restaurant_id based on selected branch
const getRestaurantId = () => {
    const { user, selectedBranch } = useAuthStore.getState();
    const isMultiBranch = user?.roles?.some(r => r.name === 'superadmin' || r.name === 'admin');
    return isMultiBranch && selectedBranch ? selectedBranch.id : user?.restaurant_id;
};

export const customersAPI = {
    search: async (term = '') => {
        const res = await api.get('/api/customers', {
            params: {
                search: term,
                restaurant_id: getRestaurantId(),
            }
        });
        return res.data;
    },
    create: async (data) => {
        const payload = { ...data, restaurant_id: getRestaurantId() };
        const res = await api.post('/api/customers', payload);
        return res.data;
    },
    update: async (id, data) => {
        const payload = { ...data, restaurant_id: getRestaurantId() };
        const res = await api.patch(`/api/customers/${id}`, payload);
        return res.data;
    },
    addAddress: async (customerId, addressData) => {
        const payload = { ...addressData, restaurant_id: getRestaurantId() };
        const res = await api.post(`/api/customers/${customerId}/addresses`, payload);
        return res.data;
    },
    updateAddress: async (customerId, addressId, addressData) => {
        const payload = { ...addressData, restaurant_id: getRestaurantId() };
        const res = await api.patch(`/api/customers/${customerId}/addresses/${addressId}`, payload);
        return res.data;
    },
    deleteAddress: async (customerId, addressId) => {
        const res = await api.delete(`/api/customers/${customerId}/addresses/${addressId}`, {
            params: { restaurant_id: getRestaurantId() }
        });
        return res.data;
    }
};
