import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import {
    addArgument,
    updateArgument,
    deleteArgument,
    addOnlineUser,
    removeOnlineUser,
    setOnlineUsers,
    setTypingUsers
} from '../store/slices/debateSlice';
import { addNotification } from '../store/slices/notificationSlice';
import { Argument } from '../store/slices/debateSlice';
import debug from '../debug';

class SocketService {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private typingTimeout: ReturnType<typeof setTimeout> | null = null;
    private currentDebateId: string | undefined = undefined;
    private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // Connect to the Socket.io server
    connect(token: string = '') {
        if (this.socket && this.socket.connected) {
            debug.log('Socket already connected, reusing connection');
            return this.socket;
        }

        // If no token provided, try to get from localStorage
        if (!token) {
            token = localStorage.getItem('auth_token') || '';
        }

        if (!token) {
            debug.error('Cannot connect to socket: No authentication token available');
            return null;
        }

        this.connectionStatus = 'connecting';
        debug.log('Connecting to socket server...');

        try {
            const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8080';
            debug.log(`Socket URL: ${socketUrl}`);

            this.socket = io(socketUrl, {
                auth: { token },
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                timeout: 20000,
                transports: ['websocket', 'polling']
            });

            this.registerEvents();
            return this.socket;
        } catch (error) {
            debug.error('Error creating socket connection', error);
            this.handleReconnect();
            return null;
        }
    }

    // Register event handlers
    private registerEvents() {
        if (!this.socket) return;

        // Connection events
        this.socket.on('connect', this.handleConnect);
        this.socket.on('disconnect', this.handleDisconnect);
        this.socket.on('connect_error', this.handleConnectError);

        // Debate events
        this.socket.on('new_argument', this.handleNewArgument);
        this.socket.on('update_argument', this.handleUpdateArgument);
        this.socket.on('delete_argument', this.handleDeleteArgument);

        // User presence events
        this.socket.on('user_joined', this.handleUserJoined);
        this.socket.on('user_left', this.handleUserLeft);
        this.socket.on('active_users', this.handleActiveUsers);
        this.socket.on('user_typing', this.handleUserTyping);
        this.socket.on('user_stopped_typing', this.handleUserStoppedTyping);

        // Notification events
        this.socket.on('notification', this.handleNotification);
        this.socket.on('debate_notification', this.handleDebateNotification);

        // Error handling
        this.socket.on('error', this.handleError);

        debug.log('Socket event handlers registered');
    }

    // Remove event handlers
    private unregisterEvents() {
        if (!this.socket) return;

        this.socket.off('connect', this.handleConnect);
        this.socket.off('disconnect', this.handleDisconnect);
        this.socket.off('connect_error', this.handleConnectError);
        this.socket.off('new_argument', this.handleNewArgument);
        this.socket.off('update_argument', this.handleUpdateArgument);
        this.socket.off('delete_argument', this.handleDeleteArgument);
        this.socket.off('user_joined', this.handleUserJoined);
        this.socket.off('user_left', this.handleUserLeft);
        this.socket.off('active_users', this.handleActiveUsers);
        this.socket.off('user_typing', this.handleUserTyping);
        this.socket.off('user_stopped_typing', this.handleUserStoppedTyping);
        this.socket.off('notification', this.handleNotification);
        this.socket.off('debate_notification', this.handleDebateNotification);
        this.socket.off('error', this.handleError);

        debug.log('Socket event handlers unregistered');
    }

    // Handles automatic reconnection on errors
    private handleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
            debug.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            this.reconnectTimer = setTimeout(() => {
                debug.log('Attempting reconnection now...');
                this.connect();
            }, delay);
        } else {
            debug.error('Max reconnection attempts reached. Please refresh the page.');
            this.connectionStatus = 'disconnected';

            // Notify the user about connection failure
            store.dispatch(addNotification({
                id: Date.now().toString(),
                type: 'error',
                title: 'Connection Lost',
                message: 'Unable to connect to the server. Please refresh the page.',
                timestamp: new Date(),
                read: false
            }));
        }
    }

    // Event Handlers
    private handleConnect = () => {
        debug.log('Socket connected successfully');
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;

        // Rejoin debate if needed
        if (this.currentDebateId) {
            debug.log(`Rejoining debate room: ${this.currentDebateId}`);
            this.joinDebate(this.currentDebateId);
        }

        // Notify user of successful reconnection if this wasn't the first connection
        if (this.reconnectAttempts > 0) {
            store.dispatch(addNotification({
                id: Date.now().toString(),
                type: 'success',
                title: 'Connection Restored',
                message: 'You are now reconnected to the server.',
                timestamp: new Date(),
                read: false
            }));
        }
    };

    private handleDisconnect = (reason: string) => {
        debug.log(`Socket disconnected: ${reason}`);
        this.connectionStatus = 'disconnected';

        // If the disconnect was unexpected, try to reconnect
        if (reason === 'io server disconnect' || reason === 'transport close') {
            debug.log('Unexpected disconnect, attempting to reconnect...');
            this.handleReconnect();
        }
    };

    private handleConnectError = (error: Error) => {
        debug.error(`Socket connection error: ${error.message}`);
        this.connectionStatus = 'disconnected';
        this.handleReconnect();
    };

    private handleNewArgument = (data: { argument: Argument }) => {
        debug.log('Received new argument', data.argument.id);
        store.dispatch(addArgument(data.argument));
    };

    private handleUpdateArgument = (data: { id: string, data: Partial<Argument> }) => {
        debug.log(`Received argument update for ${data.id}`, data.data);
        store.dispatch(updateArgument(data));
    };

    private handleDeleteArgument = (data: { id: string }) => {
        debug.log(`Received argument deletion for ${data.id}`);
        store.dispatch(deleteArgument(data.id));
    };

    private handleUserJoined = (data: { userId: string, username: string }) => {
        debug.log(`User joined: ${data.username} (${data.userId})`);
        store.dispatch(addOnlineUser(data));

        // Notify about user joining (optional)
        store.dispatch(addNotification({
            id: Date.now().toString(),
            type: 'info',
            title: 'User Joined',
            message: `${data.username} has joined the debate.`,
            timestamp: new Date(),
            read: false,
            debateId: this.currentDebateId
        }));
    };

    private handleUserLeft = (data: { userId: string, username?: string }) => {
        debug.log(`User left: ${data.userId}`);
        store.dispatch(removeOnlineUser(data.userId));
    };

    private handleActiveUsers = (data: { users: Array<{ userId: string, username: string }> }) => {
        debug.log(`Received active users list: ${data.users.length} users`);
        store.dispatch(setOnlineUsers(data.users));
    };

    private handleUserTyping = (data: { userId: string, username: string }) => {
        const currentTypingUsers = store.getState().debate.typingUsers;

        // Check if user is already in the typing list
        if (!currentTypingUsers.some(user => user.userId === data.userId)) {
            debug.log(`User typing: ${data.username}`);
            store.dispatch(setTypingUsers([...currentTypingUsers, data]));
        }
    };

    private handleUserStoppedTyping = (data: { userId: string }) => {
        debug.log(`User stopped typing: ${data.userId}`);
        const currentTypingUsers = store.getState().debate.typingUsers;
        store.dispatch(setTypingUsers(
            currentTypingUsers.filter(user => user.userId !== data.userId)
        ));
    };

    private handleNotification = (notification: any) => {
        debug.log('Received notification', notification);
        store.dispatch(addNotification(notification));
    };

    private handleDebateNotification = (notification: any) => {
        // Only process if related to current debate
        if (notification.debateId === this.currentDebateId) {
            debug.log('Received debate notification', notification);
            store.dispatch(addNotification(notification));
        }
    };

    private handleError = (error: { message: string }) => {
        debug.error(`Socket error: ${error.message}`);

        // Show error notification
        store.dispatch(addNotification({
            id: Date.now().toString(),
            type: 'error',
            title: 'Connection Error',
            message: error.message,
            timestamp: new Date(),
            read: false
        }));
    };

    // Public API methods
    joinDebate(debateId: string) {
        if (!this.socket) {
            debug.error('Cannot join debate: Socket not initialized');
            this.connect(); // Try to connect

            // Store debate ID for joining after reconnection
            this.currentDebateId = debateId;
            return false;
        } else if (this.socket && !this.socket.connected) {
            debug.log('Socket not connected, attempting to connect before joining debate');
            this.currentDebateId = debateId;
            this.socket.connect();
            return false;
        } else {
            return this.joinDebateRoom(debateId);
        }
    }

    private joinDebateRoom(debateId: string) {
        if (!this.socket) return false;
        if (!this.socket.connected) return false;

        try {
            debug.log(`Joining debate room: ${debateId}`);
            this.currentDebateId = debateId;
            this.socket.emit('join_debate', { debateId });
            this.socket.emit('subscribe_debate_notifications', { debateId });

            // Request active users list
            this.getOnlineUsers();
            return true;
        } catch (error) {
            debug.error('Error joining debate room', error);
            return false;
        }
    }

    leaveDebate(debateId: string) {
        if (!this.socket) return false;
        if (!this.socket.connected) return false;

        try {
            debug.log(`Leaving debate room: ${debateId}`);
            this.socket.emit('leave_debate', { debateId });
            this.socket.emit('unsubscribe_debate_notifications', { debateId });
            this.currentDebateId = undefined;
            return true;
        } catch (error) {
            debug.error('Error leaving debate room', error);
            return false;
        }
    }

    sendArgument(debateId: string, argument: {
        content: string;
        type: 'pro' | 'con';
        parentId?: string;
    }) {
        if (!this.socket) return false;
        if (!this.socket.connected) return false;

        try {
            debug.log('Sending new argument', argument);
            this.socket.emit('new_argument', { debateId, argument });
            return true;
        } catch (error) {
            debug.error('Error sending argument', error);
            return false;
        }
    }

    voteOnArgument(debateId: string, argumentId: string, value: 1 | 0 | -1) {
        if (!this.socket) return false;
        if (!this.socket.connected) return false;

        try {
            debug.log(`Voting on argument ${argumentId} with value ${value}`);
            this.socket.emit('vote_argument', { debateId, argumentId, value });
            return true;
        } catch (error) {
            debug.error('Error voting on argument', error);
            return false;
        }
    }

    notifyTyping(debateId: string) {
        if (!this.socket) return false;
        if (!this.socket.connected) return false;

        try {
            this.socket.emit('typing_start', { debateId });

            // Clear existing timeout if there is one
            if (this.typingTimeout) {
                clearTimeout(this.typingTimeout);
            }

            // Set a new timeout to stop typing indicator after 3 seconds
            this.typingTimeout = setTimeout(() => {
                if (this.socket && this.socket.connected) {
                    this.socket.emit('typing_end', { debateId });
                }
            }, 3000);

            return true;
        } catch (error) {
            debug.error('Error notifying typing', error);
            return false;
        }
    }

    getOnlineUsers() {
        if (!this.socket) return false;
        if (!this.socket.connected) return false;
        if (!this.currentDebateId) return false;

        try {
            debug.log('Requesting active users list for current debate');
            this.socket.emit('get_active_users', { debateId: this.currentDebateId });
            return true;
        } catch (error) {
            debug.error('Error getting online users', error);
            return false;
        }
    }

    markNotificationRead(notificationId: string) {
        if (!this.socket) return false;
        if (!this.socket.connected) return false;

        try {
            debug.log(`Marking notification as read: ${notificationId}`);
            this.socket.emit('mark_notification_read', { notificationId });
            return true;
        } catch (error) {
            debug.error('Error marking notification as read', error);
            return false;
        }
    }

    disconnect() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            debug.log('Disconnecting socket');
            this.unregisterEvents();
            this.socket.disconnect();
            this.socket = null;
        }

        this.currentDebateId = undefined;
        this.connectionStatus = 'disconnected';
        return true;
    }

    // Helper methods
    isConnected(): boolean {
        if (!this.socket) return false;
        return this.socket.connected || false;
    }

    getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
        return this.connectionStatus;
    }

    getCurrentDebateId(): string | undefined {
        return this.currentDebateId;
    }
}

// Export singleton instance
export const socketService = new SocketService();