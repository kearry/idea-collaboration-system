import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { BadRequestError } from '../utils/errors';

export const validateRequest = (schema: { [key: string]: AnyZodObject }) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validationPromises: Promise<void>[] = [];

            for (const [key, validator] of Object.entries(schema)) {
                if (key === 'body' && req.body) {
                    validationPromises.push(
                        validator.parseAsync(req.body)
                            .then(validatedData => {
                                req.body = validatedData;
                            })
                            .then()
                    );
                } else if (key === 'query' && req.query) {
                    validationPromises.push(
                        validator.parseAsync(req.query)
                            .then(validatedData => {
                                // Need to use type assertion since req.query is read-only
                                req.query = validatedData as typeof req.query;
                            })
                            .then()
                    );
                } else if (key === 'params' && req.params) {
                    validationPromises.push(
                        validator.parseAsync(req.params)
                            .then(validatedData => {
                                // Need to use type assertion since req.params is read-only
                                req.params = validatedData as typeof req.params;
                            })
                            .then()
                    );
                }
            }

            await Promise.all(validationPromises);
            next();
        } catch (error: any) {
            if (error.errors) {
                const formattedErrors = error.errors.map((err: any) => ({
                    path: err.path.join('.'),
                    message: err.message
                }));
                next(new BadRequestError('Validation error', formattedErrors));
            } else {
                next(error);
            }
        }
    };
};