import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import User from '../models/User';
import Debate from '../models/Debate';
import Argument from '../models/Argument';
import connectDB from './../config/database'; // Import database connection
import Vote from '../models/Vote';

// Define interfaces for vote creation
interface VoteData {
    argument: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    value: number;
}

export const seedDatabase = async () => {
    if (process.env.NODE_ENV === 'production') {
        logger.warn('Seed function called in production environment. Aborting...');
        return;
    }

    try {
        logger.info('Connecting to database...');
        await connectDB(); // Await database connection
        logger.info('Database connected');

        logger.info('Starting database seed...');

        // Clear existing data
        await mongoose.connection.db.dropDatabase();
        logger.info('Database cleared');

        // Create sample users
        const users = await User.create([
            {
                username: 'admin',
                email: 'admin@example.com',
                password: await bcrypt.hash('admin123'.trim(), 10),
                role: 'admin',
                profileImage: 'https://ui-avatars.com/api/?name=A&background=4f46e5&color=fff'
            },
            {
                username: 'alex',
                email: 'alex@example.com',
                password: await bcrypt.hash('alex123'.trim(), 10),
                role: 'user',
                profileImage: 'https://ui-avatars.com/api/?name=AC&background=10b981&color=fff'
            },
            {
                username: 'jordan',
                email: 'jordan@example.com',
                password: await bcrypt.hash('jordan123'.trim(), 10),
                role: 'user',
                profileImage: 'https://ui-avatars.com/api/?name=JL&background=ef4444&color=fff'
            },
            {
                username: 'taylor',
                email: 'taylor@example.com',
                password: await bcrypt.hash('taylor123'.trim(), 10),
                role: 'user',
                profileImage: 'https://ui-avatars.com/api/?name=TW&background=f59e0b&color=fff'
            }
        ]);

        // Create sample debates
        const debates = await Debate.create([
            {
                topic: 'Should remote work become the standard for all office jobs?',
                description: 'With the rise of remote work during the pandemic, many companies have seen that it can be effective. Should this become the new standard for all office-based roles?',
                creator: users[0]._id,
                status: 'active'
            },
            {
                topic: 'Is artificial intelligence a threat to humanity?',
                description: 'As AI advances, concerns about its impact on society and potential risks continue to grow. Is AI development fundamentally dangerous to humanity?',
                creator: users[1]._id,
                status: 'active'
            },
            {
                topic: 'Should cryptocurrency be more regulated?',
                description: 'Cryptocurrencies offer financial freedom but also potential for abuse. What level of regulation is appropriate?',
                creator: users[2]._id,
                status: 'active'
            }
        ]);

        // Create sample arguments for first debate
        const debateOneArguments = await Argument.create([
            {
                debate: debates[0]._id,
                content: 'Increases employee productivity by eliminating commute time.',
                type: 'pro',
                author: users[1]._id,
                votes: 0
            },
            {
                debate: debates[0]._id,
                content: 'Reduces team cohesion and spontaneous collaboration.',
                type: 'con',
                author: users[2]._id,
                votes: 0
            },
            {
                debate: debates[0]._id,
                content: 'Significantly reduces company overhead costs for office space.',
                type: 'pro',
                author: users[3]._id,
                votes: 0
            },
            {
                debate: debates[0]._id,
                content: 'Creates two-tier workplace system between remote and on-site employees.',
                type: 'con',
                author: users[0]._id,
                votes: 0
            }
        ]);

        // Create replies
        await Argument.create([
            {
                debate: debates[0]._id,
                content: 'But only for employees who have a proper home office setup.',
                type: 'con',
                author: users[3]._id,
                parentId: debateOneArguments[0]._id,
                votes: 0
            },
            {
                debate: debates[0]._id,
                content: 'Studies show overall productivity increased during pandemic remote work.',
                type: 'pro',
                author: users[0]._id,
                parentId: debateOneArguments[0]._id,
                votes: 0
            },
            {
                debate: debates[0]._id,
                content: 'Modern collaboration tools can mitigate most of these issues.',
                type: 'pro',
                author: users[3]._id,
                parentId: debateOneArguments[1]._id,
                votes: 0
            }
        ]);

        // Create sample votes for each argument
        for (const argument of debateOneArguments) {
            // Each argument gets 5-15 random votes
            const voteCount = Math.floor(Math.random() * 10) + 5;
            const votes: VoteData[] = []; // Explicitly type the votes array

            for (let i = 0; i < voteCount; i++) {
                // Select random user
                const randomUser = users[Math.floor(Math.random() * users.length)];

                // Random value (1 or -1)
                const value = Math.random() > 0.3 ? 1 : -1;

                // Only create vote if this user hasn't voted on this argument yet
                const existingVote = votes.find(v =>
                    v.user.toString() === randomUser._id.toString() &&
                    v.argument.toString() === argument._id.toString()
                );

                if (!existingVote) {
                    votes.push({
                        argument: argument._id,
                        user: randomUser._id,
                        value
                    });
                }
            }

            await Vote.create(votes);

            // Update argument vote count
            const totalVotes = votes.reduce((sum, vote) => sum + vote.value, 0);
            await Argument.findByIdAndUpdate(argument._id, { votes: totalVotes });
        }

        logger.info('Database seeded successfully');
    } catch (error) {
        logger.error(`Seed failed: ${error}`);
        throw error;
    } finally {
        await mongoose.disconnect();
        logger.info('Mongoose connection closed');
    }
};

seedDatabase();
