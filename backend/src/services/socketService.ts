// services/socketService.ts
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import Argument from '../models/Argument';
import Vote from '../models/Vote';
import Debate from '../models/Debate';
import mongoose from 'mongoose';
import { socketMonitoring } from '../utils/socketMonitoring';

class SocketService {
    private io: Server | null = null;
    private roomUserCounts: Map<string, number> = new Map();
    private debateCache: Map<string, {
        lastUpdate: Date;
        data: any;
    }> = new Map();

    // Initialize with the Socket.io server instance
    initialize(io: Server) {
        this.io = io;
        logger.info('Socket service initialized');

        // Start cache cleanup interval
        setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Every 5 minutes
    }

    // Emit event to all connected clients
    emitToAll(event: string, data: any) {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return false;
        }

        try {
            this.io.emit(event, data);
            socketMonitoring.trackMessageSent('server', event);
            return true;
        } catch (error) {
            logger.error(`Error emitting to all: ${error}`);
            return false;
        }
    }

    // Emit event to a specific room
    emitToRoom(room: string, event: string, data: any) {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return false;
        }

        try {
            this.io.to(room).emit(event, data);
            socketMonitoring.trackMessageSent('server', event);
            return true;
        } catch (error) {
            logger.error(`Error emitting to room ${room}: ${error}`);
            return false;
        }
    }

    // Emit event to a specific user (all their connections)
    emitToUser(userId: string, event: string, data: any) {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return false;
        }

        try {
            this.io.to(`user:${userId}`).emit(event, data);
            socketMonitoring.trackMessageSent('server', event);
            return true;
        } catch (error) {
            logger.error(`Error emitting to user ${userId}: ${error}`);
            return false;
        }
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
                .filter(socket => socket.data && socket.data.user)
                .map(socket => ({
                    userId: socket.data.user.id,
                    username: socket.data.user.username
                }));

            // Cache room user count for performance
            this.roomUserCounts.set(room, users.length);

            return users;
        } catch (error) {
            logger.error(`Error getting active users: ${error}`);
            return [];
        }
    }

    // Get count of users in a room (more efficient)
    async getUserCountInRoom(room: string): Promise<number> {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return 0;
        }

        // Use cached value if available (avoid expensive fetchSockets call)
        if (this.roomUserCounts.has(room)) {
            return this.roomUserCounts.get(room) || 0;
        }

        try {
            const sockets = await this.io.in(room).fetchSockets();
            const count = sockets.length;

            // Cache the count
            this.roomUserCounts.set(room, count);
            return count;
        } catch (error) {
            logger.error(`Error getting user count: ${error}`);
            return 0;
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
            let isFirstVote = false;
            let changedDirection = false;

            if (existingVote) {
                // Check if vote direction changed
                changedDirection = existingVote.value * value < 0; // Different signs

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
                isFirstVote = true;
            }

            // Update argument vote count
            if (voteDelta !== 0) {
                argument.votes += voteDelta;
                await argument.save();

                return {
                    newVoteCount: argument.votes,
                    userVote: value,
                    isFirstVote,
                    changedDirection
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
            return false;
        }

        // Generate a unique ID for the notification
        const notificationId = new mongoose.Types.ObjectId().toString();

        const notificationData = {
            id: notificationId,
            timestamp: new Date(),
            read: false,
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
        return true;
    }

    // Get cached debate data (for improved performance)
    async getCachedDebateData(debateId: string, forceRefresh = false) {
        const now = new Date();
        const cacheExpiry = 60 * 1000; // 1 minute

        // Return from cache if available and not expired
        if (!forceRefresh &&
            this.debateCache.has(debateId) &&
            (now.getTime() - this.debateCache.get(debateId)!.lastUpdate.getTime() < cacheExpiry)) {
            return this.debateCache.get(debateId)!.data;
        }

        try {
            // Fetch debate data
            const debate = await Debate.findById(debateId)
                .populate('creator', 'username profileImage');

            if (!debate) {
                return null;
            }

            // Get argument counts
            const [proCount, conCount, replyCount] = await Promise.all([
                Argument.countDocuments({ debate: debateId, type: 'pro', parentId: null }),
                Argument.countDocuments({ debate: debateId, type: 'con', parentId: null }),
                Argument.countDocuments({ debate: debateId, parentId: { $ne: null } })
            ]);

            const data = {
                debate,
                stats: {
                    proCount,
                    conCount,
                    replyCount
                }
            };

            // Update cache
            this.debateCache.set(debateId, {
                lastUpdate: now,
                data
            });

            return data;
        } catch (error) {
            logger.error(`Error fetching debate data: ${error}`);
            return null;
        }
    }

    // Clean up expired caches
    private cleanupCache() {
        const now = new Date();
        const maxAge = 10 * 60 * 1000; // 10 minutes

        for (const [key, value] of this.debateCache.entries()) {
            if (now.getTime() - value.lastUpdate.getTime() > maxAge) {
                this.debateCache.delete(key);
            }
        }

        // Also clean up room user counts
        this.roomUserCounts.clear();
    }

    // Close all connections for maintenance
    closeAllConnections(reason: string = 'Server maintenance') {
        if (!this.io) {
            logger.warn('Socket service not initialized');
            return false;
        }

        try {
            // Send a warning to all clients first
            this.emitToAll('server_announcement', {
                type: 'warning',
                message: `Server will disconnect all clients in 10 seconds: ${reason}`
            });

            // Delay actual disconnection
            setTimeout(() => {
                this.io!.disconnectSockets(true);
                logger.info(`All socket connections closed: ${reason}`);
            }, 10000);

            return true;
        } catch (error) {
            logger.error(`Error closing connections: ${error}`);
            return false;
        }
    }
}

// Export singleton instance
export const socketService = new SocketService();