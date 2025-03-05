// App.tsx
import React, { useEffect } from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { setUser, logout } from './store/slices/authSlice';
import authService from './services/authService';

// Pages
import HomePage from './pages/HomePage';
import DebatePage from './pages/DebatePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CreateDebatePage from './pages/CreateDebatePage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import LoadingSpinner from './components/common/LoadingSpinner';
import PrivateRoute from './components/common/PrivateRoute';

const App: React.FC = () => {
    const dispatch = useDispatch();
    const { user, isLoading } = useSelector((state: RootState) => state.auth);

    // Check for authenticated user on app load
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                if (currentUser) {
                    dispatch(setUser(currentUser));
                } else {
                    dispatch(logout());
                }
            } catch (error) {
                dispatch(logout());
            }
        };

        initializeAuth();
    }, [dispatch]);

    // Show loading spinner while checking authentication
    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <Router>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={
                    user ? <Navigate to="/" replace /> : <LoginPage />
                } />
                <Route path="/register" element={
                    user ? <Navigate to="/" replace /> : <RegisterPage />
                } />

                {/* OAuth callback */}
                <Route path="/auth/callback" element={<OAuthCallback />} />

                {/* Protected routes */}
                <Route path="/debates/create" element={
                    <PrivateRoute>
                        <CreateDebatePage />
                    </PrivateRoute>
                } />
                <Route path="/profile" element={
                    <PrivateRoute>
                        <ProfilePage />
                    </PrivateRoute>
                } />

                {/* Partially protected routes */}
                <Route path="/debates/:id" element={<DebatePage />} />

                {/* Catch-all route */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Router>
    );
};

// OAuth callback handler component
const OAuthCallback: React.FC = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleOAuth = async () => {
            // Get URL parameters
            const params = new URLSearchParams(location.search);
            const token = params.get('token');
            const state = params.get('state');
            const errorMsg = params.get('error');

            // Check for error from OAuth provider
            if (errorMsg) {
                setError(`Authentication error: ${errorMsg}`);
                return;
            }

            // Check if token exists
            if (!token) {
                setError('No authentication token received');
                return;
            }

            // Validate state parameter to prevent CSRF attacks
            if (state && !authService.validateOAuthState(state)) {
                setError('Invalid state parameter, authentication failed');
                return;
            }

            try {
                // Process the OAuth login
                const user = await authService.handleOAuthRedirect(token);
                dispatch(setUser(user));

                // Redirect to homepage or a specified redirect URL
                const redirectUrl = params.get('redirect') || '/';
                window.location.href = redirectUrl;
            } catch (error) {
                console.error('OAuth callback error:', error);
                setError('Failed to authenticate with the provided token');
            }
        };

        handleOAuth();
    }, [dispatch, location]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h2>
                    <p className="text-gray-700">{error}</p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="mt-6 w-full bg-indigo-600 py-2 px-4 text-white rounded-md hover:bg-indigo-700"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return <LoadingSpinner />;
};

export default App;