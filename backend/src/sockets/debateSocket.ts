import { Server, Socket } from 'socket.io';
import Debate from '../models/Debate';
import Argument from '../models/Argument';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { socketService } from '../services/socketService';

// Define a type for the populated author
interface PopulatedAuthor {
    _id: mongoose.Types.ObjectId;
    username: string;
    profileImage?: string;
}

export const setupDebateHandlers = (io: Server, socket: Socket) => {
    // Track currently active room (debate ID)
    let currentDebateRoom: string | null = null;

    // Join a debate room
    socket.on('join_debate', async ({ debateId }) => {
        if (!socket.user) {
            socket.emit('error', { message: 'Authentication required' });
            return;
        }

        try {
            // Validate debate exists
            if (!mongoose.Types.ObjectId.isValid(debateId)) {
                socket.emit('error', { message: 'Invalid debate ID' });
                return;
            }

            const debate = await Debate.findById(debateId);
            if (!debate) {
                socket.emit('error', { message: 'Debate not found' });
                return;
            }

            // Leave previous room if any
            if (currentDebateRoom) {
                socket.leave(currentDebateRoom);
                socket.to(currentDebateRoom).emit('user_left', {
                    userId: socket.user.id,
                    username: socket.user.username
                });
            }

            // Join new debate room
            socket.join(debateId);
            currentDebateRoom = debateId;

            logger.debug(`User ${socket.user.username} joined debate ${debateId}`);

            // Notify other users in the room
            socket.to(debateId).emit('user_joined', {
                userId: socket.user.id,
                username: socket.user.username
            });

            // Get list of users in the room
            const sockets = await io.in(debateId).fetchSockets();
            const usersInRoom = sockets
                .filter(s => s.data && s.data.user)
                .map(s => ({
                    userId: s.data.user.id,
                    username: s.data.user.username
                }));

            // Send active users list to the joined user
            socket.emit('active_users', { users: usersInRoom });
        } catch (error) {
            logger.error(`Error joining debate: ${error}`);
            socket.emit('error', { message: 'Failed to join debate' });
        }
    });

    // Add a new argument
    socket.on('new_argument', async ({ debateId, argument }) => {
        if (!socket.user) {
            socket.emit('error', { message: 'Authentication required' });
            return;
        }

        try {
            // Validate required fields
            if (!debateId || !argument.content || !argument.type) {
                socket.emit('error', { message: 'Missing required fields' });
                return;
            }

            // Validate debateId
            if (!mongoose.Types.ObjectId.isValid(debateId)) {
                socket.emit('error', { message: 'Invalid debate ID' });
                return;
            }

            // Validate parentId if provided
            if (argument.parentId && !mongoose.Types.ObjectId.isValid(argument.parentId)) {
                socket.emit('error', { message: 'Invalid parent argument ID' });
                return;
            }

            // Create the argument in the database
            const newArgument = new Argument({
                debate: debateId,
                content: argument.content,
                type: argument.type,
                author: socket.user.id,
                parentId: argument.parentId || null
            });

            await newArgument.save();

            // Populate author details
            await newArgument.populate({
                path: 'author',
                select: 'username profileImage'
            });

            // Format the response
            const formattedArgument = {
                id: newArgument._id,
                content: newArgument.content,
                type: newArgument.type,
                author: {
                    id: (newArgument.author as unknown as PopulatedAuthor)._id,
                    username: (newArgument.author as unknown as PopulatedAuthor).username,
                    profileImage: (newArgument.author as unknown as PopulatedAuthor).profileImage
                },
                parentId: newArgument.parentId,
                votes: 0,
                createdAt: newArgument.createdAt
            };

            // Broadcast to all users in the debate room including sender
            io.to(debateId).emit('new_argument', {
                argument: formattedArgument
            });

            logger.debug(`New argument created in debate ${debateId} by ${socket.user.username}`);
        } catch (error) {
            logger.error(`Error creating argument: ${error}`);
            socket.emit('error', { message: 'Failed to create argument' });
        }
    });

    // Vote on an argument
    socket.on('vote_argument', async ({ debateId, argumentId, value }) => {
        if (!socket.user) {
            socket.emit('error', { message: 'Authentication required' });
            return;
        }

        try {
            // Validate inputs
            if (!argumentId || ![1, -1, 0].includes(value)) {
                socket.emit('error', { message: 'Invalid input' });
                return;
            }

            // Process vote via socket service
            const result = await socketService.processVote(
                socket.user.id,
                argumentId,
                value
            );

            if (result) {
                // Broadcast vote update to all users in the debate room
                io.to(debateId).emit('update_argument', {
                    id: argumentId,
                    data: { votes: result.newVoteCount }
                });

                logger.debug(`Vote processed on argument ${argumentId} by ${socket.user.username}`);
            }
        } catch (error) {
            logger.error(`Error voting on argument: ${error}`);
            socket.emit('error', { message: 'Failed to process vote' });
        }
    });

    // User typing indicator
    socket.on('typing_start', ({ debateId }) => {
        if (!socket.user || !debateId) return;

        socket.to(debateId).emit('user_typing', {
            userId: socket.user.id,
            username: socket.user.username
        });
    });

    socket.on('typing_end', ({ debateId }) => {
        if (!socket.user || !debateId) return;

        socket.to(debateId).emit('user_stopped_typing', {
            userId: socket.user.id
        });
    });

    // Leave debate
    socket.on('leave_debate', ({ debateId }) => {
        if (!socket.user || !debateId) return;

        socket.leave(debateId);
        if (currentDebateRoom === debateId) {
            currentDebateRoom = null;
        }

        socket.to(debateId).emit('user_left', {
            userId: socket.user.id,
            username: socket.user.username
        });

        logger.debug(`User ${socket.user.username} left debate ${debateId}`);
    });

    // Handle disconnect to clean up rooms
    socket.on('disconnect', () => {
        if (currentDebateRoom && socket.user) {
            socket.to(currentDebateRoom).emit('user_left', {
                userId: socket.user.id,
                username: socket.user.username
            });

            logger.debug(`User ${socket.user.username} disconnected from debate ${currentDebateRoom}`);
        }
    });
};