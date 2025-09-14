const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  console.log('Testing MongoDB connection...');
  console.log('URI:', process.env.MONGODB_URI?.replace(/:[^@]*@/, ':***@')); // Hide password
  
  try {
    // Test with basic connection options first
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      family: 4 // Force IPv4
    });
    
    console.log('✅ MongoDB Connected successfully!');
    console.log('Host:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.reason) {
      console.error('Topology:', error.reason.type);
      console.error('Servers:', [...error.reason.servers.keys()]);
    }
  }
};

testConnection();