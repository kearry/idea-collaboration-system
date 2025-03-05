// app.ts setup with error handling
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { errorHandler } from './middleware/errorHandler';
import { initializeSocketIO } from './sockets/socketManager';
import authRoutes from './routes/authRoutes';
import debateRoutes from './routes/debateRoutes';
import argumentRoutes from './routes/argumentRoutes';
import userRoutes from './routes/userRoutes';
import { NotFoundError } from './utils/errors';
import connectDB from './config/database'; // Initialize database connection

const app = express();
const httpServer = createServer(app);

connectDB();

// Initialize Socket.io
initializeSocketIO(httpServer);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/debates', debateRoutes);
app.use('/api/arguments', argumentRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res, next) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export { app, httpServer };
