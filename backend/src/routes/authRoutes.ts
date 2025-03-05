import express from 'express';
import { validateRequest } from '../middleware/validation';
import {
    login,
    register,
    getCurrentUser,
    googleAuthCallback,
    githubAuthCallback,
    logout
} from '../controllers/authController';
import { loginSchema, registerSchema } from '../validation/authSchemas';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRequest(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', validateRequest(loginSchema), login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', isAuthenticated, getCurrentUser);

/**
 * @route   GET /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.get('/logout', isAuthenticated, logout);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', googleAuthCallback);

/**
 * @route   GET /api/auth/github/callback
 * @desc    GitHub OAuth callback
 * @access  Public
 */
router.get('/github/callback', githubAuthCallback);

/**
 * @route   GET /api/auth/test
 * @desc    Test route to verify API is reachable
 * @access  Public
 */
router.get('/test', (req, res) => {
    res.json({ status: 'API is working' });
});

export default router;