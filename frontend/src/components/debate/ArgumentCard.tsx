import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addReply, voteOnArgument, Argument } from '../../store/slices/debateSlice';
import { socketService } from '../../services/socketService';
import ReplyForm from './ReplyForm';

interface ArgumentCardProps {
    argument: Argument;
    currentUser: {
        id: string;
        username: string;
    } | null;
    debateId: string;
    isReply?: boolean;
}

const ArgumentCard: React.FC<ArgumentCardProps> = ({
    argument,
    currentUser,
    debateId,
    isReply = false
}) => {
    const dispatch = useDispatch();
    const [isReplying, setIsReplying] = useState(false);
    const [showReplies, setShowReplies] = useState(true);

    const handleVote = (value: 1 | -1) => {
        if (!currentUser) {
            // Prompt user to log in
            return;
        }

        // Dispatch vote action to update UI optimistically
        dispatch(voteOnArgument({ argumentId: argument.id, value }));

        // Send vote to server via socket
        socketService.voteOnArgument(debateId, argument.id, value);
    };

    const handleReplySubmit = (content: string, type: 'pro' | 'con') => {
        if (!currentUser) return;

        // Create reply object
        const reply = {
            parentId: argument.id,
            content,
            type
        };

        // Send to server via socket
        socketService.sendArgument(debateId, reply);

        // Close reply form
        setIsReplying(false);
    };

    // Format date
    const formatDate = (dateString: Date) => {
        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${isReply ? 'border-l-2 border-gray-200 ml-8 mt-4' : 'mb-4'}`}>
            <div className={`px-4 py-2 text-white font-medium ${argument.type === 'pro' ? 'bg-green-600' : 'bg-red-600'}`}>
                {argument.type === 'pro' ? 'Supporting Argument' : 'Opposing Argument'}
            </div>

            <div className="p-4">
                <div className="flex items-start">
                    <div className="bg-gray-100 rounded-full p-2 mr-4 flex-shrink-0">
                        {argument.author.profileImage ? (
                            <img
                                src={argument.author.profileImage}
                                alt={argument.author.username}
                                className="h-6 w-6 rounded-full"
                            />
                        ) : (
                            <div className="h-6 w-6 rounded-full flex items-center justify-center text-gray-500 font-medium">
                                {argument.author.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-900">{argument.author.username}</span>
                            <div className="flex items-center">
                                <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs text-gray-500">
                                    {formatDate(argument.createdAt)}
                                </span>
                            </div>
                        </div>

                        <p className="mt-1 text-gray-800">{argument.content}</p>

                        <div className="mt-3 flex items-center">
                            <button
                                className="flex items-center text-gray-500 hover:text-indigo-600"
                                onClick={() => handleVote(1)}
                            >
                                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                <span>{argument.votes}</span>
                            </button>

                            {currentUser && !isReply && (
                                <button
                                    className="ml-4 text-gray-500 hover:text-indigo-600 text-sm"
                                    onClick={() => setIsReplying(!isReplying)}
                                >
                                    {isReplying ? 'Cancel' : 'Reply'}
                                </button>
                            )}

                            <button
                                className="ml-4 text-gray-500 hover:text-indigo-600 text-sm"
                            >
                                Share
                            </button>

                            {argument.replies && argument.replies.length > 0 && (
                                <button
                                    className="ml-auto text-indigo-600 text-sm flex items-center"
                                    onClick={() => setShowReplies(!showReplies)}
                                >
                                    {showReplies ? 'Hide Replies' : `Show Replies (${argument.replies.length})`}
                                    <svg
                                        className={`w-4 h-4 ml-1 transform transition-transform ${showReplies ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reply Form */}
                {isReplying && (
                    <div className="mt-4 pl-12">
                        <ReplyForm onSubmit={handleReplySubmit} onCancel={() => setIsReplying(false)} />
                    </div>
                )}

                {/* Replies */}
                {argument.replies && argument.replies.length > 0 && showReplies && (
                    <div className="mt-4">
                        {argument.replies.map(reply => (
                            <ArgumentCard
                                key={reply.id}
                                argument={reply}
                                currentUser={currentUser}
                                debateId={debateId}
                                isReply={true}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArgumentCard;