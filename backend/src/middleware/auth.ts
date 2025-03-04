import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import User from '../models/User';

// Define interface for decoded JWT token
interface DecodedToken {
    id: string;
    role: string;
    iat: number;
    exp: number;
}

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
            };
        }
    }
}

export const isAuthenticated = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new UnauthorizedError('No authentication token, access denied');
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key'
        ) as DecodedToken;

        // Check if user still exists
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        // Attach user to request object
        req.user = {
            id: decoded.id,
            role: decoded.role
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError('Invalid token'));
        } else {
            next(error);
        }
    }
};