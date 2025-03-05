import React from 'react';

interface OnlineUser {
    userId: string;
    username: string;
}

interface TypingUser {
    userId: string;
    username: string;
}

interface CollaborationIndicatorsProps {
    onlineUsers: OnlineUser[];
    typingUsers: TypingUser[];
}

const CollaborationIndicators: React.FC<CollaborationIndicatorsProps> = ({
    onlineUsers,
    typingUsers
}) => {
    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Online Users */}
            {onlineUsers.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-3 mb-3">
                    <div className="flex items-center text-xs font-semibold text-gray-500 uppercase mb-2">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>Online ({onlineUsers.length})</span>
                    </div>
                    <div className="flex -space-x-2 overflow-hidden">
                        {onlineUsers.slice(0, 5).map(user => (
                            <div
                                key={user.userId}
                                className="h-8 w-8 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600"
                                title={user.username}
                            >
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {onlineUsers.length > 5 && (
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 ring-2 ring-white text-xs font-medium text-gray-500">
                                +{onlineUsers.length - 5}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
                <div className="bg-indigo-100 rounded-lg shadow-md p-3">
                    <div className="flex items-center">
                        <div className="flex space-x-1 mr-2">
                            <div className="bg-indigo-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="bg-indigo-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            <div className="bg-indigo-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '600ms' }}></div>
                        </div>
                        <span className="text-sm text-indigo-800">
                            {typingUsers.length === 1
                                ? `${typingUsers[0].username} is typing...`
                                : `${typingUsers.length} people are typing...`
                            }
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CollaborationIndicators;
