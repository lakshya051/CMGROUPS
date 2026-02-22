import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import SharedLayout from './components/layout/SharedLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import { AuthProvider } from './context/AuthContext';
import { ShopProvider } from './context/ShopContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useDataSeeder } from './hooks/useDataSeeder';
import { Toaster } from 'react-hot-toast';
import CompareWidget from './components/shop/CompareWidget';

// ─── Spinner (shown while lazy chunks load) ───────────────────────────
const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-muted font-medium">Loading…</p>
        </div>
    </div>
);

// ─── Lazy page imports ─────────────────────────────────────────────────
// Public
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Services = lazy(() => import('./pages/Services'));
const TallyERP = lazy(() => import('./pages/TallyERP'));

// Shop
const Products = lazy(() => import('./pages/shop/Products'));
const ProductDetail = lazy(() => import('./pages/shop/ProductDetail'));
const Cart = lazy(() => import('./pages/shop/Cart'));
const Wishlist = lazy(() => import('./pages/shop/Wishlist'));
const Compare = lazy(() => import('./pages/shop/Compare'));
const Checkout = lazy(() => import('./pages/shop/Checkout'));

// Courses
const Courses = lazy(() => import('./pages/courses/Courses'));
const CourseDetail = lazy(() => import('./pages/courses/CourseDetail'));

// User Dashboard
const UserDashboard = lazy(() => import('./pages/dashboard/UserDashboard'));
const UserOrders = lazy(() => import('./pages/dashboard/UserOrders'));
const UserServices = lazy(() => import('./pages/dashboard/UserServices'));
const UserCourses = lazy(() => import('./pages/dashboard/UserCourses'));
const UserSettings = lazy(() => import('./pages/dashboard/UserSettings'));
const UserReferrals = lazy(() => import('./pages/dashboard/UserReferrals'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminServiceTypes = lazy(() => import('./pages/admin/AdminServiceTypes'));
const AdminReferrals = lazy(() => import('./pages/admin/AdminReferrals'));
const AdminReferralSettings = lazy(() => import('./pages/admin/AdminReferralSettings'));
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const AdminEnrollments = lazy(() => import('./pages/admin/AdminEnrollments'));
const AdminTallyEnquiries = lazy(() => import('./pages/admin/AdminTallyEnquiries'));

// ─── App ───────────────────────────────────────────────────────────────
function App() {
    useDataSeeder();

    return (
        <AuthProvider>
            <ShopProvider>
                <Toaster position="top-center" />
                <CompareWidget />
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<SharedLayout />}>
                            <Route index element={<Home />} />
                            <Route path="products" element={<Products />} />
                            <Route path="products/:id" element={<ProductDetail />} />
                            <Route path="cart" element={<Cart />} />
                            <Route path="wishlist" element={<Wishlist />} />
                            <Route path="compare" element={<Compare />} />
                            <Route path="checkout" element={
                                <ProtectedRoute><Checkout /></ProtectedRoute>
                            } />
                            <Route path="services" element={
                                <ProtectedRoute><Services /></ProtectedRoute>
                            } />
                            <Route path="courses" element={<Courses />} />
                            <Route path="courses/:id" element={<CourseDetail />} />
                            <Route path="tally-erp" element={<TallyERP />} />
                        </Route>

                        {/* User Dashboard */}
                        <Route path="/dashboard" element={
                            <ProtectedRoute><DashboardLayout role="customer" /></ProtectedRoute>
                        }>
                            <Route index element={<UserDashboard />} />
                            <Route path="orders" element={<UserOrders />} />
                            <Route path="services" element={<UserServices />} />
                            <Route path="courses" element={<UserCourses />} />
                            <Route path="settings" element={<UserSettings />} />
                            <Route path="referrals" element={<UserReferrals />} />
                        </Route>

                        {/* Admin Dashboard */}
                        <Route path="/admin" element={
                            <ProtectedRoute adminOnly={true}><DashboardLayout role="admin" /></ProtectedRoute>
                        }>
                            <Route index element={<AdminDashboard />} />
                            <Route path="products" element={<AdminProducts />} />
                            <Route path="orders" element={<AdminOrders />} />
                            <Route path="services" element={<AdminServices />} />
                            <Route path="coupons" element={<AdminCoupons />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="categories" element={<AdminCategories />} />
                            <Route path="service-types" element={<AdminServiceTypes />} />
                            <Route path="referrals" element={<AdminReferrals />} />
                            <Route path="referral-settings" element={<AdminReferralSettings />} />
                            <Route path="courses" element={<AdminCourses />} />
                            <Route path="enrollments" element={<AdminEnrollments />} />
                            <Route path="tally-enquiries" element={<AdminTallyEnquiries />} />
                        </Route>

                        {/* Auth */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/verify-email" element={<VerifyEmail />} />
                    </Routes>
                </Suspense>
            </ShopProvider>
        </AuthProvider>
    );
}

export default App;
