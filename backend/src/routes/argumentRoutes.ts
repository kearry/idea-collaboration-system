// routes/argumentRoutes.ts
import express from 'express';
import { validateRequest } from '../middleware/validation';
import { isAuthenticated } from '../middleware/auth';
import {
    createArgument,
    updateArgument,
    deleteArgument,
    voteOnArgument,
    getArgumentReplies
} from '../controllers/argumentController';
import {
    createArgumentSchema,
    updateArgumentSchema,
    voteSchema
} from '../validation/argumentSchemas';

const router = express.Router();

/**
 * @route   POST /api/arguments
 * @desc    Create a new argument
 * @access  Private
 */
router.post('/', isAuthenticated, validateRequest(createArgumentSchema), createArgument);

/**
 * @route   PUT /api/arguments/:id
 * @desc    Update an argument
 * @access  Private (author only)
 */
router.put('/:id', isAuthenticated, validateRequest(updateArgumentSchema), updateArgument);

/**
 * @route   DELETE /api/arguments/:id
 * @desc    Delete an argument
 * @access  Private (author or admin only)
 */
router.delete('/:id', isAuthenticated, deleteArgument);

/**
 * @route   POST /api/arguments/:id/vote
 * @desc    Vote on an argument
 * @access  Private
 */
router.post('/:id/vote', isAuthenticated, validateRequest(voteSchema), voteOnArgument);

/**
 * @route   GET /api/arguments/:id/replies
 * @desc    Get replies to an argument
 * @access  Public
 */
router.get('/:id/replies', getArgumentReplies);

export default router;