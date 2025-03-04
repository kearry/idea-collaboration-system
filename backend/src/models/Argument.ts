

// models/Argument.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ArgumentDocument extends Document {
    debate: mongoose.Types.ObjectId;
    content: string;
    type: 'pro' | 'con';
    author: mongoose.Types.ObjectId;
    parentId?: mongoose.Types.ObjectId;
    votes: number;
    createdAt: Date;
    updatedAt: Date;
}

const ArgumentSchema: Schema = new Schema({
    debate: {
        type: Schema.Types.ObjectId,
        ref: 'Debate',
        required: true
    },
    content: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 1000,
        trim: true
    },
    type: {
        type: String,
        enum: ['pro', 'con'],
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    parentId: {
        type: Schema.Types.ObjectId,
        ref: 'Argument',
        default: null
    },
    votes: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Create compound indexes for efficient querying
ArgumentSchema.index({ debate: 1, type: 1 }); // Find all pro/con args for debate
ArgumentSchema.index({ debate: 1, parentId: 1 }); // Find top-level arguments or replies
ArgumentSchema.index({ debate: 1, votes: -1 }); // Sort by votes
ArgumentSchema.index({ parentId: 1 }); // Find replies to an argument
ArgumentSchema.index({ author: 1 }); // Find arguments by user

export default mongoose.model<ArgumentDocument>('Argument', ArgumentSchema);