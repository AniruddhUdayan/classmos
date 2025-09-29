import mongoose from 'mongoose';

// Use the same MongoDB Atlas connection as the API server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aniruddhudayan34_db_user:wC5qd6lEgrV7Ykvp@classmos.elsikty.mongodb.net/classmos?retryWrites=true&w=majority';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) {
    console.log('📊 Already connected to MongoDB');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('📊 Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('📊 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
};

export default connectDB;
