// utils/socketMonitoring.ts
import { Server, Socket } from 'socket.io';
import EventEmitter from 'events';
import { logger } from '../utils/logger';

interface RoomStats {
    count: number;
    peakCount: number;
    lastActivity: Date;
}

interface MessageTypeStats {
    count: number;
    lastSent: Date;
}

interface ConnectionStats {
    username?: string;
    connectedAt: Date;
    lastActivity: Date;
    rooms: Set<string>;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    heartbeats: number;
}

class SocketMonitoring extends EventEmitter {
    private io: Server | null = null;
    private stats = {
        connections: {
            current: 0,
            peak: 0,
            total: 0
        },
        messages: {
            sent: 0,
            received: 0,
            byType: new Map<string, MessageTypeStats>()
        },
        errors: 0,
        rooms: new Map<string, RoomStats>(),
        performance: {
            avgLatency: 0,
            latencySamples: 0,
            latencyTotal: 0
        }
    };

    // Track individual socket connections
    private connectionDetails = new Map<string, ConnectionStats>();

    // Performance tracking
    private latencyCheckInterval: NodeJS.Timeout | null = null;
    private statsInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;

    initialize(io: Server) {
        this.io = io;
        logger.info('Socket monitoring initialized');

        // Start periodic stats logging
        this.startStatsLogging();

        // Start periodic connection cleanup
        this.startConnectionCleanup();

        // Start periodic latency checks
        this.startLatencyChecks();
    }

    // Connection tracking
    trackConnection(socketId: string, username?: string) {
        this.stats.connections.current++;
        this.stats.connections.total++;

        if (this.stats.connections.current > this.stats.connections.peak) {
            this.stats.connections.peak = this.stats.connections.current;
        }

        this.connectionDetails.set(socketId, {
            username,
            connectedAt: new Date(),
            lastActivity: new Date(),
            rooms: new Set(),
            messagesSent: 0,
            messagesReceived: 0,
            errors: 0,
            heartbeats: 0
        });

        this.emit('connection', socketId);
        return true;
    }

    trackDisconnection(socketId: string, reason?: string) {
        this.stats.connections.current = Math.max(0, this.stats.connections.current - 1);

        // Clean up connection details
        this.connectionDetails.delete(socketId);

        this.emit('disconnect', { socketId, reason });
        return true;
    }

    // Room management
    trackRoomJoin(socketId: string, room: string) {
        // Update global room stats
        if (!this.stats.rooms.has(room)) {
            this.stats.rooms.set(room, {
                count: 1,
                peakCount: 1,
                lastActivity: new Date()
            });
        } else {
            const roomStats = this.stats.rooms.get(room)!;
            roomStats.count++;
            roomStats.lastActivity = new Date();

            if (roomStats.count > roomStats.peakCount) {
                roomStats.peakCount = roomStats.count;
            }
        }

        // Update connection room membership
        const connection = this.connectionDetails.get(socketId);
        if (connection) {
            connection.rooms.add(room);
            connection.lastActivity = new Date();
        }

        return true;
    }

    trackRoomLeave(socketId: string, room: string) {
        // Update global room stats
        if (this.stats.rooms.has(room)) {
            const roomStats = this.stats.rooms.get(room)!;
            roomStats.count = Math.max(0, roomStats.count - 1);
            roomStats.lastActivity = new Date();

            // Remove room with no members
            if (roomStats.count === 0) {
                this.stats.rooms.delete(room);
            }
        }

        // Update connection room membership
        const connection = this.connectionDetails.get(socketId);
        if (connection) {
            connection.rooms.delete(room);
            connection.lastActivity = new Date();
        }

        return true;
    }

    // Message tracking
    trackMessageSent(socketId: string, messageType: string) {
        this.stats.messages.sent++;

        // Track by message type
        if (!this.stats.messages.byType.has(messageType)) {
            this.stats.messages.byType.set(messageType, {
                count: 1,
                lastSent: new Date()
            });
        } else {
            const typeStats = this.stats.messages.byType.get(messageType)!;
            typeStats.count++;
            typeStats.lastSent = new Date();
        }

        // Update connection stats
        const connection = this.connectionDetails.get(socketId);
        if (connection) {
            connection.messagesSent++;
            connection.lastActivity = new Date();
        }

        return true;
    }

    trackMessageReceived(socketId: string, messageType: string) {
        this.stats.messages.received++;

        // Update connection stats
        const connection = this.connectionDetails.get(socketId);
        if (connection) {
            connection.messagesReceived++;
            connection.lastActivity = new Date();
        }

        return true;
    }

    // Error tracking
    trackError(socketId: string, error: any) {
        this.stats.errors++;

        // Update connection stats
        const connection = this.connectionDetails.get(socketId);
        if (connection) {
            connection.errors++;
            connection.lastActivity = new Date();
        }

        this.emit('socket_error', { socketId, error });
        return true;
    }

    // Connection heartbeat
    trackHeartbeat(socketId: string) {
        const connection = this.connectionDetails.get(socketId);
        if (connection) {
            connection.heartbeats++;
            connection.lastActivity = new Date();
        }
        return true;
    }

    // Get overall stats
    getStats() {
        return {
            connections: { ...this.stats.connections },
            messages: {
                sent: this.stats.messages.sent,
                received: this.stats.messages.received,
                byType: Object.fromEntries(this.stats.messages.byType)
            },
            errors: this.stats.errors,
            rooms: {
                count: this.stats.rooms.size,
                top5BySize: Array.from(this.stats.rooms.entries())
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5)
                    .map(([room, stats]) => ({
                        room,
                        users: stats.count,
                        peak: stats.peakCount
                    }))
            },
            performance: { ...this.stats.performance }
        };
    }

    // Check average latency
    private checkLatency() {
        if (!this.io) return;

        const socketIds = Array.from(this.connectionDetails.keys());
        const sampleSize = Math.min(10, socketIds.length);

        if (sampleSize === 0) return;

        // Sample random sockets
        const sampledSocketIds = socketIds
            .sort(() => 0.5 - Math.random())
            .slice(0, sampleSize);

        for (const socketId of sampledSocketIds) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket && socket.connected) {
                const startTime = Date.now();

                // Send ping and measure round-trip time
                socket.emit('latency_ping', { timestamp: startTime }, (acknowledgment: any) => {
                    if (acknowledgment && acknowledgment.timestamp === startTime) {
                        const latency = Date.now() - startTime;

                        // Update rolling average
                        this.stats.performance.latencyTotal += latency;
                        this.stats.performance.latencySamples++;
                        this.stats.performance.avgLatency =
                            this.stats.performance.latencyTotal / this.stats.performance.latencySamples;
                    }
                });
            }
        }
    }

    // Start periodic stats logging
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

    // Start periodic connection cleanup
    private startConnectionCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Clean up stale connections every 15 minutes
        this.cleanupInterval = setInterval(() => {
            const now = new Date();
            const staleCutoff = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes

            for (const [socketId, stats] of this.connectionDetails.entries()) {
                if (stats.lastActivity < staleCutoff) {
                    logger.warn(`Cleaning up stale socket connection: ${socketId}`);
                    this.connectionDetails.delete(socketId);

                    // Attempt to disconnect if socket still exists
                    if (this.io) {
                        const socket = this.io.sockets.sockets.get(socketId);
                        if (socket && socket.connected) {
                            socket.disconnect(true);
                        }
                    }
                }
            }

            // Also clean up empty rooms
            for (const [room, stats] of this.stats.rooms.entries()) {
                if (stats.count === 0 || stats.lastActivity < staleCutoff) {
                    this.stats.rooms.delete(room);
                }
            }
        }, 15 * 60 * 1000);
    }

    // Start periodic latency checks
    private startLatencyChecks() {
        if (this.latencyCheckInterval) {
            clearInterval(this.latencyCheckInterval);
        }

        // Check latency every minute
        this.latencyCheckInterval = setInterval(() => {
            this.checkLatency();
        }, 60 * 1000);
    }

    // Gracefully shutdown monitoring
    shutdown() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        if (this.latencyCheckInterval) {
            clearInterval(this.latencyCheckInterval);
            this.latencyCheckInterval = null;
        }

        // Clear all stats
        this.connectionDetails.clear();
        this.stats.rooms.clear();
        this.stats.messages.byType.clear();

        logger.info('Socket monitoring shutdown');
    }
}

export const socketMonitoring = new SocketMonitoring();