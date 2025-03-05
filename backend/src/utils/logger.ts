import winston from 'winston';

// Define the custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create the console transport
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
            return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                }`;
        })
    )
});

// Create logger with the specified configuration
export const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    level: process.env.LOG_LEVEL || 'debug',
    format: logFormat,
    defaultMeta: { service: 'idea-collaboration-api' },
    transports: [consoleTransport]
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    logger.add(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        })
    );

    logger.add(
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        })
    );
}

// Override console methods in development for consistent logging
if (process.env.NODE_ENV !== 'production') {
    console.log = (...args: any[]) => logger.info(args.join(' '));
    console.info = (...args: any[]) => logger.info(args.join(' '));
    console.warn = (...args: any[]) => logger.warn({ message: args.join(' ') });
    console.error = (...args: any[]) => logger.error(args.join(' '));
    console.debug = (...args: any[]) => logger.debug(args.join(' '));
}

export default logger;