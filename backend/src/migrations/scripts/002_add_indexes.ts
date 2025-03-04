// migrations/scripts/002_add_indexes.ts
import mongoose from 'mongoose';
export const up = async () => {
    const db = mongoose.connection.db;

    // Create additional indexes that aren't defined in the schema
    await db.collection('debates').createIndex({ 'createdAt': -1, 'status': 1 });
    await db.collection('arguments').createIndex({ 'createdAt': -1, 'type': 1 });
};