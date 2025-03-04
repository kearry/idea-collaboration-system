// utils/socketMonitoring.ts
import { Server } from 'socket.io';
import EventEmitter from 'events';
import { logger } from '../utils/logger';

class SocketMonitoring extends EventEmitter {
    private io: Server | null = null;
    private stats = {
        connections: 0,
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        roomSizes: new Map<string, number>()
    };

    private statsInterval: NodeJS.Timeout | null = null;

    initialize(io: Server) {
        this.io = io;

        // Monitor connection events
        io.on('connection', (socket) => {
            this.stats.connections++;
            this.emit('connection', socket.id);

            // Track room joins and leaves
            socket.on('join_debate', ({ debateId }) => {
                this.incrementRoomSize(debateId);
            });

            socket.on('leave_debate', ({ debateId }) => {
                this.decrementRoomSize(debateId);
            });

            // Track disconnections
            socket.on('disconnect', () => {
                this.stats.connections--;
                this.emit('disconnect', socket.id);
            });

            // Track errors
            socket.on('error', (error) => {
                this.stats.errors++;
                this.emit('socket_error', { socketId: socket.id, error });
            });
        });

        // Start periodic stats logging
        this.startStatsLogging();
    }

    private incrementRoomSize(room: string) {
        const currentSize = this.stats.roomSizes.get(room) || 0;
        this.stats.roomSizes.set(room, currentSize + 1);
    }

    private decrementRoomSize(room: string) {
        const currentSize = this.stats.roomSizes.get(room) || 0;
        if (currentSize > 0) {
            this.stats.roomSizes.set(room, currentSize - 1);
        }
    }

    trackMessageSent() {
        this.stats.messagesSent++;
    }

    trackMessageReceived() {
        this.stats.messagesReceived++;
    }

    getStats() {
        return {
            ...this.stats,
            roomSizes: Object.fromEntries(this.stats.roomSizes)
        };
    }

    private startStatsLogging() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }

        // Log stats every 5 minutes
        this.statsInterval = setInterval(() => {
            const currentStats = this.getStats();
            logger.info(`Socket stats: ${JSON.stringify(currentStats)}`);
        }, 5 * 60 * 1000);
    }

    shutdown() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }
}

export const socketMonitoring = new SocketMonitoring();