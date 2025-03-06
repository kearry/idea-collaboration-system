import React, { useState, useEffect } from 'react';
import { socketService } from '../../services/socketService';

const ConnectionStatus: React.FC = () => {
    const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
    const [showTooltip, setShowTooltip] = useState(false);
    const [reconnectTimer, setReconnectTimer] = useState<number | null>(null);

    // Function to check connection status
    const checkConnectionStatus = () => {
        // Just check if connected
        const isConnected = socketService.isConnected();
        setStatus(isConnected ? 'connected' : 'disconnected');

        // If disconnected, try to reconnect after a delay
        if (!isConnected) {
            if (!reconnectTimer) {
                const timer = window.setTimeout(() => {
                    tryReconnect();
                    setReconnectTimer(null);
                }, 5000);
                setReconnectTimer(timer as unknown as number);
            }
        } else if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            setReconnectTimer(null);
        }
    };

    const tryReconnect = () => {
        if (status !== 'connected') {
            const token = localStorage.getItem('auth_token');
            socketService.connect(token || '');
        }
    };

    // Set up interval to check connection
    useEffect(() => {
        // Initial status check
        checkConnectionStatus();

        // Set up interval to periodically check connection status
        const interval = setInterval(checkConnectionStatus, 5000);

        // Cleanup function
        return () => {
            clearInterval(interval);
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependencies array - we only want this to run once

    // Determine color and icon based on status
    const getStatusDisplay = () => {
        switch (status) {
            case 'connected':
                return {
                    color: 'text-green-500',
                    bgColor: 'bg-green-500',
                    hoverColor: 'bg-green-100',
                    label: 'Connected',
                    icon: (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                    )
                };
            case 'connecting':
                return {
                    color: 'text-yellow-500',
                    bgColor: 'bg-yellow-500',
                    hoverColor: 'bg-yellow-100',
                    label: 'Connecting...',
                    icon: (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )
                };
            default:
                return {
                    color: 'text-red-500',
                    bgColor: 'bg-red-500',
                    hoverColor: 'bg-red-100',
                    label: 'Disconnected',
                    icon: (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                    )
                };
        }
    };

    const { color, bgColor, hoverColor, label, icon } = getStatusDisplay();

    return (
        <div className="relative">
            <button
                className={`flex items-center justify-center w-8 h-8 rounded-full ${hoverColor} ${color} hover:opacity-80`}
                onClick={tryReconnect}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                {icon}
            </button>

            {/* Status indicator dot */}
            <span className={`absolute bottom-0 right-0 w-2 h-2 ${bgColor} rounded-full`}></span>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute right-0 bottom-full mb-2 w-32 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none z-10">
                    {label}
                    {status === 'disconnected' && (
                        <p className="text-gray-300 mt-1">Click to reconnect</p>
                    )}
                    <div className="absolute bottom-0 right-2 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                </div>
            )}
        </div>
    );
};

export default ConnectionStatus;