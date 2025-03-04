import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { api } from '../services/api';

interface DebateListItem {
    id: string;
    topic: string;
    description: string;
    creator: {
        username: string;
        profileImage?: string;
    };
    status: 'active' | 'closed';
    createdAt: Date;
}

const HomePage: React.FC = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const [debates, setDebates] = useState<DebateListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDebates = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/debates');
                setDebates(response.data.debates);
                setError(null);
            } catch (error: any) {
                setError(error.response?.data?.message || 'Failed to fetch debates');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDebates();
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-indigo-600">Idea Collaboration System</h1>
                    <div>
                        {user ? (
                            <div className="flex items-center space-x-4">
                                <Link to="/profile" className="text-gray-700 hover:text-indigo-600">
                                    {user.username}
                                </Link>
                                <Link
                                    to="/debates/create"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                                >
                                    Create Debate
                                </Link>
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

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Active Debates</h2>
                    {user && (
                        <Link
                            to="/debates/create"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                        >
                            New Debate
                        </Link>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                        {error}
                    </div>
                ) : debates.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                        <p className="text-gray-600">No debates found. Create the first one!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {debates.map((debate) => (
                            <Link
                                key={debate.id}
                                to={`/debates/${debate.id}`}
                                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{debate.topic}</h3>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{debate.description}</p>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <span>by {debate.creator.username}</span>
                                        </div>
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full ${debate.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {debate.status}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default HomePage;