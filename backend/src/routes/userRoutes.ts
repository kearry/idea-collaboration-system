import express from 'express';
import { validateRequest } from '../middleware/validation';
import { isAuthenticated } from '../middleware/auth';
import {
    getUserProfile,
    updateUserProfile,
    getUserDebates,
    getUserArguments
} from '../controllers/userController';
import { updateProfileSchema } from '../validation/userSchemas';

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', isAuthenticated, getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
    '/profile',
    isAuthenticated,
    validateRequest(updateProfileSchema),
    updateUserProfile
);

/**
 * @route   GET /api/users/debates
 * @desc    Get debates created by user
 * @access  Private
 */
router.get('/debates', isAuthenticated, getUserDebates);

/**
 * @route   GET /api/users/arguments
 * @desc    Get arguments created by user
 * @access  Private
 */
router.get('/arguments', isAuthenticated, getUserArguments);

export default router;