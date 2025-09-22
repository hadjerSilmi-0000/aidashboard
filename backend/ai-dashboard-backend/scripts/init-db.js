#!/usr/bin/env node

/**
 * Database Initialization Script
 * 
 * This script initializes the database with proper indexes,
 * default data, and validates the setup.
 * 
 * Usage:
 *   node scripts/init-db.js init    - Initialize database
 *   node scripts/init-db.js reset   - Reset database (dev only)
 *   node scripts/init-db.js health  - Check database health
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const configManager = require('../src/config');
const logger = require('../src/utils/logger');

// Import models to register schemas
const User = require('../src/models/User');
const Session = require('../src/models/Session');
// const File = require('../src/models/File');
// const DataPoint = require('../src/models/DataPoint');
// const Insight = require('../src/models/Insight');
// const Notification = require('../src/models/Notification');

class DatabaseInitializer {
    constructor() {
        this.requiredCollections = [
            'users',
            'sessions'
            // Add other collections as you create the models
            // 'files',
            // 'datapoints',
            // 'insights',
            // 'notifications'
        ];
    }

    async initialize() {
        try {
            console.log('🚀 Starting database initialization...');

            // Connect to databases
            await configManager.initialize();

            // Create indexes
            await this.createIndexes();

            // Create default data
            await this.createDefaultData();

            // Setup TTL indexes
            await this.setupTTLIndexes();

            // Validate setup
            await this.validateSetup();

            console.log('✅ Database initialization completed successfully');
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            throw error;
        }
    }

    async createIndexes() {
        try {
            console.log('📊 Creating database indexes...');

            // Get all registered models
            const models = mongoose.models;
            let indexCount = 0;

            for (const [modelName, model] of Object.entries(models)) {
                try {
                    console.log(`   Creating indexes for ${modelName}...`);
                    await model.createIndexes();
                    indexCount++;
                    console.log(`   ✓ Indexes created for ${modelName}`);
                } catch (error) {
                    console.warn(`   ⚠ Failed to create indexes for ${modelName}:`, error.message);
                }
            }

            console.log(`📊 Index creation completed (${indexCount} models processed)`);
        } catch (error) {
            console.error('❌ Failed to create indexes:', error.message);
            throw error;
        }
    }

    async createDefaultData() {
        try {
            console.log('👤 Creating default data...');

            // Create admin user if not exists
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

            const adminExists = await User.findOne({ email: adminEmail });

            if (!adminExists) {
                const adminUser = new User({
                    email: adminEmail,
                    password: adminPassword,
                    role: 'admin',
                    status: 'active',
                    profile: {
                        firstName: 'System',
                        lastName: 'Administrator'
                    },
                    permissions: ['all'],
                    emailVerified: true
                });

                await adminUser.save();
                console.log(`   ✓ Default admin user created: ${adminEmail}`);
            } else {
                console.log(`   ✓ Admin user already exists: ${adminEmail}`);
            }

            console.log('👤 Default data creation completed');
        } catch (error) {
            console.error('❌ Failed to create default data:', error.message);
            throw error;
        }
    }

    async setupTTLIndexes() {
        try {
            console.log('⏰ Setting up TTL indexes...');

            const db = mongoose.connection.db;
            let ttlCount = 0;

            // Sessions TTL index (handled by schema automatically)
            console.log('   ✓ Sessions TTL index (managed by schema)');

            // Setup additional TTL indexes as you add models
            try {
                // Example: Cleanup old notifications (30 days)
                // Uncomment when you create the Notification model
                /*
                await db.collection('notifications').createIndex(
                  { createdAt: 1 },
                  { expireAfterSeconds: 30 * 24 * 60 * 60 }
                );
                ttlCount++;
                console.log('   ✓ Notifications TTL index created (30 days)');
                */

                // Example: Cleanup old file processing logs (7 days)
                // Uncomment when you create the File model
                /*
                await db.collection('files').createIndex(
                  { 'processing.completedAt': 1 },
                  { 
                    expireAfterSeconds: 7 * 24 * 60 * 60,
                    partialFilterExpression: { 
                      'processing.status': 'completed',
                      'processing.completedAt': { $exists: true }
                    }
                  }
                );
                ttlCount++;
                console.log('   ✓ File processing logs TTL index created (7 days)');
                */

            } catch (indexError) {
                console.warn('   ⚠ Some TTL indexes could not be created:', indexError.message);
            }

            console.log(`⏰ TTL indexes setup completed (${ttlCount} additional indexes)`);
        } catch (error) {
            console.error('❌ Failed to setup TTL indexes:', error.message);
            throw error;
        }
    }

    async validateSetup() {
        try {
            console.log('🔍 Validating database setup...');

            // Check health of all connections
            const health = await configManager.healthCheck();

            if (health.status !== 'healthy') {
                throw new Error(`Database health check failed: ${JSON.stringify(health)}`);
            }
            console.log('   ✓ Database connections are healthy');

            // Verify collections exist
            const db = mongoose.connection.db;
            const existingCollections = await db.listCollections().toArray();
            const collectionNames = existingCollections.map(c => c.name);

            console.log('   📁 Available collections:', collectionNames.join(', '));

            // Test basic operations
            const userCount = await User.countDocuments();
            console.log(`   👥 Found ${userCount} users in database`);

            // Test Redis operations
            const redis = configManager.redis.redis;
            await redis.set('init:test', 'success', 'EX', 10);
            const testResult = await redis.get('init:test');

            if (testResult !== 'success') {
                throw new Error('Redis operation test failed');
            }
            console.log('   ✓ Redis operations working correctly');

            // Clean up test data
            await redis.del('init:test');

            console.log('🔍 Database setup validation completed successfully');
        } catch (error) {
            console.error('❌ Database setup validation failed:', error.message);
            throw error;
        }
    }

    async reset() {
        try {
            console.log('⚠️  RESETTING DATABASE (USE WITH CAUTION)...');

            if (process.env.NODE_ENV === 'production') {
                throw new Error('Database reset is not allowed in production');
            }

            // Confirm reset in interactive mode
            if (process.stdin.isTTY) {
                const readline = require('readline');
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                const answer = await new Promise(resolve => {
                    rl.question('Are you sure you want to reset the database? This will DELETE ALL DATA! (yes/no): ', resolve);
                });
                rl.close();

                if (answer.toLowerCase() !== 'yes') {
                    console.log('Database reset cancelled');
                    return;
                }
            }

            // Drop all collections
            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();
            let droppedCount = 0;

            for (const collection of collections) {
                try {
                    await db.collection(collection.name).drop();
                    console.log(`   🗑️  Dropped collection: ${collection.name}`);
                    droppedCount++;
                } catch (error) {
                    console.warn(`   ⚠ Could not drop collection ${collection.name}:`, error.message);
                }
            }

            console.log(`🗑️  Dropped ${droppedCount} collections`);

            // Reinitialize
            console.log('🔄 Reinitializing database...');
            await this.initialize();

            console.log('✅ Database reset completed');
        } catch (error) {
            console.error('❌ Database reset failed:', error.message);
            throw error;
        }
    }

    async healthCheck() {
        try {
            await configManager.initialize();
            const health = await configManager.healthCheck();
            return health;
        } catch (error) {
            return {
                status: 'error',
                message: 'Failed to perform health check',
                error: error.message
            };
        }
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    const initializer = new DatabaseInitializer();

    try {
        switch (command) {
            case 'init':
                console.log('🎯 Initializing database...\n');
                await initializer.initialize();
                break;

            case 'reset':
                console.log('🎯 Resetting database...\n');
                await initializer.reset();
                break;

            case 'health':
                console.log('🎯 Checking database health...\n');
                const health = await initializer.healthCheck();
                console.log('📊 Health Check Results:');
                console.log(JSON.stringify(health, null, 2));
                break;

            default:
                console.log('📚 Database Initialization Script\n');
                console.log('Usage:');
                console.log('  node scripts/init-db.js init    - Initialize database with indexes and default data');
                console.log('  node scripts/init-db.js reset   - Reset database (development only)');
                console.log('  node scripts/init-db.js health  - Check database connection health');
                console.log('\nEnvironment Variables Required:');
                console.log('  MONGODB_HOST, MONGODB_PORT, MONGODB_DATABASE');
                console.log('  REDIS_HOST, REDIS_PORT');
                console.log('  ADMIN_EMAIL, ADMIN_PASSWORD');
                process.exit(0);
        }

        console.log('\n🎉 Script completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('\n💥 Script failed:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    } finally {
        // Ensure connections are closed
        try {
            await configManager.shutdown();
        } catch (error) {
            console.error('Error during cleanup:', error.message);
        }
    }
}

// Only run if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = DatabaseInitializer;