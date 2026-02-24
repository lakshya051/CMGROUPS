const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
};

// Generic fetch wrapper
const apiFetch = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...getAuthHeaders(), ...options.headers }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }

    return data;
};

// ============ AUTH ============
export const authAPI = {
    login: (identifier, password) =>
        apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password })
        }),

    register: (name, email, password, phone, referralCode) =>
        apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, phone, referralCode })
        }),

    verifyEmail: (email, otp) =>
        apiFetch('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        }),

    // Backward-compatible alias for older callers.
    resendOTP: (email) =>
        apiFetch('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
        }),

    getMe: () => apiFetch('/auth/me'),

    updateProfile: (data) =>
        apiFetch('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    resendVerification: (email) =>
        apiFetch('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
        })
};

// ============ PRODUCTS ============
export const productsAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/products${query ? `?${query}` : ''}`);
    },

    getById: (id) => apiFetch(`/products/${id}`),

    create: (productData) =>
        apiFetch('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        }),

    update: (id, productData) =>
        apiFetch(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        }),

    delete: (id) =>
        apiFetch(`/products/${id}`, { method: 'DELETE' }),

    addVariant: (productId, variantData) =>
        apiFetch(`/products/${productId}/variants`, {
            method: 'POST',
            body: JSON.stringify(variantData)
        }),

    deleteVariant: (productId, variantId) =>
        apiFetch(`/products/${productId}/variants/${variantId}`, { method: 'DELETE' })
};

// ============ ORDERS ============
export const ordersAPI = {
    place: (items, total, paymentMethod = 'pay_at_store', shippingAddress = null, referralCode = null, useWallet = false, walletUsed = 0) =>
        apiFetch('/orders', {
            method: 'POST',
            body: JSON.stringify({ items, total, paymentMethod, shippingAddress, referralCode, useWallet, walletUsed })
        }),

    getMyOrders: () => apiFetch('/orders/my-orders'),

    getMyStats: () => apiFetch('/orders/my-stats'),

    getAll: () => apiFetch('/orders'),

    updateStatus: (id, status) =>
        apiFetch(`/orders/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        }),

    verifyPayment: (id, otp) =>
        apiFetch(`/orders/${id}/verify-payment`, {
            method: 'POST',
            body: JSON.stringify({ otp })
        }),

    cancel: (id, reason) =>
        apiFetch(`/orders/${id}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        }),

    returnOrder: (id, reason) =>
        apiFetch(`/orders/${id}/return`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        }),

    processRefund: (id, action) =>
        apiFetch(`/orders/${id}/refund`, {
            method: 'PUT',
            body: JSON.stringify({ action })
        }),

    downloadInvoice: async (id) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders/${id}/invoice`, {
            headers: {
                ...(token && { Authorization: `Bearer ${token}` })
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to download invoice');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TechNova_Invoice_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }
};

// ============ WISHLIST ============
export const wishlistAPI = {
    get: () => apiFetch('/wishlist'),
    add: (productId) => apiFetch(`/wishlist/${productId}`, { method: 'POST' }),
    remove: (productId) => apiFetch(`/wishlist/${productId}`, { method: 'DELETE' }),
    clear: () => apiFetch('/wishlist', { method: 'DELETE' })
};

export const alertsAPI = {
    getAll: () => apiFetch('/alerts'),
    toggle: (productId, type, priceThreshold) =>
        apiFetch(`/alerts/${productId}`, {
            method: 'POST',
            body: JSON.stringify({ type, priceThreshold })
        })
};

export const notificationsAPI = {
    getAll: () => apiFetch('/notifications'),
    markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => apiFetch('/notifications/read-all', { method: 'POST' })
};

// ============ REVIEWS ============
export const reviewsAPI = {
    getForProduct: (productId) => apiFetch(`/reviews/${productId}`),

    create: (productId, rating, comment, images = []) =>
        apiFetch(`/reviews/${productId}`, {
            method: 'POST',
            body: JSON.stringify({ rating, comment, images })
        }),

    voteHelpful: (reviewId) =>
        apiFetch(`/reviews/${reviewId}/helpful`, { method: 'POST' })
};

// ============ SERVICES ============
export const servicesAPI = {
    getAvailableSlots: (date) => apiFetch(`/services/available-slots?date=${date}`),

    book: (bookingData) =>
        apiFetch('/services/book', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        }),

    getMyBookings: () => apiFetch('/services/my-bookings'),

    getAll: () => apiFetch('/services'),

    updateStatus: (id, data) =>
        apiFetch(`/services/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    // verify-otp endpoint was removed from backend.
    verifyPickupOtp: () =>
        Promise.reject(new Error('Service pickup OTP verification is no longer supported.'))
};

// ============ COURSES ============
export const coursesAPI = {
    getAll: () => apiFetch('/courses'),
    getById: (id) => apiFetch(`/courses/${id}`),

    // Student
    apply: (data) => apiFetch('/courses/apply', { method: 'POST', body: JSON.stringify(data) }),
    getMyApplications: () => apiFetch('/courses/my-applications'),
    getMyEnrollments: () => apiFetch('/courses/my-enrollments'), // backward compat

    // Admin - Courses
    create: (data) => apiFetch('/courses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/courses/${id}`, { method: 'DELETE' }),

    // Admin - Durations
    addDuration: (courseId, data) => apiFetch(`/courses/${courseId}/durations`, { method: 'POST', body: JSON.stringify(data) }),
    updateDuration: (id, data) => apiFetch(`/courses/durations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDuration: (id) => apiFetch(`/courses/durations/${id}`, { method: 'DELETE' }),

    // Admin - Batches
    addBatch: (durationId, data) => apiFetch(`/courses/durations/${durationId}/batches`, { method: 'POST', body: JSON.stringify(data) }),
    updateBatch: (id, data) => apiFetch(`/courses/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteBatch: (id) => apiFetch(`/courses/batches/${id}`, { method: 'DELETE' }),

    // Admin - Applications
    getAllApplications: () => apiFetch('/courses/applications/all'),
    updateStatus: (id, status) => apiFetch(`/courses/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    recordFeePayment: (id, data) => apiFetch(`/courses/applications/${id}/fee`, { method: 'POST', body: JSON.stringify(data) }),

    // Certificate
    downloadCertificate: async (courseId) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/courses/${courseId}/certificate`, {
            headers: { ...(token && { Authorization: `Bearer ${token}` }) }
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to download certificate');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificate_${courseId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }
};


// ============ CATEGORIES ============
export const categoriesAPI = {
    getAll: () => apiFetch('/categories'),
    create: (data) =>
        apiFetch('/categories', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    delete: (id) =>
        apiFetch(`/categories/${id}`, {
            method: 'DELETE'
        })
};

// ============ SERVICE TYPES ============
export const serviceTypesAPI = {
    getAll: () => apiFetch('/categories/service-types'),
    getAllAdmin: () => apiFetch('/categories/service-types/all'),
    create: (data) =>
        apiFetch('/categories/service-types', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    update: (id, data) =>
        apiFetch(`/categories/service-types/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
    delete: (id) =>
        apiFetch(`/categories/service-types/${id}`, {
            method: 'DELETE'
        })
};

// ============ COUPONS ============
export const couponsAPI = {
    validate: (code) =>
        apiFetch('/coupons/validate', {
            method: 'POST',
            body: JSON.stringify({ code })
        }),

    getAll: () => apiFetch('/coupons'),

    create: (data) =>
        apiFetch('/coupons', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    update: (id, data) =>
        apiFetch(`/coupons/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    delete: (id) =>
        apiFetch(`/coupons/${id}`, { method: 'DELETE' })
};

// ============ ADMIN ============
export const adminAPI = {
    getStats: () => apiFetch('/admin/stats'),

    getUsers: () => apiFetch('/admin/users'),

    getUserDetails: (id) => apiFetch(`/admin/users/${id}`),

    updateUserRole: (id, role) =>
        apiFetch(`/admin/users/${id}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        }),

    getReferrals: () => apiFetch('/admin/referrals'),

    getReferralSettings: () => apiFetch('/admin/referral-settings'),

    updateReferralSettings: (data) =>
        apiFetch('/admin/referral-settings', {
            method: 'PUT',
            body: JSON.stringify(data)
        })
};

// ============ REFERRALS ============
export const referralsAPI = {
    getMyStats: () => apiFetch('/referrals/my-stats'),

    getMyReferrals: (source) => apiFetch(`/referrals/my-referrals${source ? `?source=${source}` : ''}`),

    applyWallet: (amount) =>
        apiFetch('/referrals/apply-wallet', {
            method: 'POST',
            body: JSON.stringify({ amount })
        })
};
