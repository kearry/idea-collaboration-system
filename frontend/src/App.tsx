import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { setUser, logout } from './store/slices/authSlice';
import authService from './services/authService';
import { socketService } from './services/socketService';

// Layouts
import MainLayout from './components/layouts/MainLayout';

// Pages
import HomePage from './pages/HomePage';
import DebatePage from './pages/DebatePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CreateDebatePage from './pages/CreateDebatePage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import DebugAuthCallback from './pages/DebugAuthCallback';

// Components
import LoadingSpinner from './components/common/LoadingSpinner';
import PrivateRoute from './components/common/PrivateRoute';

// Toast notifications
import { Toaster } from 'react-hot-toast';

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

                    // Connect to socket with user's token
                    socketService.connect();
                } else {
                    dispatch(logout());
                }
            } catch (error) {
                dispatch(logout());
            }
        };

        initializeAuth();

        // Clean up socket connection on unmount
        return () => {
            socketService.disconnect();
        };
    }, [dispatch]);

    // Show loading spinner while checking authentication
    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <Router>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#fff',
                        color: '#363636',
                        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                        padding: '16px'
                    },
                    success: {
                        iconTheme: {
                            primary: '#10B981',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#EF4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />

            <Routes>
                {/* Public routes */}
                <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
                <Route path="/login" element={
                    user ? <Navigate to="/" replace /> : <LoginPage />
                } />
                <Route path="/register" element={
                    user ? <Navigate to="/" replace /> : <RegisterPage />
                } />

                {/* OAuth callback with DEBUG */}
                <Route path="/auth/callback" element={<DebugAuthCallback />} />

                {/* Protected routes */}
                <Route path="/debates/create" element={
                    <PrivateRoute>
                        <MainLayout><CreateDebatePage /></MainLayout>
                    </PrivateRoute>
                } />
                <Route path="/profile" element={
                    <PrivateRoute>
                        <MainLayout><ProfilePage /></MainLayout>
                    </PrivateRoute>
                } />

                {/* Partially protected routes */}
                <Route path="/debates/:id" element={
                    <MainLayout><DebatePage /></MainLayout>
                } />

                {/* Catch-all route */}
                <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />
            </Routes>
        </Router>
    );
};

export default App;