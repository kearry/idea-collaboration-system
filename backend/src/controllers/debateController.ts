import { Request, Response } from 'express';
import Debate from '../models/Debate';
import Argument from '../models/Argument';
import mongoose, { Types } from 'mongoose';
import { NotFoundError, ForbiddenError } from '../utils/errors';

// Helper function for recursive replies
const getRepliesRecursive = async (parentId: Types.ObjectId): Promise<any[]> => {
    const replies = await Argument.find({ parentId })
        .sort({ createdAt: 1 })
        .populate('author', 'username profileImage');

    const repliesWithNested = await Promise.all(replies.map(async (reply) => {
        const nestedReplies = await getRepliesRecursive(reply._id);
        return {
            ...reply.toObject(),
            id: reply._id.toString(),
            replies: nestedReplies,
        };
    }));

    return repliesWithNested;
};

/**
 * Get debates with pagination and filtering
 */
export const getDebates = async (req: Request, res: Response) => {
    const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortDirection = 'desc',
        search = '',
        status
    } = req.query;

    // Build query
    const query: any = {};

    if (search) {
        query.$or = [
            { topic: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    if (status) {
        query.status = status;
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);

    const debates = await Debate.find(query)
        .sort({ [sortBy as string]: sortDirection === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('creator', 'username profileImage');

    const total = await Debate.countDocuments(query);

    res.json({
        debates: debates.map(debate => ({
            ...debate.toObject(),
            id: debate._id.toString()
        })),
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            limit: Number(limit)
        }
    });
};

/**
 * Get a single debate by ID with basic argument stats
 */
export const getDebateById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFoundError('Debate not found');
    }

    const debate = await Debate.findById(id)
        .populate('creator', 'username profileImage');

    if (!debate) {
        throw new NotFoundError('Debate not found');
    }

    // Get argument counts
    const [proCount, conCount, replyCount] = await Promise.all([
        Argument.countDocuments({ debate: id, type: 'pro', parentId: null }),
        Argument.countDocuments({ debate: id, type: 'con', parentId: null }),
        Argument.countDocuments({ debate: id, parentId: { $ne: null } })
    ]);

    res.json({
        debate,
        stats: {
            proCount,
            conCount,
            replyCount
        }
    });
};

/**
 * Get all arguments for a debate
 */
export const getDebateArguments = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { sortBy = 'votes', sortDirection = 'desc' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFoundError('Debate not found');
    }

    // Get top-level arguments
    const debateArguments = await Argument.find({
        debate: id,
        parentId: null
    })
        .sort({ [sortBy as string]: sortDirection === 'asc' ? 1 : -1 })
        .populate('author', 'username profileImage');

    // Get replies for each argument
    const argumentsWithReplies = await Promise.all(
        debateArguments.map(async (arg) => {
            const replies = await getRepliesRecursive(arg._id);
            return {
                ...arg.toObject(),
                id: arg._id.toString(),
                replies
            };
        })
    );

    res.json(argumentsWithReplies);
};

/**
 * Create a new debate
 */
export const createDebate = async (req: Request, res: Response) => {
    const { topic, description } = req.body;
    const userId = req.user?.id;

    const debate = new Debate({
        topic,
        description,
        creator: userId,
        status: 'active'
    });

    await debate.save();

    res.status(201).json(debate);
};

/**
 * Update a debate
 */
export const updateDebate = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { topic, description, status } = req.body;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFoundError('Debate not found');
    }

    const debate = await Debate.findById(id);

    if (!debate) {
        throw new NotFoundError('Debate not found');
    }

    // Check if user is the creator
    if (debate.creator.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to update this debate');
    }

    // Update fields
    if (topic) debate.topic = topic;
    if (description) debate.description = description;
    if (status) debate.status = status;

    await debate.save();

    res.json(debate);
};

/**
 * Delete a debate
 */
export const deleteDebate = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFoundError('Debate not found');
    }

    const debate = await Debate.findById(id);

    if (!debate) {
        throw new NotFoundError('Debate not found');
    }

    // Check if user is the creator or an admin
    if (debate.creator.toString() !== userId && !isAdmin) {
        throw new ForbiddenError('You are not authorized to delete this debate');
    }

    // Delete all associated arguments
    await Argument.deleteMany({ debate: id });

    // Delete the debate
    await debate.deleteOne();

    res.status(200).json({ message: 'Debate deleted successfully' });
};