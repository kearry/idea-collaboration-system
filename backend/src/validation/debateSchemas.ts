import { z } from 'zod';
import mongoose from 'mongoose'; // Added mongoose import

export const createDebateSchema = {
    body: z.object({
        topic: z.string()
            .min(5, 'Topic must be at least 5 characters')
            .max(200, 'Topic cannot exceed 200 characters'),
        description: z.string()
            .min(10, 'Description must be at least 10 characters')
            .max(2000, 'Description cannot exceed 2000 characters')
    })
};

export const updateDebateSchema = {
    body: z.object({
        topic: z.string()
            .min(5, 'Topic must be at least 5 characters')
            .max(200, 'Topic cannot exceed 200 characters')
            .optional(),
        description: z.string()
            .min(10, 'Description must be at least 10 characters')
            .max(2000, 'Description cannot exceed 2000 characters')
            .optional(),
        status: z.enum(['active', 'closed']).optional()
    }),
    params: z.object({
        id: z.string().refine(val => {
            try {
                return new mongoose.Types.ObjectId(val);
            } catch {
                return false;
            }
        }, 'Invalid ID format')
    })
};

export const getDebatesSchema = {
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        sortBy: z.enum(['createdAt', 'updatedAt', 'topic']).optional(),
        sortDirection: z.enum(['asc', 'desc']).optional(),
        search: z.string().optional(),
        status: z.enum(['active', 'closed']).optional()
    })
};