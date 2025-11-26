import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_chat';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');
    console.log('📊 Database:', mongoose.connection.db?.databaseName);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    console.error('💡 Make sure MongoDB is running or set MONGODB_URI environment variable');
    console.error('   Example: set MONGODB_URI=mongodb://localhost:27017/secure_chat');
    console.error('   Or use MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
    process.exit(1);
  }
};

export default connectDB;
