
// validation/argumentSchemas.ts
import { z } from 'zod';
import mongoose from 'mongoose'; // Added mongoose import


export const createArgumentSchema = {
    body: z.object({
        debateId: z.string().refine(val => {
            try {
                return new mongoose.Types.ObjectId(val);
            } catch {
                return false;
            }
        }, 'Invalid debate ID format'),
        content: z.string()
            .min(10, 'Argument must be at least 10 characters')
            .max(1000, 'Argument cannot exceed 1000 characters'),
        type: z.enum(['pro', 'con']),
        parentId: z.string().refine(val => {
            if (!val) return true; // Optional field
            try {
                return new mongoose.Types.ObjectId(val);
            } catch {
                return false;
            }
        }, 'Invalid parent argument ID format').optional()
    })
};

export const updateArgumentSchema = {
    body: z.object({
        content: z.string()
            .min(10, 'Argument must be at least 10 characters')
            .max(1000, 'Argument cannot exceed 1000 characters')
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

export const voteSchema = {
    body: z.object({
        value: z.number().refine(val => [-1, 0, 1].includes(val), {
            message: 'Vote value must be -1, 0, or 1'
        })
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
