// sockets/presenceSocket.ts
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

// Keep track of users' online status
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

export const setupUserPresenceHandlers = (io: Server, socket: Socket) => {
    if (!socket.user) return;

    const userId = socket.user.id;

    // Add user to online users
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId)!.add(socket.id);

    // Broadcast user online status
    socket.broadcast.emit('user_online', {
        userId: userId,
        username: socket.user.username
    });

    // Handle disconnect to update online status
    socket.on('disconnect', () => {
        if (!socket.user) return;

        const userSockets = onlineUsers.get(userId);

        if (userSockets) {
            userSockets.delete(socket.id);

            // If user has no more active sockets, they're offline
            if (userSockets.size === 0) {
                onlineUsers.delete(userId);

                // Broadcast user offline status
                socket.broadcast.emit('user_offline', {
                    userId: userId
                });

                logger.debug(`User ${socket.user.username} is now offline`);
            }
        }
    });

    // Handle client request for online users
    socket.on('get_online_users', async () => {
        try {
            // Get list of online users
            const onlineUserIds = Array.from(onlineUsers.keys());

            socket.emit('online_users', { userIds: onlineUserIds });
        } catch (error) {
            logger.error(`Error getting online users: ${error}`);
            socket.emit('error', { message: 'Failed to get online users' });
        }
    });
};