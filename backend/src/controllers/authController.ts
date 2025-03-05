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
    logger.info(`Provided password length: ${password ? password.length : 'undefined'}`);
    logger.info(`Provided password: ${password}`);

    // Find user by email
    logger.info(`Finding user by email: ${email}`);
    let user;
    try {
        user = await User.findOne({ email: email }).select('+password').hint({ email: 1 });
        logger.info(`User found: ${user ? user.email : 'No user found'}`);
        if (user) {
            logger.info(`Stored password hash: ${user.password}`);
        }
    } catch (error) {
        logger.error(`Error finding user: ${error}`);
        throw new Error('Failed to login');
    }
    if (!user) {
        throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    logger.info(`Comparing password for user: ${user.email}`);
    if (!password) {
        throw new BadRequestError('Password is required');
    }

    if (!user.password) {
        throw new Error('User password not set');
    }

    let isMatch;
    try {
        // Log the raw inputs to comparePassword
        logger.info(`Raw input password: ${password}`);
        logger.info(`Password type: ${typeof password}`);

        // Try comparing directly with bcrypt for debugging
        const bcryptMatch = await bcrypt.compare(password, user.password);
        logger.info(`Direct bcrypt comparison result: ${bcryptMatch}`);

        // Now try the method on the user model
        isMatch = await user.comparePassword(password);
        logger.info(`User model comparePassword result: ${isMatch}`);
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
export const githubAuthCallback = async (req: Request, res: Response) => {
    try {
        logger.info(`GitHub OAuth callback received with code: ${req.query.code ? 'Yes' : 'No'}`);
        const { code } = req.query;

        if (!code) {
            logger.error('No authorization code received');
            return res.status(400).json({ error: 'No authorization code received' });
        }

        // Exchange code for access token
        const githubClientId = process.env.GITHUB_CLIENT_ID;
        const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

        logger.info(`Using GitHub client ID: ${githubClientId}`);

        // GitHub OAuth token endpoint
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: githubClientId,
                client_secret: githubClientSecret,
                code
            },
            {
                headers: {
                    Accept: 'application/json'
                }
            }
        );

        logger.info(`GitHub token response: ${JSON.stringify(tokenResponse.data)}`);

        if (!tokenResponse.data.access_token) {
            throw new Error('Failed to obtain access token from GitHub');
        }

        // Get user profile from GitHub
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `token ${tokenResponse.data.access_token}`
            }
        });

        logger.info(`GitHub user data received: ${JSON.stringify(userResponse.data)}`);

        // Get user email (might be private)
        const emailsResponse = await axios.get('https://api.github.com/user/emails', {
            headers: {
                Authorization: `token ${tokenResponse.data.access_token}`
            }
        });

        const primaryEmail = emailsResponse.data.find((email: any) => email.primary)?.email
            || emailsResponse.data[0]?.email;

        if (!primaryEmail) {
            throw new Error('No email address found in GitHub account');
        }

        // Check if user exists or create new user
        let user = await User.findOne({ githubId: userResponse.data.id });

        if (!user) {
            // Also check by email in case user already exists
            user = await User.findOne({ email: primaryEmail });

            if (user) {
                // Update existing user with GitHub ID
                user.githubId = userResponse.data.id.toString();
                await user.save();
            } else {
                // Create new user
                user = new User({
                    username: userResponse.data.login,
                    email: primaryEmail,
                    githubId: userResponse.data.id.toString(),
                    profileImage: userResponse.data.avatar_url
                });
                await user.save();
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        // Return token and user data
        return res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage
            }
        });

    } catch (error) {
        logger.error(`GitHub OAuth: Unhandled error: ${(error as Error).message}`);
        return res.status(500).json({ error: 'Authentication failed', details: (error as Error).message });
    }
};
