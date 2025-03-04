import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
    fetchDebate,
    toggleViewMode,
    addArgument,
    voteOnArgument,
    clearDebate
} from '../store/slices/debateSlice';
import { socketService } from '../services/socketService';
import ArgumentsList from '../components/debate/ArgumentList';
import VisualDebateMap from '../components/debate/VisualDebateMap';
import NewArgumentForm from '../components/debate/NewArgumentForm';
import CollaborationIndicators from '../components/debate/CollaborationIndicators';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DebatePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useDispatch<AppDispatch>();

    const { currentDebate, darguments, onlineUsers, typingUsers, isLoading, error } = useSelector(
        (state: RootState) => state.debate
    );
    const { user } = useSelector((state: RootState) => state.auth);

    // Fetch debate data
    useEffect(() => {
        if (id) {
            dispatch(fetchDebate(id));
        }

        // Cleanup on unmount
        return () => {
            dispatch(clearDebate());
        };
    }, [id, dispatch]);

    // Connect to socket
    useEffect(() => {
        if (id && user) {
            // If this component hasn't been fully implemented, handle gracefully
            if (typeof socketService.connect === 'function') {
                socketService.connect(user.id);
                socketService.joinDebate(id);
            }

            // Cleanup when unmounting
            return () => {
                if (typeof socketService.leaveDebate === 'function' &&
                    typeof socketService.disconnect === 'function') {
                    socketService.leaveDebate(id);
                    socketService.disconnect();
                }
            };
        }
    }, [id, user]);

    // Loading state
    if (isLoading) {
        return <LoadingSpinner />;
    }

    // Error state
    if (error) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <h2 className="text-lg font-medium text-red-800 mb-2">
                        Error Loading Debate
                    </h2>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    // No debate found
    if (!currentDebate) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <h2 className="text-lg font-medium text-yellow-800 mb-2">
                        Debate Not Found
                    </h2>
                    <p className="text-yellow-600">
                        The debate you're looking for doesn't exist or has been removed.
                    </p>
                </div>
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
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-2">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{user.username}</span>
                            </div>
                        ) : (
                            <Link to="/login" className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-md text-sm">
                                Sign In
                            </Link>
                        )}
                        <div className="flex items-center bg-gray-100 p-1 rounded-md">
                            <button
                                className={`px-3 py-1 rounded-md text-sm transition ${currentDebate.viewMode === 'text' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}
                                onClick={() => dispatch(toggleViewMode('text'))}
                            >
                                Text View
                            </button>
                            <button
                                className={`px-3 py-1 rounded-md text-sm transition ${currentDebate.viewMode === 'visual' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}
                                onClick={() => dispatch(toggleViewMode('visual'))}
                            >
                                Visual View
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                {/* Topic and summary */}
                <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentDebate.topic}</h2>
                    <p className="text-gray-600 mb-4">{currentDebate.description}</p>
                    <div className="flex items-center space-x-6 mt-4">
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold mr-2">
                                {darguments.filter(arg => arg.type === 'pro').length}
                            </div>
                            <span className="text-sm text-gray-600">Supporting<br />Arguments</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold mr-2">
                                {darguments.filter(arg => arg.type === 'con').length}
                            </div>
                            <span className="text-sm text-gray-600">Opposing<br />Arguments</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-2">
                                {darguments.reduce((total, arg) => total + (arg.replies?.length || 0), 0)}
                            </div>
                            <span className="text-sm text-gray-600">Replies</span>
                        </div>
                    </div>
                </div>

                {/* Discussion Area */}
                {currentDebate.viewMode === 'text' ? (
                    <div className="space-y-4">
                        <div className="flex space-x-4 mb-4">
                            <button className="flex-1 py-2 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                                All Arguments
                            </button>
                            <button className="flex-1 py-2 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Supporting
                            </button>
                            <button className="flex-1 py-2 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Opposing
                            </button>
                        </div>

                        {darguments.map(argument => (
                            <div key={argument.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                                <div className={`px-4 py-2 text-white font-medium ${argument.type === 'pro' ? 'bg-green-600' : 'bg-red-600'}`}>
                                    {argument.type === 'pro' ? 'Supporting Argument' : 'Opposing Argument'}
                                </div>
                                <div className="p-4">
                                    <div className="flex items-start">
                                        <div className="bg-gray-100 rounded-full p-2 mr-4">
                                            <div className="w-6 h-6 text-gray-500 flex items-center justify-center font-medium">
                                                {argument.author.username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-900">{argument.author.username}</span>
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(argument.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-gray-800">{argument.content}</p>
                                            <div className="mt-3 flex items-center">
                                                <button
                                                    className="flex items-center text-gray-500 hover:text-indigo-600"
                                                    onClick={() => {
                                                        if (user && typeof socketService.voteOnArgument === 'function') {
                                                            socketService.voteOnArgument(id!, argument.id, 1);
                                                        }
                                                    }}
                                                >
                                                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                    <span>{argument.votes}</span>
                                                </button>
                                                <button
                                                    className="ml-4 text-gray-500 hover:text-indigo-600 text-sm"
                                                    onClick={() => {
                                                        // Reply functionality would go here
                                                    }}
                                                >
                                                    Reply
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Render replies if they exist */}
                                    {argument.replies && argument.replies.length > 0 && (
                                        <div className="mt-4 pl-12">
                                            {argument.replies.map(reply => (
                                                <div key={reply.id} className="border-l-2 border-gray-200 pl-4 mt-4">
                                                    <div className="flex items-start">
                                                        <div className="bg-gray-100 rounded-full p-1 mr-3">
                                                            <div className="w-5 h-5 text-gray-500 flex items-center justify-center font-medium">
                                                                {reply.author.username.charAt(0).toUpperCase()}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between">
                                                                <span className="font-medium text-gray-900">{reply.author.username}</span>
                                                                <div className="flex items-center">
                                                                    <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    <span className="text-xs text-gray-500">
                                                                        {new Date(reply.createdAt).toLocaleTimeString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="inline-block px-2 py-1 rounded-md text-xs font-medium mb-1"
                                                                style={{
                                                                    backgroundColor: reply.type === 'pro' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                    color: reply.type === 'pro' ? 'rgb(6, 95, 70)' : 'rgb(153, 27, 27)'
                                                                }}>
                                                                {reply.type === 'pro' ? 'Supporting' : 'Opposing'}
                                                            </div>
                                                            <p className="text-gray-800">{reply.content}</p>
                                                            <div className="mt-2 flex items-center">
                                                                <button
                                                                    className="flex items-center text-gray-500 hover:text-indigo-600"
                                                                    onClick={() => {
                                                                        if (user && typeof socketService.voteOnArgument === 'function') {
                                                                            socketService.voteOnArgument(id!, reply.id, 1);
                                                                        }
                                                                    }}
                                                                >
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                                    </svg>
                                                                    <span>{reply.votes}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Visual Mode */
                    <div className="bg-white p-6 rounded-lg shadow-sm" style={{ minHeight: '500px' }}>
                        <svg width="100%" height="450" className="border border-gray-200 rounded-lg">
                            {/* This would be replaced by the D3.js implementation */}
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-gray-500">
                                Visual debate map would render here using D3.js
                            </text>
                        </svg>
                        <div className="text-center text-sm text-gray-500 mt-2">
                            <p>Visual mode is not fully implemented in this demo</p>
                        </div>
                    </div>
                )}

                {/* Add argument button/form */}
                {user && (
                    <div className="mt-6">
                        <button
                            onClick={() => {
                                // Open new argument form
                            }}
                            className="w-full py-4 flex items-center justify-center space-x-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors rounded-md"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Add Your Argument</span>
                        </button>
                    </div>
                )}
            </main>

            {/* Online Users and Typing Indicators */}
            <div className="fixed bottom-4 right-4 z-10">
                {/* Online users */}
                {onlineUsers.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md p-3 mb-3">
                        <div className="flex items-center text-xs font-semibold text-gray-500 uppercase mb-2">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>Online ({onlineUsers.length})</span>
                        </div>
                        <div className="flex -space-x-2 overflow-hidden">
                            {onlineUsers.map(user => (
                                <div
                                    key={user.userId}
                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-xs font-medium"
                                    title={user.username}
                                >
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="bg-indigo-100 rounded-lg shadow-md p-3 animate-pulse">
                        <div className="flex items-center">
                            <div className="flex space-x-1 mr-2">
                                <div className="bg-indigo-500 rounded-full h-2 w-2"></div>
                                <div className="bg-indigo-500 rounded-full h-2 w-2"></div>
                                <div className="bg-indigo-500 rounded-full h-2 w-2"></div>
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
        </div>
    );
};

export default DebatePage;