// models/Debate.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface DebateDocument extends Document {
    topic: string;
    description: string;
    creator: mongoose.Types.ObjectId;
    status: 'active' | 'closed';
    viewCount: number;
    participantCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const DebateSchema: Schema = new Schema({
    topic: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 200,
        trim: true
    },
    description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 2000,
        trim: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active'
    },
    viewCount: {
        type: Number,
        default: 0
    },
    participantCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Create indexes for efficient querying
DebateSchema.index({ creator: 1 });
DebateSchema.index({ status: 1 });
DebateSchema.index({ createdAt: -1 }); // For sorting by newest
DebateSchema.index({ topic: 'text', description: 'text' }); // For text search

export default mongoose.model<DebateDocument>('Debate', DebateSchema);
