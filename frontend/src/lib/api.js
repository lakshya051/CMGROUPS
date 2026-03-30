const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let _tokenGetter = null;

export const setTokenGetter = (fn) => {
    _tokenGetter = fn;
};

const getAuthHeaders = async () => {
    const token = _tokenGetter ? await _tokenGetter() : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
};

export { getAuthHeaders };

const apiFetch = async (endpoint, options = {}, { timeout = 15000, retries = 3 } = {}) => {
    const callerSignal = options.signal;
    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        if (callerSignal) {
            callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: { ...headers, ...options.headers },
                signal: controller.signal,
            });
            clearTimeout(timer);

            const text = await response.text();
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                if (!response.ok) throw new Error('Something went wrong');
                return text;
            }

            if (!response.ok) {
                const err = new Error(data.error || 'Something went wrong');
                err.status = response.status;
                throw err;
            }

            return data;
        } catch (err) {
            clearTimeout(timer);

            if (callerSignal?.aborted) throw new Error('Request cancelled');

            if (err.name === 'AbortError') {
                lastError = new Error('Request timed out');
            } else {
                lastError = err;
            }

            const isRetryable = !err.status || err.status >= 500;
            if (!isRetryable) throw err;
            if (attempt < retries - 1) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    throw lastError;
};

// ============ AUTH ============
export const authAPI = {
    getMe: () => apiFetch('/auth/me'),

    register: (name) =>
        apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name })
        }),

    onboarding: (data) =>
        apiFetch('/auth/onboarding', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    updateProfile: (data) =>
        apiFetch('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
};

// ============ PRODUCTS ============
export const productsAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/products${query ? `?${query}` : ''}`);
    },

    getById: (id) => apiFetch(`/products/${id}`),

    getRelated: (id) => apiFetch(`/products/${id}/related`),

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

    updateVariant: (productId, variantId, variantData) =>
        apiFetch(`/products/${productId}/variants/${variantId}`, {
            method: 'PUT',
            body: JSON.stringify(variantData)
        }),

    deleteVariant: (productId, variantId) =>
        apiFetch(`/products/${productId}/variants/${variantId}`, { method: 'DELETE' }),

    bulkSaveVariants: (productId, variants) =>
        apiFetch(`/products/${productId}/variants/bulk`, {
            method: 'POST',
            body: JSON.stringify({ variants })
        }),

    generateVariants: (productId) =>
        apiFetch(`/products/${productId}/variants/generate`, { method: 'POST' }),

    toggleVariants: (productId, hasVariants) =>
        apiFetch(`/products/${productId}/toggle-variants`, {
            method: 'PATCH',
            body: JSON.stringify({ hasVariants })
        }),

    getOptions: (productId) =>
        apiFetch(`/products/${productId}/options`),

    addOption: (productId, optionData) =>
        apiFetch(`/products/${productId}/options`, {
            method: 'POST',
            body: JSON.stringify(optionData)
        }),

    updateOption: (productId, optionId, optionData) =>
        apiFetch(`/products/${productId}/options/${optionId}`, {
            method: 'PUT',
            body: JSON.stringify(optionData)
        }),

    deleteOption: (productId, optionId) =>
        apiFetch(`/products/${productId}/options/${optionId}`, { method: 'DELETE' })
};

// ============ ORDERS ============
export const ordersAPI = {
    place: (items, total, paymentMethod = 'pay_at_store', shippingAddress = null, referralCode = null, useWallet = false, walletUsed = 0, couponCode = null, discountAmount = 0, latitude = null, longitude = null, googleMapLink = null) =>
        apiFetch('/orders', {
            method: 'POST',
            body: JSON.stringify({ items, total, paymentMethod, shippingAddress, referralCode, useWallet, walletUsed, couponCode, discountAmount, latitude, longitude, googleMapLink })
        }),

    getById: (id) => apiFetch(`/orders/detail/${id}`),

    getMyOrders: (params = {}) => {
        const query = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
        ).toString();
        return apiFetch(`/orders/my-orders${query ? `?${query}` : ''}`);
    },

    getMyStats: () => apiFetch('/orders/my-stats'),

    getAll: (params = {}) => {
        const query = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
        ).toString();
        return apiFetch(`/orders${query ? `?${query}` : ''}`);
    },

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
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/orders/${id}/invoice`, {
            headers
        });

        if (!response.ok) {
            let msg = 'Failed to download invoice';
            try { const data = await response.json(); msg = data.error || msg; } catch { /* non-JSON error body */ }
            throw new Error(msg);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Shoptify_Invoice_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }
};

// ============ ADDRESSES ============
export const addressesAPI = {
    getAll: () => apiFetch('/addresses'),
    create: (data) => apiFetch('/addresses', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/addresses/${id}`, { method: 'DELETE' }),
};

// ============ CART ============
export const cartAPI = {
    get: () => apiFetch('/cart'),

    addItem: (productId, variantId = null, quantity = 1) =>
        apiFetch('/cart/items', {
            method: 'POST',
            body: JSON.stringify({ productId, variantId, quantity }),
        }),

    updateItem: (productId, variantId = null, quantity) =>
        apiFetch('/cart/items', {
            method: 'PATCH',
            body: JSON.stringify({ productId, variantId, quantity }),
        }),

    removeItem: (productId, variantId = null) =>
        apiFetch('/cart/items/remove', {
            method: 'POST',
            body: JSON.stringify({ productId, variantId }),
        }),

    sync: (items) => apiFetch('/cart/sync', {
        method: 'POST',
        body: JSON.stringify({ items }),
    }),

    clear: () => apiFetch('/cart', { method: 'DELETE' }),
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
    markAllRead: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    delete: (id) => apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
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

    getAll: (params = {}) => {
        const query = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
        ).toString();
        return apiFetch(`/services${query ? `?${query}` : ''}`);
    },

    updateStatus: (id, data) =>
        apiFetch(`/services/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    assignTechnician: (id, technicianId) =>
        apiFetch(`/services/${id}/assign`, {
            method: 'PATCH',
            body: JSON.stringify({ technicianId })
        }),

    verifyOtp: (id, otp) =>
        apiFetch(`/services/${id}/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({ otp })
        }),

    getBooking: (id) => apiFetch(`/services/${id}`),

    regenerateOtp: (id) =>
        apiFetch(`/services/${id}/regenerate-otp`, { method: 'POST' }),

    verifyDeliveryOtp: (id, otp) =>
        apiFetch(`/services/${id}/verify-delivery-otp`, {
            method: 'POST',
            body: JSON.stringify({ otp })
        }),

    regenerateDeliveryOtp: (id) =>
        apiFetch(`/services/${id}/regenerate-delivery-otp`, { method: 'POST' }),

    cancelBooking: (id, cancellationReason) =>
        apiFetch(`/services/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'Cancelled', cancellationReason })
        })
};

// ============ TECHNICIANS ============
export const techniciansAPI = {
    getAll: (all = false) => apiFetch(`/admin/technicians${all ? '?all=true' : ''}`),

    create: (data) =>
        apiFetch('/admin/technicians', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    update: (id, data) =>
        apiFetch(`/admin/technicians/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        })
};


// ============ COURSES ============
export const coursesAPI = {
    getAll: () => apiFetch('/courses'),
    getById: (id) => apiFetch(`/courses/${id}`),
    getCoursePlayer: (id) => apiFetch(`/courses/${id}/player`),

    apply: (data) => apiFetch('/courses/apply', { method: 'POST', body: JSON.stringify(data) }),
    getMyApplications: () => apiFetch('/courses/my-applications'),
    getMyEnrollments: () => apiFetch('/courses/my-enrollments'),

    create: (data) => apiFetch('/courses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/courses/${id}`, { method: 'DELETE' }),

    addDuration: (courseId, data) => apiFetch(`/courses/${courseId}/durations`, { method: 'POST', body: JSON.stringify(data) }),
    updateDuration: (id, data) => apiFetch(`/courses/durations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDuration: (id) => apiFetch(`/courses/durations/${id}`, { method: 'DELETE' }),

    addBatch: (durationId, data) => apiFetch(`/courses/durations/${durationId}/batches`, { method: 'POST', body: JSON.stringify(data) }),
    updateBatch: (id, data) => apiFetch(`/courses/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteBatch: (id) => apiFetch(`/courses/batches/${id}`, { method: 'DELETE' }),

    getAllApplications: () => apiFetch('/courses/applications/all'),
    updateStatus: (id, status) => apiFetch(`/courses/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    recordFeePayment: (id, data) => apiFetch(`/courses/applications/${id}/fee`, { method: 'POST', body: JSON.stringify(data) }),

    downloadCertificate: async (courseId) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/courses/${courseId}/certificate`, {
            headers
        });
        if (!response.ok) {
            let msg = 'Failed to download certificate';
            try { const data = await response.json(); msg = data.error || msg; } catch { /* non-JSON error body */ }
            throw new Error(msg);
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
    getBySlug: (slug) => apiFetch(`/categories/${slug}`),
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

    getUsers: (params = {}) => {
        const query = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
        ).toString();
        return apiFetch(`/admin/users${query ? `?${query}` : ''}`);
    },

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
        }),

    getAuditLogs: (params = {}) => {
        const query = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
        ).toString();
        return apiFetch(`/admin/audit-logs${query ? `?${query}` : ''}`);
    },
};

// ============ BANNERS ============
export const bannersAPI = {
    getPublic: () => apiFetch('/banners'),

    getAll: () => apiFetch('/admin/banners'),

    create: (data) =>
        apiFetch('/admin/banners', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id, data) =>
        apiFetch(`/admin/banners/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    toggle: (id) =>
        apiFetch(`/admin/banners/${id}/toggle`, { method: 'PATCH' }),

    reorder: (orderedIds) =>
        apiFetch('/admin/banners/reorder', {
            method: 'PATCH',
            body: JSON.stringify({ orderedIds }),
        }),

    delete: (id) =>
        apiFetch(`/admin/banners/${id}`, { method: 'DELETE' }),
};

// ============ UPLOAD ============
export const uploadAPI = {
    upload: (base64Image, folder = 'products') =>
        apiFetch('/upload', {
            method: 'POST',
            body: JSON.stringify({ image: base64Image, folder })
        }),

    uploadMultiple: (base64Images, folder = 'products') =>
        apiFetch('/upload/multiple', {
            method: 'POST',
            body: JSON.stringify({ images: base64Images, folder })
        }),

    deleteImage: (url) =>
        apiFetch('/upload', {
            method: 'DELETE',
            body: JSON.stringify({ url })
        }),
};

// ============ BUNDLES ============
export const bundlesAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
        ).toString();
        return apiFetch(`/bundles${query ? `?${query}` : ''}`);
    },
    getById: (id) => apiFetch(`/bundles/${id}`),
    getForProduct: (productId) => apiFetch(`/bundles/for-product/${productId}`),
    getAllAdmin: () => apiFetch('/bundles/admin'),
    create: (data) => apiFetch('/bundles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/bundles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/bundles/${id}`, { method: 'DELETE' }),
};

// ============ BUNDLE TEMPLATES ============
export const bundleTemplatesAPI = {
    getAll: () => apiFetch('/bundle-templates'),
    getById: (id) => apiFetch(`/bundle-templates/${id}`),
    getProducts: (id) => apiFetch(`/bundle-templates/${id}/products`),
    calculate: (id, productIds) => apiFetch(`/bundle-templates/${id}/calculate`, { method: 'POST', body: JSON.stringify({ productIds }) }),
    getAllAdmin: () => apiFetch('/bundle-templates/admin'),
    create: (data) => apiFetch('/bundle-templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/bundle-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/bundle-templates/${id}`, { method: 'DELETE' }),
};

// ============ QUANTITY TIERS ============
export const quantityTiersAPI = {
    get: (productId) => apiFetch(`/products/${productId}/quantity-tiers`),
    update: (productId, tiers) => apiFetch(`/products/${productId}/quantity-tiers`, { method: 'PUT', body: JSON.stringify({ tiers }) }),
};

// ============ REFERRALS ============
export const referralsAPI = {
    getMyStats: () => apiFetch('/referrals/my-stats'),

    getMyReferrals: (source) => apiFetch(`/referrals/my-referrals${source ? `?source=${source}` : ''}`),

    getMyReceivedReferrals: () => apiFetch('/referrals/my-received'),

    applyWallet: (amount) =>
        apiFetch('/referrals/apply-wallet', {
            method: 'POST',
            body: JSON.stringify({ amount })
        })
};
