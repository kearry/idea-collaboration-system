// models/Activity.ts - For tracking user activity
import mongoose, { Schema, Document } from 'mongoose';

export interface ActivityDocument extends Document {
    user: mongoose.Types.ObjectId;
    type: 'view_debate' | 'create_debate' | 'create_argument' | 'vote' | 'reply';
    debate?: mongoose.Types.ObjectId;
    argument?: mongoose.Types.ObjectId;
    metadata?: Record<string, any>;
    createdAt: Date;
}

const ActivitySchema: Schema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['view_debate', 'create_debate', 'create_argument', 'vote', 'reply'],
        required: true
    },
    debate: {
        type: Schema.Types.ObjectId,
        ref: 'Debate'
    },
    argument: {
        type: Schema.Types.ObjectId,
        ref: 'Argument'
    },
    metadata: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: {
        createdAt: true,
        updatedAt: false
    }
});

// Create indexes for activity analysis
ActivitySchema.index({ user: 1, createdAt: -1 }); // User activity timeline
ActivitySchema.index({ type: 1, createdAt: -1 }); // Activity types over time
ActivitySchema.index({ debate: 1, createdAt: -1 }); // Activity on specific debate

export default mongoose.model<ActivityDocument>('Activity', ActivitySchema);
