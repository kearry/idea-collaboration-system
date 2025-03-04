import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    debateId?: string;
    argumentId?: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
}

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        addNotification: (state, action: PayloadAction<Notification>) => {
            state.notifications.unshift(action.payload);
            if (!action.payload.read) {
                state.unreadCount++;
            }
        },

        markAsRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find(n => n.id === action.payload);
            if (notification && !notification.read) {
                notification.read = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },

        markAllAsRead: (state) => {
            state.notifications.forEach(notification => {
                notification.read = true;
            });
            state.unreadCount = 0;
        },

        clearNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        },

        removeNotification: (state, action: PayloadAction<string>) => {
            const index = state.notifications.findIndex(n => n.id === action.payload);
            if (index !== -1) {
                if (!state.notifications[index].read) {
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
                state.notifications.splice(index, 1);
            }
        }
    }
});

export const {
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification
} = notificationSlice.actions;

export default notificationSlice.reducer;