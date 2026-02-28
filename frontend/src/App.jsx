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

// After a new deployment, old cached JS may reference chunk filenames that
// no longer exist. This wrapper retries by reloading the page once.
const lazyRetry = (importFn) =>
    lazy(() =>
        importFn().catch(() => {
            const key = 'chunk_reload';
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                window.location.reload();
                return new Promise(() => {});
            }
            sessionStorage.removeItem(key);
            return importFn();
        })
    );

const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-muted font-medium">Loading…</p>
        </div>
    </div>
);

// Public
const Home = lazyRetry(() => import('./pages/Home'));
const Services = lazyRetry(() => import('./pages/Services'));
const TallyERP = lazyRetry(() => import('./pages/TallyERP'));
const OnboardingPage = lazyRetry(() => import('./pages/OnboardingPage'));

// Shop
const Products = lazyRetry(() => import('./pages/shop/Products'));
const ProductDetail = lazyRetry(() => import('./pages/shop/ProductDetail'));
const Cart = lazyRetry(() => import('./pages/shop/Cart'));
const Wishlist = lazyRetry(() => import('./pages/shop/Wishlist'));
const Compare = lazyRetry(() => import('./pages/shop/Compare'));
const Checkout = lazyRetry(() => import('./pages/shop/Checkout'));

// Courses
const Courses = lazyRetry(() => import('./pages/courses/Courses'));
const CourseDetail = lazyRetry(() => import('./pages/courses/CourseDetail'));
const CoursePlayer = lazyRetry(() => import('./pages/courses/CoursePlayer'));

// User Dashboard
const UserDashboard = lazyRetry(() => import('./pages/dashboard/UserDashboard'));
const UserOrders = lazyRetry(() => import('./pages/dashboard/UserOrders'));
const UserServices = lazyRetry(() => import('./pages/dashboard/UserServices'));
const UserCourses = lazyRetry(() => import('./pages/dashboard/UserCourses'));
const UserSettings = lazyRetry(() => import('./pages/dashboard/UserSettings'));
const UserReferrals = lazyRetry(() => import('./pages/dashboard/UserReferrals'));

// Admin
const AdminDashboard = lazyRetry(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazyRetry(() => import('./pages/admin/AdminProducts'));
const AdminOrders = lazyRetry(() => import('./pages/admin/AdminOrders'));
const AdminServices = lazyRetry(() => import('./pages/admin/AdminServices'));
const AdminCoupons = lazyRetry(() => import('./pages/admin/AdminCoupons'));
const AdminUsers = lazyRetry(() => import('./pages/admin/AdminUsers'));
const AdminCategories = lazyRetry(() => import('./pages/admin/AdminCategories'));
const AdminServiceTypes = lazyRetry(() => import('./pages/admin/AdminServiceTypes'));
const AdminReferrals = lazyRetry(() => import('./pages/admin/AdminReferrals'));
const AdminReferralSettings = lazyRetry(() => import('./pages/admin/AdminReferralSettings'));
const AdminCourses = lazyRetry(() => import('./pages/admin/AdminCourses'));
const AdminEnrollments = lazyRetry(() => import('./pages/admin/AdminEnrollments'));
const AdminTallyEnquiries = lazyRetry(() => import('./pages/admin/AdminTallyEnquiries'));
const AdminBanners = lazyRetry(() => import('./pages/admin/AdminBanners'));

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
                                <SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/" />
                            </div>
                        } />
                        <Route path="/sign-up/*" element={
                            <div className="min-h-screen bg-page-bg flex items-center justify-center p-lg">
                                <SignUp routing="path" path="/sign-up" fallbackRedirectUrl="/onboarding" />
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
