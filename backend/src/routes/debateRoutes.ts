// routes/debateRoutes.ts
import express from 'express';
import { validateRequest } from '../middleware/validation';
import { isAuthenticated } from '../middleware/auth';
import {
    getDebates,
    getDebateById,
    createDebate,
    updateDebate,
    deleteDebate,
    getDebateArguments
} from '../controllers/debateController';
import {
    createDebateSchema,
    updateDebateSchema,
    getDebatesSchema
} from '../validation/debateSchemas';

const router = express.Router();

/**
 * @route   GET /api/debates
 * @desc    Get all debates with pagination and filtering
 * @access  Public
 */
router.get('/', validateRequest(getDebatesSchema), getDebates);

/**
 * @route   GET /api/debates/:id
 * @desc    Get a single debate by ID
 * @access  Public
 */
router.get('/:id', getDebateById);

/**
 * @route   GET /api/debates/:id/arguments
 * @desc    Get all arguments for a debate
 * @access  Public
 */
router.get('/:id/arguments', getDebateArguments);

/**
 * @route   POST /api/debates
 * @desc    Create a new debate
 * @access  Private
 */
router.post('/', isAuthenticated, validateRequest(createDebateSchema), createDebate);

/**
 * @route   PUT /api/debates/:id
 * @desc    Update a debate
 * @access  Private (creator only)
 */
router.put('/:id', isAuthenticated, validateRequest(updateDebateSchema), updateDebate);

/**
 * @route   DELETE /api/debates/:id
 * @desc    Delete a debate
 * @access  Private (creator or admin only)
 */
router.delete('/:id', isAuthenticated, deleteDebate);

export default router;