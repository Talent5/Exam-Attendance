const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const fixUsernameCase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam_attendance');
    console.log('Connected to MongoDB');

    // Find user with case-sensitive username
    const user = await User.findOne({ username: 'Talent5' });
    
    if (user) {
      console.log('Found user:', user.username);
      
      // Update username to lowercase
      user.username = user.username.toLowerCase();
      await user.save();
      
      console.log('✅ Username updated to:', user.username);
      console.log('Now you can login with: talent5');
    } else {
      console.log('User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixUsernameCase();