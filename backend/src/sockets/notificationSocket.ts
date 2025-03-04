// sockets/notificationSocket.ts
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export const setupNotificationHandlers = (io: Server, socket: Socket) => {
    if (!socket.user) return;

    // User subscribes to notifications for a specific debate
    socket.on('subscribe_debate_notifications', ({ debateId }) => {
        if (!socket.user) return;

        // Join a special notification room for this debate
        socket.join(`notifications:${debateId}`);

        logger.debug(`User ${socket.user.username} subscribed to notifications for debate ${debateId}`);
    });

    // User unsubscribes from notifications for a specific debate
    socket.on('unsubscribe_debate_notifications', ({ debateId }) => {
        if (!socket.user) return;

        // Leave the notification room
        socket.leave(`notifications:${debateId}`);

        logger.debug(`User ${socket.user.username} unsubscribed from notifications for debate ${debateId}`);
    });

    // Handle notification acknowledgment
    socket.on('mark_notification_read', async ({ notificationId }) => {
        if (!socket.user) return;

        try {
            // Update notification as read in database (implementation would be in a service)
            // await notificationService.markAsRead(notificationId, socket.user.id);

            logger.debug(`Notification ${notificationId} marked as read by ${socket.user.username}`);
        } catch (error) {
            logger.error(`Error marking notification as read: ${error}`);
            socket.emit('error', { message: 'Failed to mark notification as read' });
        }
    });
};