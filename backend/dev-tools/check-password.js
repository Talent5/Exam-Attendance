const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const checkAndResetPassword = async (email, newPassword) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam_attendance');
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`- Username: ${user.username}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Full Name: ${user.fullName}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Created: ${user.createdAt}`);
    console.log(`- Last Login: ${user.lastLogin}`);
    console.log(`- Login Attempts: ${user.loginAttempts}`);

    if (newPassword) {
      console.log('\n🔧 Resetting password...');
      
      // Update password (will be hashed automatically by the pre-save middleware)
      user.password = newPassword;
      
      // Reset login attempts
      await user.resetLoginAttempts();
      
      await user.save();
      
      console.log('✅ Password updated successfully!');
      console.log('✅ Login attempts reset');
      console.log(`\nYou can now login with:`);
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${newPassword}`);
    } else {
      console.log('\n💡 To reset password, run:');
      console.log(`node check-password.js "${email}" "new-password-here"`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node check-password.js <email> [new-password]');
  console.log('Examples:');
  console.log('  node check-password.js "chrismundwa5@gmail.com"           # Check user info');
  console.log('  node check-password.js "chrismundwa5@gmail.com" "newpass" # Reset password');
  process.exit(1);
}

const [email, newPassword] = args;
checkAndResetPassword(email, newPassword);