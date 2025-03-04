// controllers/argumentController.ts
import { Request, Response } from 'express';
import Argument from '../models/Argument';
import Debate from '../models/Debate';
import Vote from '../models/Vote';
import mongoose from 'mongoose';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { socketService } from '../services/socketService';

/**
 * Create a new argument or reply
 */
export const createArgument = async (req: Request, res: Response) => {
    const { debateId, content, type, parentId } = req.body;
    const userId = req.user?.id;

    // Verify debate exists
    const debate = await Debate.findById(debateId);
    if (!debate) {
        throw new NotFoundError('Debate not found');
    }

    // Verify parent argument if this is a reply
    if (parentId) {
        const parentArg = await Argument.findById(parentId);
        if (!parentArg) {
            throw new NotFoundError('Parent argument not found');
        }
        if (parentArg.debate.toString() !== debateId) {
            throw new BadRequestError('Parent argument does not belong to this debate');
        }
    }

    // Create the argument
    const argument = new Argument({
        debate: debateId,
        content,
        type,
        author: userId,
        parentId: parentId || null,
        votes: 0
    });

    await argument.save();

    // Populate author details
    await argument.populate('author', 'username profileImage');

    // Emit socket event for real-time updates
    socketService.emitToRoom(
        debateId,
        'new_argument',
        { argument: argument.toObject() }
    );

    res.status(201).json(argument);
};

/**
 * Update an argument
 */
export const updateArgument = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFoundError('Argument not found');
    }

    const argument = await Argument.findById(id);

    if (!argument) {
        throw new NotFoundError('Argument not found');
    }

    // Check if user is the author
    if (argument.author.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to update this argument');
    }

    // Update content
    argument.content = content;
    await argument.save();

    // Emit socket event
    socketService.emitToRoom(
        argument.debate.toString(),
        'update_argument',
        { id, data: { content } }
    );

    res.json(argument);
};

/**
 * Delete an argument
 */
export const deleteArgument = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFoundError('Argument not found');
    }

    const argument = await Argument.findById(id);

    if (!argument) {
        throw new NotFoundError('Argument not found');
    }

    // Check if user is the author or an admin
    if (argument.author.toString() !== userId && !isAdmin) {
        throw new ForbiddenError('You are not authorized to delete this argument');
    }

    const debateId = argument.debate.toString();

    // If this is a parent argument, delete all replies
    if (!argument.parentId) {
        await Argument.deleteMany({ parentId: id });
    }

    // Delete the argument
    await argument.deleteOne();

    // Delete associated votes
    await Vote.deleteMany({ argument: id });

    // Emit socket event
    socketService.emitToRoom(
        debateId,
        'delete_argument',
        { id }
    );

    res.status(200).json({ message: 'Argument deleted successfully' });
};

/**
 * Vote on an argument
 */
export const voteOnArgument = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { value } = req.body; // 1 for upvote, -1 for downvote, 0 to remove vote
    const userId = req.user?.id;

    if (![-1, 0, 1].includes(value)) {
        throw new BadRequestError('Invalid vote value');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFoundError('Argument not found');
    }

    const argument = await Argument.findById(id);

    if (!argument) {
        throw new NotFoundError('Argument not found');
    }

    // Find existing vote
    const existingVote = await Vote.findOne({
        argument: id,
        user: userId
    });

    // Calculate vote difference
    let voteDelta = value;

    if (existingVote) {
        // Remove the effect of the previous vote
        voteDelta -= existingVote.value;

        if (value === 0) {
            // Remove vote
            await existingVote.deleteOne();
        } else {
            // Update vote
            existingVote.value = value;
            await existingVote.save();
        }
    } else if (value !== 0) {
        // Create new vote
        const vote = new Vote({
            argument: id,
            user: userId,
            value
        });
        await vote.save();
    }

    // Update argument vote count
    if (voteDelta !== 0) {
        argument.votes += voteDelta;
        await argument.save();

        // Emit socket event
        socketService.emitToRoom(
            argument.debate.toString(),
            'update_argument',
            { id, data: { votes: argument.votes } }
        );
    }

    res.json({
        votes: argument.votes,
        userVote: value
    });
};

/**
 * Get replies to an argument
 */
export const getArgumentReplies = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new NotFoundError('Argument not found');
    }

    const replies = await Argument.find({ parentId: id })
        .sort({ createdAt: 1 })
        .populate('author', 'username profileImage');

    res.json(replies);
};
