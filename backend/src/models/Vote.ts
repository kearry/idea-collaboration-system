// models/Vote.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface VoteDocument extends Document {
    argument: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    value: number; // 1 for upvote, -1 for downvote
    createdAt: Date;
    updatedAt: Date;
}

const VoteSchema: Schema = new Schema({
    argument: {
        type: Schema.Types.ObjectId,
        ref: 'Argument',
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    value: {
        type: Number,
        enum: [-1, 1],
        required: true
    }
}, { timestamps: true });

// Create compound index for unique votes per user per argument
VoteSchema.index({ argument: 1, user: 1 }, { unique: true });

export default mongoose.model<VoteDocument>('Vote', VoteSchema);