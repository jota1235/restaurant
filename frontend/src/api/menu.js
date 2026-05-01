import api from './axios';

export const categoriesAPI = {
    list: (params) => api.get('/api/categories', { params }).then(r => r.data),
    create: (data) => api.post('/api/categories', data).then(r => r.data),
    update: (id, data) => api.patch(`/api/categories/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/api/categories/${id}`).then(r => r.data),
};

// Helper: build FormData from a plain JS object (handles File + complex fields)
function buildProductFormData(data) {
    const fd = new FormData();
    Object.entries(data).forEach(([key, val]) => {
        if (val === undefined) return;
        if (key === 'image' && val instanceof File) {
            fd.append('image', val);
        } else if (typeof val === 'object' && val !== null) {
            fd.append(key, JSON.stringify(val));
        } else {
            // Send empty string for null values to ensure they are updated in backend
            fd.append(key, val === null ? '' : val);
        }
    });
    return fd;
}

export const productsAPI = {
    list: (params) => api.get('/api/products', { params: { ...params, _t: Date.now() } }).then(r => r.data),
    show: (id) => api.get(`/api/products/${id}`).then(r => r.data),
    create: (data) => api.post('/api/products', buildProductFormData(data), {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data),
    update: (id, data) => {
        const fd = buildProductFormData(data);
        fd.append('_method', 'PUT');
        return api.post(`/api/products/${id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(r => r.data);
    },
    toggleAvailability: (id) => api.patch(`/api/products/${id}/toggle-availability`).then(r => r.data),
    delete: (id) => api.delete(`/api/products/${id}`).then(r => r.data),
};

export const extrasAPI = {
    list: (params) => api.get('/api/extras', { params }).then(r => r.data),
    create: (data) => api.post('/api/extras', data).then(r => r.data),
    update: (id, data) => api.patch(`/api/extras/${id}`, data).then(r => r.data),
    delete: (id) => api.delete(`/api/extras/${id}`).then(r => r.data),
};
