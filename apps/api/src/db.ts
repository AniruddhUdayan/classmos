import mongoose from 'mongoose';

// Hardcoded MongoDB URI for now - will fix environment variables later
const MONGODB_URI = 'mongodb+srv://aniruddhudayan34_db_user:wC5qd6lEgrV7Ykvp@classmos.elsikty.mongodb.net/classmos?retryWrites=true&w=majority';

const connectDB = async (): Promise<void> => {
  try {

    const conn = await mongoose.connect(MONGODB_URI);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
