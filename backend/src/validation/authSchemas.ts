import { z } from 'zod';

export const registerSchema = {
    body: z.object({
        username: z.string()
            .min(3, 'Username must be at least 3 characters')
            .max(30, 'Username cannot exceed 30 characters'),
        email: z.string()
            .email('Invalid email address'),
        password: z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
    })
};

export const loginSchema = {
    body: z.object({
        email: z.string()
            .email('Invalid email address'),
        password: z.string()
            .min(1, 'Password is required')
    })
};