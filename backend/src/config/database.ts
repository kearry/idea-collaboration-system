// config/database.ts
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ideacollab';

        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            autoIndex: true, // Build indexes
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 60000, // Keep trying to send operations for 60 seconds
            socketTimeoutMS: 60000, // Close sockets after 60 seconds of inactivity
        };

        logger.info(`Attempting to connect to MongoDB with URI: ${mongoURI}`);
        try {
            await mongoose.connect(mongoURI, options);
            logger.info('MongoDB connected successfully');
        } catch (error) {
            logger.error(`MongoDB connection error: ${error}`);
            process.exit(1);
        }

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected, trying to reconnect...');
        });

        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed due to app termination');
            process.exit(0);
        });

    } catch (error) {
        logger.error(`MongoDB connection error: ${error}`);
        process.exit(1);
    }
};

export default connectDB;
