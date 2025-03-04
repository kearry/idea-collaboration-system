// middleware/socket.ts
// For use in regular HTTP routes to access socket functionality
import { Request, Response, NextFunction } from 'express';
import { socketService } from '../services/socketService';

// Attach socket service to request object
export const attachSocketService = (req: Request, res: Response, next: NextFunction) => {
    req.socketService = socketService;
    next();
};

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            socketService: typeof socketService;
        }
    }
}
