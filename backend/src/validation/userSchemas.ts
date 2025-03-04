import { z } from 'zod';

export const updateProfileSchema = {
    body: z.object({
        username: z.string()
            .min(3, 'Username must be at least 3 characters')
            .max(30, 'Username cannot exceed 30 characters')
            .optional(),
        bio: z.string()
            .max(500, 'Bio cannot exceed 500 characters')
            .optional()
            .nullable(),
        profileImage: z.string()
            .url('Profile image must be a valid URL')
            .optional()
    })
};