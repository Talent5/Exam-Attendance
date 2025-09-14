const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const createDemoAccounts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam_attendance');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@exam.com' });
    if (!existingAdmin) {
      const adminUser = new User({
        username: 'admin',
        fullName: 'System Administrator',
        email: 'admin@exam.com',
        password: 'admin123',
        role: 'admin',
        department: 'IT Administration',
        employeeId: 'ADM001',
        phone: '+1234567890'
      });
      await adminUser.save();
      console.log('✅ Admin account created: admin@exam.com / admin123');
    } else {
      console.log('ℹ️  Admin account already exists');
    }

    // Check if invigilator already exists
    const existingInvigilator = await User.findOne({ email: 'invigilator@exam.com' });
    if (!existingInvigilator) {
      const invigilatorUser = new User({
        username: 'invigilator1',
        fullName: 'John Invigilator',
        email: 'invigilator@exam.com',
        password: 'invig123',
        role: 'invigilator',
        department: 'Academic Affairs',
        employeeId: 'INV001',
        phone: '+1234567891'
      });
      await invigilatorUser.save();
      console.log('✅ Invigilator account created: invigilator@exam.com / invig123');
    } else {
      console.log('ℹ️  Invigilator account already exists');
    }

    console.log('\n🎉 Demo accounts setup complete!');
    console.log('\nDemo Accounts:');
    console.log('Admin: admin@exam.com / admin123');
    console.log('Invigilator: invigilator@exam.com / invig123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating demo accounts:', error);
    process.exit(1);
  }
};

createDemoAccounts();