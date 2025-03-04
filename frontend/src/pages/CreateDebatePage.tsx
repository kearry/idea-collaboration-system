import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { createDebate } from '../store/slices/debateSlice';

const CreateDebatePage: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state: RootState) => state.debate);
    const { user } = useSelector((state: RootState) => state.auth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        // Form validation
        if (!topic || !description) {
            setFormError('All fields are required');
            return;
        }

        if (topic.length < 5) {
            setFormError('Topic must be at least 5 characters');
            return;
        }

        if (description.length < 10) {
            setFormError('Description must be at least 10 characters');
            return;
        }

        const result = await dispatch(createDebate({ topic, description }));
        if (createDebate.fulfilled.match(result)) {
            // Navigate to the newly created debate
            navigate(`/debates/${result.payload.id}`);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    <Link to="/" className="text-xl font-bold text-indigo-600">
                        Idea Collaboration System
                    </Link>
                    {user && (
                        <div className="flex items-center space-x-4">
                            <Link to="/profile" className="text-gray-700 hover:text-indigo-600">
                                {user.username}
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Debate</h1>

                    <form onSubmit={handleSubmit}>
                        {(error || formError) && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                                {formError || error}
                            </div>
                        )}

                        <div className="mb-6">
                            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                                Topic
                            </label>
                            <input
                                id="topic"
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Enter the debate topic"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Make it clear and specific (5-200 characters)
                            </p>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Provide context for the debate"
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Give enough background for participants to engage meaningfully (10-2000 characters)
                            </p>
                        </div>

                        <div className="flex items-center justify-end space-x-4">
                            <Link
                                to="/"
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Creating...' : 'Create Debate'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateDebatePage;