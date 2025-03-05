import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { api } from '../services/api';
import { logout } from '../store/slices/authSlice';

interface UserDebate {
    id: string;
    topic: string;
    status: 'active' | 'closed';
    createdAt: Date;
}

interface UserArgument {
    id: string;
    content: string;
    type: 'pro' | 'con';
    debate: {
        id: string;
        topic: string;
    };
    createdAt: Date;
}

const ProfilePage: React.FC = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const [debates, setDebates] = useState<UserDebate[]>([]);
    const [darguments, setArguments] = useState<UserArgument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('debates');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsLoading(true);
                const [debatesResponse, argumentsResponse] = await Promise.all([
                    api.get('/users/debates'),
                    api.get('/users/arguments')
                ]);

                setDebates(debatesResponse.data.debates);
                setArguments(argumentsResponse.data.arguments);
                setError(null);
            } catch (error: any) {
                setError(error.response?.data?.message || 'Failed to fetch user data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
                <h2 className="text-xl font-bold text-gray-900">User not found</h2>
                <p className="mt-2 text-gray-600">Please log in to view your profile</p>
                <Link
                    to="/login"
                    className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    Log in
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    <Link to="/" className="text-xl font-bold text-indigo-600">
                        Idea Collaboration System
                    </Link>
                    <Link
                        to="/debates/create"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                    >
                        Create Debate
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Profile Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-6">
                            <h1 className="text-2xl font-bold text-gray-800">{user.username}</h1>
                            <p className="text-gray-600 mt-1">{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => dispatch(logout())}
                        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                    >
                        Logout
                    </button>
                </div>

                {/* Tabs */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                className={`${activeTab === 'debates'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                onClick={() => setActiveTab('debates')}
                            >
                                My Debates
                            </button>
                            <button
                                className={`${activeTab === 'arguments'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                onClick={() => setActiveTab('arguments')}
                            >
                                My Arguments
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                        {error}
                    </div>
                ) : activeTab === 'debates' ? (
                    debates.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                            <p className="text-gray-600">You haven't created any debates yet.</p>
                            <Link
                                to="/debates/create"
                                className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                            >
                                Create Your First Debate
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {debates.map((debate) => (
                                <Link
                                    key={debate.id}
                                    to={`/debates/${debate.id}`}
                                    className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-gray-900">{debate.topic}</h3>
                                        <span
                                            className={`${debate.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                                } px-2 py-1 text-xs rounded-full`}
                                        >
                                            {debate.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Created on {new Date(debate.createdAt).toLocaleDateString()}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )
                ) : darguments.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                        <p className="text-gray-600">You haven't contributed any arguments yet.</p>
                        <Link
                            to="/"
                            className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                            >
                            Browse Debates
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {darguments.map((argument) => (
                            <Link
                                key={argument.id}
                                to={`/debates/${argument.debate.id}`}
                                className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">{argument.content}</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            In debate: {argument.debate.topic}
                                        </p>
                                    </div>
                                    <span
                                        className={`${argument.type === 'pro'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            } px-2 py-1 text-xs rounded-full`}
                                    >
                                        {argument.type === 'pro' ? 'Supporting' : 'Opposing'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    Posted on {new Date(argument.createdAt).toLocaleDateString()}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProfilePage;
