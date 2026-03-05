import axios from '../api/axios';

const paymentAPI = {
    // Payments
    processPayment: (data) => axios.post('/api/payments', data),
    getPayments: (params) => axios.get('/api/payments', { params }),
    getTicket: (paymentId) => axios.get(`/api/payments/${paymentId}/ticket`),

    // Cash Register
    getRegisterStatus: () => axios.get('/api/cash-registers/status'),
    openRegister: (data) => axios.post('/api/cash-registers/open', data),
    closeRegister: (data) => axios.post('/api/cash-registers/close', data),

    // Movements
    getMovements: () => axios.get('/api/cash-registers/movements'),
    storeMovement: (data) => axios.post('/api/cash-registers/movements', data),
};

export default paymentAPI;
