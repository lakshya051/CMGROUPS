import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OnboardingGuard({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <div className="min-h-screen bg-page-bg" />;

    if (user && !user.phone) {
        return <Navigate to="/onboarding" replace />;
    }

    return children;
}
