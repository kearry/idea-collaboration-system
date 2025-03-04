// SOCKET CLIENT IMPLEMENTATION
// This code would be in the frontend application

// services/socketClient.ts
/*
import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import { 
  addArgument, 
  updateArgument, 
  deleteArgument,
  addOnlineUser,
  removeOnlineUser,
  setTypingUsers
} from '../store/slices/debateSlice';
import { addNotification } from '../store/slices/notificationSlice';

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentDebateId: string | null = null;

  // Connect to the Socket.io server
  connect(token: string) {
    if (this.socket?.connected) return;

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 20000
    });

    this.registerEvents();
    
    return this.socket;
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
    this.socket.on('user_online', this.handleUserOnline);
    this.socket.on('user_offline', this.handleUserOffline);
    
    // Notification events
    this.socket.on('notification', this.handleNotification);
    this.socket.on('debate_notification', this.handleDebateNotification);
    
    // Error handling
    this.socket.on('error', this.handleError);
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
    this.socket.off('user_online', this.handleUserOnline);
    this.socket.off('user_offline', this.handleUserOffline);
    this.socket.off('notification', this.handleNotification);
    this.socket.off('debate_notification', this.handleDebateNotification);
    this.socket.off('error', this.handleError);
  }

  // Event Handlers
  private handleConnect = () => {
    console.log('Socket connected');
    this.reconnectAttempts = 0;
    
    // Rejoin debate if needed
    if (this.currentDebateId) {
      this.joinDebate(this.currentDebateId);
    }
  };

  private handleDisconnect = (reason: string) => {
    console.log(`Socket disconnected: ${reason}`);
  };

  private handleConnectError = (error: Error) => {
    console.error(`Socket connection error: ${error.message}`);
    
    if (++this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      // Show offline notification to user
    }
  };

  private handleNewArgument = (data: { argument: any }) => {
    store.dispatch(addArgument(data.argument));
  };

  private handleUpdateArgument = (data: { id: string, data: any }) => {
    store.dispatch(updateArgument(data));
  };

  private handleDeleteArgument = (data: { id: string }) => {
    store.dispatch(deleteArgument(data.id));
  };

  private handleUserJoined = (data: { userId: string, username: string }) => {
    store.dispatch(addOnlineUser(data));
    // Optionally show a toast notification
  };

  private handleUserLeft = (data: { userId: string }) => {
    store.dispatch(removeOnlineUser(data.userId));
  };

  private handleActiveUsers = (data: { users: any[] }) => {
    // Set the complete list of active users
    store.dispatch({ type: 'debate/setOnlineUsers', payload: data.users });
  };

  private handleUserTyping = (data: { userId: string, username: string }) => {
    store.dispatch(setTypingUsers([...store.getState().debate.typingUsers, data]));
  };

  private handleUserStoppedTyping = (data: { userId: string }) => {
    store.dispatch(setTypingUsers(
      store.getState().debate.typingUsers.filter(user => user.userId !== data.userId)
    ));
  };

  private handleUserOnline = (data: { userId: string, username: string }) => {
    // Handle user coming online (global)
    // This might update a friends list or show a notification
  };

  private handleUserOffline = (data: { userId: string }) => {
    // Handle user going offline (global)
  };

  private handleNotification = (notification: any) => {
    store.dispatch(addNotification(notification));
  };

  private handleDebateNotification = (notification: any) => {
    // Only process if related to current debate
    if (notification.debateId === this.currentDebateId) {
      store.dispatch(addNotification(notification));
    }
  };

  private handleError = (error: { message: string }) => {
    console.error(`Socket error: ${error.message}`);
    // Show error toast to user
  };

  // Public API methods
  joinDebate(debateId: string) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.currentDebateId = debateId;
    this.socket.emit('join_debate', { debateId });
    this.socket.emit('subscribe_debate_notifications', { debateId });
  }

  leaveDebate(debateId: string) {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('leave_debate', { debateId });
    this.socket.emit('unsubscribe_debate_notifications', { debateId });
    this.currentDebateId = null;
  }

  sendArgument(debateId: string, argument: {
    content: string;
    type: 'pro' | 'con';
    parentId?: string;
  }) {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('new_argument', { debateId, argument });
  }

  voteOnArgument(debateId: string, argumentId: string, value: 1 | 0 | -1) {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('vote_argument', { debateId, argumentId, value });
  }

  notifyTyping(debateId: string) {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('typing_start', { debateId });
    
    // Clear existing timeout if there is one
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // Set a new timeout to stop typing indicator after 3 seconds
    this.typingTimeout = setTimeout(() => {
      this.socket?.emit('typing_end', { debateId });
    }, 3000);
  }

  getOnlineUsers() {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('get_online_users');
  }

  markNotificationRead(notificationId: string) {
    if (!this.socket || !this.socket.connected) return;
    
    this.socket.emit('mark_notification_read', { notificationId });
  }

  disconnect() {
    if (this.socket) {
      this.unregisterEvents();
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.currentDebateId = null;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
*/