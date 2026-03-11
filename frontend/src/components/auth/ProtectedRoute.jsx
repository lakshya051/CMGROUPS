import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { isSignedIn, user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="min-h-screen bg-page-bg" />;

    if (!isSignedIn) {
        return <Navigate to="/sign-in" state={{ from: location }} replace />;
    }

    if (adminOnly && user?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
