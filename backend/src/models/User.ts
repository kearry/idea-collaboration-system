// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

export interface UserDocument extends Document {
    username: string;
    email: string;
    password?: string;
    profileImage?: string;
    bio?: string;
    role: 'user' | 'moderator' | 'admin';
    googleId?: string;
    githubId?: string;
    debates: mongoose.Types.ObjectId[];
    arguments: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        select: false, // Don't return password by default
        minlength: 8,
    },
    profileImage: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        maxlength: 500
    },
    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user'
    },
    googleId: {
        type: String,
        sparse: true,  // Allows null values but enforces uniqueness for non-null
    },
    githubId: {
        type: String,
        sparse: true,
    },
    debates: [{
        type: Schema.Types.ObjectId,
        ref: 'Debate'
    }],
    arguments: [{
        type: Schema.Types.ObjectId,
        ref: 'Argument'
    }],
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
    const user = this;

    // Only hash the password if it's modified or new
    if (!user.isModified('password')) return next();

    try {
        // Generate salt and hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(user.password.trim(), salt);

        // Replace plaintext password with hash
        user.password = hash;
        logger.info(`Password hash generated: ${hash}`);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    try {
        // Use bcrypt to compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        logger.info(`Password comparison result: ${isMatch}`);
        return isMatch;
    } catch (error) {
        throw error;
    }
};

// Create indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ githubId: 1 });

export default mongoose.model<UserDocument>('User', UserSchema);
