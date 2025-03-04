import React, { useState } from 'react';
import { socketService } from '../../services/socketService';

interface ReplyFormProps {
    onSubmit: (content: string, type: 'pro' | 'con') => void;
    onCancel?: () => void;
}

const ReplyForm: React.FC<ReplyFormProps> = ({ onSubmit, onCancel }) => {
    const [content, setContent] = useState('');
    const [type, setType] = useState<'pro' | 'con'>('pro');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (content.trim()) {
            onSubmit(content.trim(), type);
            setContent('');
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);

        // Notify typing if socket is connected
        if (socketService.isConnected()) {
            // We'll use the debate ID from the URL
            const debateId = window.location.pathname.split('/').pop() || '';
            socketService.notifyTyping(debateId);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reply Type
                </label>
                <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="reply-type"
                            value="pro"
                            checked={type === 'pro'}
                            onChange={() => setType('pro')}
                            className="h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Supporting</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input
                            type="radio"
                            name="reply-type"
                            value="con"
                            checked={type === 'con'}
                            onChange={() => setType('con')}
                            className="h-4 w-4 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Opposing</span>
                    </label>
                </div>
            </div>

            <div className="mb-3">
                <label htmlFor="reply-content" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Reply
                </label>
                <textarea
                    id="reply-content"
                    value={content}
                    onChange={handleContentChange}
                    placeholder="Enter your argument..."
                    rows={3}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>

            <div className="flex justify-end">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={content.trim() === ''}
                    className={`px-4 py-2 rounded-md text-sm font-medium text-white 
            ${type === 'pro'
                            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                            : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'} 
            focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    Post Reply
                </button>
            </div>
        </form>
    );
};

export default ReplyForm;