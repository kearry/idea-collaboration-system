// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log error
    logger.error(err);

    // Handle AppError types
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: {
                message: err.message,
                ...(err.data && { details: err.data })
            }
        });
    }

    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: {
                message: 'Validation error',
                details: err.message
            }
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: {
                message: 'Invalid token'
            }
        });
    }

    // Handle other errors
    console.error(err); // Log full error details for debugging

    return res.status(500).json({
        error: {
            message: 'Internal server error'
        }
    });
};