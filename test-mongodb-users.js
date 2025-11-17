/**
 * MongoDB User Data Verification Script
 * This script checks if users are being stored correctly in MongoDB
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'mutual_funds_db';

async function checkUsers() {
  console.log('🔍 Checking MongoDB User Data...\n');
  console.log('📋 Configuration:');
  console.log('  MongoDB URI:', MONGODB_URI);
  console.log('  Database:', DATABASE_NAME);
  console.log('');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully\n');

    const db = client.db(DATABASE_NAME);
    const usersCollection = db.collection('users');

    // Count total users
    const totalUsers = await usersCollection.countDocuments();
    console.log(`📊 Total Users: ${totalUsers}\n`);

    if (totalUsers === 0) {
      console.log('⚠️  No users found in database');
      console.log(
        '💡 Try signing up or logging in with Google to create a user\n'
      );
      return;
    }

    // Get all users (limit to 10 for display)
    const users = await usersCollection
      .find({})
      .limit(10)
      .sort({ createdAt: -1 })
      .toArray();

    console.log('👥 Recent Users:\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. User Details:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Name: ${user.name}`);
      console.log(`   🔐 Provider: ${user.provider || 'email'}`);
      console.log(`   🆔 Google ID: ${user.googleId || 'N/A'}`);
      console.log(
        `   🖼️  Profile Picture: ${user.profilePicture ? 'Yes' : 'No'}`
      );
      console.log(`   ✅ Verified: ${user.isVerified ? 'Yes' : 'No'}`);
      console.log(`   🎭 Role: ${user.role}`);
      console.log(
        `   📅 Created: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}`
      );
      console.log('');
    });

    // Check Google users specifically
    const googleUsers = await usersCollection.countDocuments({
      provider: 'google',
    });
    const emailUsers = await usersCollection.countDocuments({
      provider: { $ne: 'google' },
    });

    console.log('📈 User Statistics:');
    console.log(`   Google Sign-in Users: ${googleUsers}`);
    console.log(`   Email/Password Users: ${emailUsers}`);
    console.log('');

    // Check refresh tokens
    const refreshTokensCollection = db.collection('refresh_tokens');
    const totalTokens = await refreshTokensCollection.countDocuments();
    console.log(`🔑 Total Refresh Tokens: ${totalTokens}\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Make sure:');
    console.error('   1. MongoDB is running');
    console.error('   2. MONGODB_URI in .env is correct');
    console.error('   3. Database has proper permissions');
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkUsers().catch(console.error);
