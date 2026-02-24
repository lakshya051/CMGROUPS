import * as Yup from 'yup';

// ─── Reusable field schemas ───────────────────────────────────────────────────

export const nameSchema = Yup.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name is too long')
    .required('Name is required');

export const emailSchema = Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required');

export const phoneSchema = Yup.string()
    .matches(/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number')
    .required('Phone number is required');

export const optionalPhoneSchema = Yup.string()
    .matches(/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number')
    .optional()
    .nullable();

export const passwordSchema = Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required');

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = Yup.object({
    identifier: emailSchema,
    password: passwordSchema,
});

export const loginPhoneSchema = Yup.object({
    identifier: Yup.string()
        .matches(/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number')
        .required('Phone number is required'),
    password: passwordSchema,
});

export const signupSchema = Yup.object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords do not match')
        .required('Please confirm your password'),
    referralCode: Yup.string().optional().nullable(),
});

// ─── Profile / Settings ───────────────────────────────────────────────────────

export const profileUpdateSchema = Yup.object({
    name: nameSchema,
    phone: optionalPhoneSchema,
    currentPassword: Yup.string().when('newPassword', {
        is: (val) => val && val.length > 0,
        then: (schema) => schema.required('Current password is required to change password'),
        otherwise: (schema) => schema.optional(),
    }),
    newPassword: Yup.string()
        .min(6, 'New password must be at least 6 characters')
        .optional(),
});

// ─── Checkout ─────────────────────────────────────────────────────────────────

export const checkoutSchema = Yup.object({
    fullName: nameSchema,
    email: emailSchema,
    phone: optionalPhoneSchema,
    addressLine: Yup.string().required('Address is required'),
    city: Yup.string().required('City is required'),
    state: Yup.string().optional(),
    postalCode: Yup.string()
        .matches(/^[0-9]{6}$/, 'Enter a valid 6-digit pincode')
        .required('Pincode is required'),
});

// ─── Service Booking ──────────────────────────────────────────────────────────

export const serviceBookingSchema = Yup.object({
    customerName: nameSchema,
    customerPhone: phoneSchema,
    address: Yup.string().required('Pickup address is required'),
    city: Yup.string().required('City is required'),
    pincode: Yup.string()
        .matches(/^[0-9]{6}$/, 'Enter a valid 6-digit pincode')
        .required('Pincode is required'),
    date: Yup.string().required('Preferred date is required'),
    timeSlot: Yup.string().required('Preferred time slot is required'),
    description: Yup.string().optional(),
    deviceType: Yup.string().optional(),
    deviceBrand: Yup.string().optional(),
    landmark: Yup.string().optional(),
});

// ─── Admin — Products ─────────────────────────────────────────────────────────

export const addProductSchema = Yup.object({
    title: Yup.string().required('Product title is required'),
    price: Yup.number()
        .typeError('Price must be a number')
        .positive('Price must be greater than 0')
        .required('Price is required'),
    stock: Yup.number()
        .typeError('Stock must be a number')
        .integer('Stock must be a whole number')
        .min(0, 'Stock cannot be negative')
        .required('Stock is required'),
    category: Yup.string().required('Category is required'),
    image: Yup.string().url('Please enter a valid image URL').required('Image URL is required'),
    brand: Yup.string().optional(),
    description: Yup.string().optional(),
    condition: Yup.string().required('Condition is required'),
    referrerPoints: Yup.number().typeError('Must be a number').min(0, 'Cannot be negative').optional().nullable(),
    refereePoints: Yup.number().typeError('Must be a number').min(0, 'Cannot be negative').optional().nullable(),
    sku: Yup.string().optional().nullable(),
});

// ─── Admin — Courses ──────────────────────────────────────────────────────────

export const addCourseSchema = Yup.object({
    title: Yup.string().required('Course title is required'),
    description: Yup.string().required('Description is required'),
    instructor: Yup.string().required('Instructor name is required'),
    category: Yup.string().optional(),
    thumbnail: Yup.string().url('Please enter a valid thumbnail URL').optional().nullable(),
    referrerPoints: Yup.number().typeError('Must be a number').min(0, 'Cannot be negative').optional().nullable(),
    refereePoints: Yup.number().typeError('Must be a number').min(0, 'Cannot be negative').optional().nullable(),
});

// ─── Admin — Categories ───────────────────────────────────────────────────────

export const addCategorySchema = Yup.object({
    name: Yup.string().required('Category name is required'),
    image: Yup.string().url('Please enter a valid image URL').optional().nullable(),
    description: Yup.string().optional(),
});

// ─── Admin — Coupons ─────────────────────────────────────────────────────────

export const addCouponSchema = Yup.object({
    code: Yup.string()
        .uppercase()
        .min(3, 'Coupon code must be at least 3 characters')
        .required('Coupon code is required'),
    discountType: Yup.string()
        .oneOf(['percentage', 'fixed'], 'Invalid discount type')
        .required('Discount type is required'),
    discountValue: Yup.number()
        .typeError('Discount value must be a number')
        .positive('Discount value must be greater than 0')
        .required('Discount value is required'),
    minOrderAmount: Yup.number()
        .typeError('Minimum order amount must be a number')
        .min(0, 'Cannot be negative')
        .optional(),
    maxUses: Yup.number()
        .typeError('Must be a number')
        .integer()
        .positive()
        .optional()
        .nullable(),
});
