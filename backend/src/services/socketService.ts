// services/socketService.ts
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import Argument from '../models/Argument';
import Vote from '../models/Vote';
import mongoose from 'mongoose';

class SocketService {
    private io: Server | null = null;

    // Initialize with the Socket.io server instance
    initialize(io: Server) {
        this.io = io;
        logger.info('Socket service initialized');
    }

    // Emit event to all connected clients
    emitToAll(event: string, data: any) {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return;
        }

        this.io.emit(event, data);
    }

    // Emit event to a specific room
    emitToRoom(room: string, event: string, data: any) {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return;
        }

        this.io.to(room).emit(event, data);
    }

    // Emit event to a specific user (all their connections)
    emitToUser(userId: string, event: string, data: any) {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return;
        }

        this.io.to(`user:${userId}`).emit(event, data);
    }

    // Get active users in a room
    async getActiveUsersInRoom(room: string) {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return [];
        }

        try {
            const sockets = await this.io.in(room).fetchSockets();

            const users = sockets
                .filter(socket => socket.user)
                .map(socket => ({
                    userId: socket.user!.id,
                    username: socket.user!.username
                }));

            return users;
        } catch (error) {
            logger.error(`Error getting active users: ${error}`);
            return [];
        }
    }

    // Process a vote on an argument
    async processVote(userId: string, argumentId: string, value: number) {
        try {
            if (!mongoose.Types.ObjectId.isValid(argumentId)) {
                throw new Error('Invalid argument ID');
            }

            const argument = await Argument.findById(argumentId);

            if (!argument) {
                throw new Error('Argument not found');
            }

            // Find existing vote
            const existingVote = await Vote.findOne({
                argument: argumentId,
                user: userId
            });

            // Calculate vote difference
            let voteDelta = value;

            if (existingVote) {
                // Remove the effect of the previous vote
                voteDelta -= existingVote.value;

                if (value === 0) {
                    // Remove vote
                    await existingVote.deleteOne();
                } else {
                    // Update vote
                    existingVote.value = value;
                    await existingVote.save();
                }
            } else if (value !== 0) {
                // Create new vote
                const vote = new Vote({
                    argument: argumentId,
                    user: userId,
                    value
                });
                await vote.save();
            }

            // Update argument vote count
            if (voteDelta !== 0) {
                argument.votes += voteDelta;
                await argument.save();

                return {
                    newVoteCount: argument.votes,
                    userVote: value
                };
            }

            return null;
        } catch (error) {
            logger.error(`Error processing vote: ${error}`);
            throw error;
        }
    }

    // Send notification to specific users
    sendNotification(userIds: string[], notification: {
        type: string;
        title: string;
        message: string;
        debateId?: string;
        argumentId?: string;
        data?: any;
    }) {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return;
        }

        // Generate a unique ID for the notification
        const notificationId = new mongoose.Types.ObjectId().toString();

        const notificationData = {
            id: notificationId,
            timestamp: new Date(),
            ...notification
        };

        // Send to each user
        for (const userId of userIds) {
            this.emitToUser(userId, 'notification', notificationData);
        }

        // If debate-specific, also send to debate notification room
        if (notification.debateId) {
            this.emitToRoom(
                `notifications:${notification.debateId}`,
                'debate_notification',
                notificationData
            );
        }

        logger.debug(`Notification sent to ${userIds.length} users`);
    }

    // Close all connections for maintenance
    closeAllConnections(reason: string = 'Server maintenance') {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return;
        }

        this.io.disconnectSockets(true);
        logger.info(`All socket connections closed: ${reason}`);
    }
}

// Export singleton instance
export const socketService = new SocketService();
