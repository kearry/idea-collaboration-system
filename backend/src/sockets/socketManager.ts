// sockets/socketManager.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { setupDebateHandlers } from './debateSocket';
import { setupUserPresenceHandlers } from './presenceSocket';
import { setupNotificationHandlers } from './notificationSocket';
import User from '../models/User';
import { socketService } from '../services/socketService';

// Define socket user data interface
interface SocketUser {
    id: string;
    username: string;
    role: string;
}

// Declare module augmentation to add user data to socket
declare module 'socket.io' {
    interface Socket {
        user?: SocketUser;
    }
}

// Initialize Socket.io
export const initializeSocketIO = (httpServer: HttpServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        },
        // Socket.io options for production
        pingTimeout: 30000,
        pingInterval: 25000,
        upgradeTimeout: 30000,
        maxHttpBufferSize: 1e6, // 1MB
        transports: ['websocket', 'polling'],
    });

    // Provide the io instance to the socket service
    socketService.initialize(io);

    // Authentication middleware for sockets
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }

            // Verify token
            const decodedToken = jwt.verify(
                token,
                process.env.JWT_SECRET || 'your-secret-key'
            ) as any;

            // Get user from database to ensure they still exist and have proper permissions
            const user = await User.findById(decodedToken.id).select('username role');

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            // Attach user info to socket
            socket.user = {
                id: user._id.toString(),
                username: user.username,
                role: user.role
            };

            logger.debug(`Socket authenticated: ${socket.id} - User: ${user.username}`);
            next();
        } catch (error) {
            logger.debug(`Socket authentication failed: ${error}`);
            next(new Error('Authentication error: Invalid or expired token'));
        }
    });

    // Register connection handler
    io.on('connection', (socket) => {
        logger.debug(`Socket connected: ${socket.id} - User: ${socket.user?.username}`);

        // Setup different socket handlers
        setupDebateHandlers(io, socket);
        setupUserPresenceHandlers(io, socket);
        setupNotificationHandlers(io, socket);

        // Global error handler
        socket.on('error', (error) => {
            logger.error(`Socket error for ${socket.id}: ${error}`);
        });

        // Disconnect event
        socket.on('disconnect', (reason) => {
            logger.debug(`Socket disconnected: ${socket.id} - Reason: ${reason}`);
        });
    });

    return io;
};