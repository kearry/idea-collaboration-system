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
import DebugAuthCallback from './pages/DebugAuthCallback';

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

                {/* OAuth callback with DEBUG */}
                <Route path="/auth/callback" element={<DebugAuthCallback />} />

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

export default App;