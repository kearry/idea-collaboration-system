// migrations/scripts/003_data_transformation.ts - Example of data transformation
import mongoose from 'mongoose';
export const up = async () => {
    const db = mongoose.connection.db;

    // Example: Add default profile images for users who don't have one
    await db.collection('users').updateMany(
        { profileImage: { $in: [null, '', undefined] } },
        { $set: { profileImage: 'https://ui-avatars.com/api/?background=random' } }
    );

    // Example: Update argument types from old to new format
    await db.collection('arguments').updateMany(
        { type: 'supporting' },
        { $set: { type: 'pro' } }
    );

    await db.collection('arguments').updateMany(
        { type: 'opposing' },
        { $set: { type: 'con' } }
    );
};