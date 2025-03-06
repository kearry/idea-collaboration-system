import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import NotificationCenter from '../notifications/NotificationCenter';
import ConnectionStatus from '../common/ConnectionStatus';

const Header: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                <Link to="/" className="text-xl font-bold text-indigo-600">
                    Idea Collaboration System
                </Link>

                <div className="flex items-center space-x-4">
                    {/* Connection Status Indicator */}
                    <ConnectionStatus />

                    {user ? (
                        <div className="flex items-center space-x-4">
                            {/* Notification Center */}
                            <NotificationCenter />

                            {/* User Dropdown */}
                            <div className="relative group">
                                <button className="flex items-center space-x-2 focus:outline-none">
                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 hidden md:inline-block">{user.username}</span>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                                    <Link
                                        to="/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Your Profile
                                    </Link>
                                    <Link
                                        to="/debates/create"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Create Debate
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-x-4">
                            <Link
                                to="/login"
                                className="px-3 py-2 text-indigo-600 hover:text-indigo-800"
                            >
                                Log in
                            </Link>
                            <Link
                                to="/register"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                            >
                                Sign up
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;