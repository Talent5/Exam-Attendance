const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const testLogin = async (usernameOrEmail, password) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam_attendance');
    console.log('Connected to MongoDB');

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: usernameOrEmail.toLowerCase() },
        { email: usernameOrEmail.toLowerCase() }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      console.log(`Searched for: ${usernameOrEmail}`);
      
      // List all users to help debug
      const allUsers = await User.find({}, 'username email fullName role isActive');
      console.log('\n📋 All users in database:');
      allUsers.forEach(u => {
        console.log(`- Username: ${u.username}, Email: ${u.email}, Role: ${u.role}, Active: ${u.isActive}`);
      });
      
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`- Username: ${user.username}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Full Name: ${user.fullName}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Active: ${user.isActive}`);
    console.log(`- Locked: ${user.isLocked}`);
    console.log(`- Login Attempts: ${user.loginAttempts}`);
    console.log(`- Last Login: ${user.lastLogin}`);

    if (!user.isActive) {
      console.log('❌ Account is inactive');
      process.exit(1);
    }

    if (user.isLocked) {
      console.log('❌ Account is locked');
      process.exit(1);
    }

    // Test password
    const isPasswordValid = await user.comparePassword(password);
    
    if (isPasswordValid) {
      console.log('✅ Password is correct');
      console.log('🎉 Login should work!');
    } else {
      console.log('❌ Password is incorrect');
      console.log('💡 Double-check your password');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error testing login:', error);
    process.exit(1);
  }
};

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node test-login.js <username_or_email> <password>');
  console.log('Example: node test-login.js myuser@email.com mypassword');
  process.exit(1);
}

const [usernameOrEmail, password] = args;
testLogin(usernameOrEmail, password);