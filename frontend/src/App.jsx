import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import SharedLayout from './components/layout/SharedLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import { AuthProvider } from './context/AuthProvider';
import { ShopProvider } from './context/ShopProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useDataSeeder } from './hooks/useDataSeeder';
import { Toaster } from 'react-hot-toast';
import CompareWidget from './components/shop/CompareWidget';

const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-muted font-medium">Loading…</p>
        </div>
    </div>
);

// Public
const Home = lazy(() => import('./pages/Home'));
const Services = lazy(() => import('./pages/Services'));
const TallyERP = lazy(() => import('./pages/TallyERP'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

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
const CoursePlayer = lazy(() => import('./pages/courses/CoursePlayer'));

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
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));

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
                            <Route path="courses/:id/player" element={
                                <ProtectedRoute><CoursePlayer /></ProtectedRoute>
                            } />
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
                            <Route path="banners" element={<AdminBanners />} />
                        </Route>

                        {/* Auth — Clerk managed */}
                        <Route path="/sign-in/*" element={
                            <div className="min-h-screen bg-page-bg flex items-center justify-center p-lg">
                                <SignIn routing="path" path="/sign-in" />
                            </div>
                        } />
                        <Route path="/sign-up/*" element={
                            <div className="min-h-screen bg-page-bg flex items-center justify-center p-lg">
                                <SignUp routing="path" path="/sign-up" />
                            </div>
                        } />
                        <Route path="/onboarding" element={<OnboardingPage />} />
                    </Routes>
                </Suspense>
            </ShopProvider>
        </AuthProvider>
    );
}

export default App;
