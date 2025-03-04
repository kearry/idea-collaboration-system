// migrations/migrationRunner.ts
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Model for tracking migrations
interface MigrationDocument extends mongoose.Document {
    name: string;
    appliedAt: Date;
}

const MigrationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now }
});

const Migration = mongoose.model<MigrationDocument>('Migration', MigrationSchema);

// Function to run migrations
export const runMigrations = async () => {
    logger.info('Running database migrations...');

    // Get all migration files
    const migrationsDir = path.join(__dirname, './scripts');
    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
        .sort(); // Execute in alphabetical order

    // Find which migrations have already been applied
    const appliedMigrations = await Migration.find().select('name');
    const appliedMigrationNames = new Set(appliedMigrations.map(m => m.name));

    // Run pending migrations
    for (const file of migrationFiles) {
        if (!appliedMigrationNames.has(file)) {
            logger.info(`Applying migration: ${file}`);

            try {
                // Import and execute migration script
                const { up } = require(path.join(migrationsDir, file));
                await up();

                // Record successful migration
                await Migration.create({ name: file });

                logger.info(`Migration ${file} applied successfully`);
            } catch (error) {
                logger.error(`Migration ${file} failed: ${error}`);
                throw error; // Stop migration process
            }
        }
    }

    logger.info('All migrations completed successfully');
};
