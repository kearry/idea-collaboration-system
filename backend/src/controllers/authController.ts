import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import User from '../models/User';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

// Helper function to generate JWT
const generateToken = (userId: string, role: string) => {
    return jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
    );
};

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new BadRequestError('User already exists');
    }

    // Create new user
    const user = new User({
        username,
        email,
        password,
    });

    await user.save();

    // Generate JWT
    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage
        }
    });
};

/**
 * Authenticate user & get token
 */
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    logger.info(`Login attempt for email: ${email}`);

    // Find user by email
    logger.info(`Finding user by email: ${email}`);
    let user;
    try {
        user = await User.findOne({ email: email }).select('+password').hint({ email: 1 });
        logger.info(`User found: ${user ? user.email : 'No user found'}`);
    } catch (error) {
        logger.error(`Error finding user: ${error}`);
        throw new Error('Failed to login');
    }
    if (!user) {
        throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    logger.info(`Comparing password for user: ${user.email}`);
    let isMatch;
    try {
        isMatch = await user.comparePassword(password);
        logger.info(`Password match: ${isMatch}`);
    } catch (error) {
        logger.error(`Error comparing password: ${error}`);
        throw new Error('Failed to login');
    }
    if (!isMatch) {
        throw new UnauthorizedError('Invalid credentials');
    }

    // Generate JWT
    const token = generateToken(user._id.toString(), user.role);

    res.json({
        token,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage
        }
    });
};

/**
 * Get current user
 */
export const getCurrentUser = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError();
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        throw new UnauthorizedError('User not found');
    }

    res.json({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        bio: user.bio
    });
};

/**
 * Logout user - client side JWT removal
 */
export const logout = async (req: Request, res: Response) => {
    // JWT is stateless, so we don't need to do anything on the server
    // The client should remove the token
    res.json({ message: 'Logged out successfully' });
};

/**
 * Google OAuth callback
 */
export const googleAuthCallback = async (req: Request, res: Response) => {
    // This would be implemented with Passport.js Google strategy
    // For now, we'll just return a placeholder
    res.json({ message: 'Google authentication not implemented yet' });
};

/**
 * GitHub OAuth callback
 */
/**
 * GitHub OAuth callback
 */
export const githubAuthCallback = async (req: Request, res: Response) => {
    try {
        logger.info(`GitHub OAuth callback received with code: ${req.query.code ? 'Yes' : 'No'}`);
        const { code } = req.query;

        if (!code) {
            logger.error('No authorization code received');
            return res.status(400).json({ error: 'No authorization code received' });
        }

    } catch (error) {
        logger.error(`GitHub OAuth: Unhandled error: ${(error as Error).message}`);
        return res.status(500).json({ error: 'Authentication failed', details: (error as Error).message });
    }
};
