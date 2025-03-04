import { Request, Response } from 'express';
import User from '../models/User';
import Debate from '../models/Debate';
import Argument from '../models/Argument';
import { NotFoundError } from '../utils/errors';

/**
 * Get user profile
 */
export const getUserProfile = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const user = await User.findById(userId).select('-password');

    if (!user) {
        throw new NotFoundError('User not found');
    }

    res.json(user);
};

/**
 * Update user profile
 */
export const updateUserProfile = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { username, bio, profileImage } = req.body;

    const user = await User.findById(userId);

    if (!user) {
        throw new NotFoundError('User not found');
    }

    // Update fields
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    res.json(user);
};

/**
 * Get debates created by user
 */
export const getUserDebates = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;

    const debates = await Debate.find({ creator: userId })
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('creator', 'username profileImage');

    const total = await Debate.countDocuments({ creator: userId });

    res.json({
        debates,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            limit: Number(limit)
        }
    });
};

/**
 * Get arguments created by user
 */
export const getUserArguments = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;

    const userArguments = await Argument.find({ author: userId })
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('debate', 'topic')
        .populate('author', 'username profileImage');

    const total = await Argument.countDocuments({ author: userId });

    res.json({
        userArguments,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            limit: Number(limit)
        }
    });
};