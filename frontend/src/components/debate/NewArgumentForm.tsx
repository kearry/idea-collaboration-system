import React, { useState } from 'react';
import { socketService } from '../../services/socketService';

interface NewArgumentFormProps {
    currentUser: {
        id: string;
        username: string;
    } | null;
    debateId: string;
}

const NewArgumentForm: React.FC<NewArgumentFormProps> = ({ currentUser, debateId }) => {
    const [content, setContent] = useState('');
    const [type, setType] = useState<'pro' | 'con'>('pro');
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser) {
            // Prompt user to log in
            return;
        }

        if (content.trim()) {
            // Create argument object
            const argument = {
                content: content.trim(),
                type
            };

            // Send to server via socket
            socketService.sendArgument(debateId, argument);

            // Clear form and close it
            setContent('');
            setIsFormOpen(false);
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);

        // Notify typing if socket is connected
        if (socketService.isConnected()) {
            socketService.notifyTyping(debateId);
        }
    };

    if (!currentUser) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-4">Sign in to join the debate and add your argument.</p>
                <a
                    href="/login"
                    className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                >
                    Sign In
                </a>
            </div>
        );
    }

    return (
        <div id="new-argument-form" className="bg-white rounded-lg shadow-sm overflow-hidden">
            {!isFormOpen ? (
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="w-full py-4 flex items-center justify-center space-x-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Your Argument</span>
                </button>
            ) : (
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Add New Argument</h3>
                        <button
                            onClick={() => setIsFormOpen(false)}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Argument Type
                            </label>
                            <div className="flex space-x-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="argument-type"
                                        value="pro"
                                        checked={type === 'pro'}
                                        onChange={() => setType('pro')}
                                        className="h-4 w-4 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Supporting Argument</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="argument-type"
                                        value="con"
                                        checked={type === 'con'}
                                        onChange={() => setType('con')}
                                        className="h-4 w-4 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Opposing Argument</span>
                                </label>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="argument-content" className="block text-sm font-medium text-gray-700 mb-2">
                                Your Argument
                            </label>
                            <textarea
                                id="argument-content"
                                value={content}
                                onChange={handleContentChange}
                                placeholder="Make your case clearly and concisely..."
                                rows={4}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                required
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`px-4 py-2 rounded-md text-sm font-medium text-white ${type === 'pro'
                                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                        : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                    } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
                                disabled={content.trim() === ''}
                            >
                                Post Argument
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default NewArgumentForm;