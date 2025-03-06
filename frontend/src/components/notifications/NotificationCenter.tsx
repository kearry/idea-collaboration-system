import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { markAsRead, markAllAsRead, removeNotification } from '../../store/slices/notificationSlice';
import { socketService } from '../../services/socketService';
import { Link } from 'react-router-dom';

const NotificationCenter: React.FC = () => {
    const dispatch = useDispatch();
    const { notifications, unreadCount } = useSelector((state: RootState) => state.notification);
    const [isOpen, setIsOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Handle clicking outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle new notification sound and browser notification
    useEffect(() => {
        // Play sound when new notification arrives
        if (notifications.length > 0 && !notifications[0].read) {
            try {
                const audio = new Audio('/notification-sound.mp3');
                audio.volume = 0.5;
                audio.play().catch(error => console.log('Sound play prevented by browser policy', error));
            } catch (error) {
                console.error('Error playing notification sound', error);
            }

            // Check if browser notifications are permitted
            if (Notification && Notification.permission === 'granted') {
                try {
                    const notification = new Notification('Idea Collaboration System', {
                        body: notifications[0].message,
                        icon: '/favicon.ico'
                    });

                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } catch (error) {
                    console.error('Error creating browser notification', error);
                }
            }
        }
    }, [notifications]);

    // Request browser notification permission
    useEffect(() => {
        if (Notification && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Mark notification as read
    const handleMarkAsRead = (id: string) => {
        dispatch(markAsRead(id));
        socketService.markNotificationRead(id);
    };

    // Mark all notifications as read
    const handleMarkAllAsRead = () => {
        dispatch(markAllAsRead());
        // Notify server about all read notifications
        notifications.forEach(notification => {
            if (!notification.read) {
                socketService.markNotificationRead(notification.id);
            }
        });
    };

    // Remove notification
    const handleRemove = (id: string) => {
        dispatch(removeNotification(id));
    };

    // Get notification icon based on type
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return (
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
            case 'error':
                return (
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
            case 'warning':
                return (
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
        }
    };

    // Format date
    const formatDate = (date: Date) => {
        const now = new Date();
        const timeDiff = now.getTime() - new Date(date).getTime();

        // Less than a minute
        if (timeDiff < 60 * 1000) {
            return 'Just now';
        }

        // Less than an hour
        if (timeDiff < 60 * 60 * 1000) {
            const minutes = Math.floor(timeDiff / (60 * 1000));
            return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
        }

        // Less than a day
        if (timeDiff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(timeDiff / (60 * 60 * 1000));
            return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
        }

        // Otherwise show date
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="relative" ref={notificationRef}>
            {/* Notification Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-indigo-600 focus:outline-none"
                aria-label="Notifications"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <div className="absolute right-0 z-20 w-80 mt-2 overflow-hidden bg-white rounded-lg shadow-xl dark:bg-gray-800">
                    <div className="flex items-center justify-between px-4 py-2 bg-indigo-50">
                        <h3 className="text-sm font-semibold text-indigo-700">Notifications</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-gray-500">
                                <p>No notifications</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`flex px-4 py-3 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                                >
                                    {getNotificationIcon(notification.type)}

                                    <div className="ml-3 flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {notification.title}
                                            </p>
                                            <div className="flex">
                                                {!notification.read && (
                                                    <button
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                        className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        Mark read
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleRemove(notification.id)}
                                                    className="ml-2 text-xs text-gray-400 hover:text-gray-600"
                                                >
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {notification.message}
                                        </p>

                                        {/* Link to debate or argument if applicable */}
                                        {notification.debateId && (
                                            <div className="mt-1">
                                                <Link
                                                    to={`/debates/${notification.debateId}${notification.argumentId ? `#argument-${notification.argumentId}` : ''}`}
                                                    onClick={() => {
                                                        setIsOpen(false);
                                                        handleMarkAsRead(notification.id);
                                                    }}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                                >
                                                    View in debate
                                                </Link>
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-400 mt-1">
                                            {formatDate(notification.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;