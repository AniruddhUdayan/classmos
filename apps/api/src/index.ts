import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import type { User, ApiResponse } from '@repo/types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Database connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Routes
app.get('/health', (req, res) => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  };
  res.json(response);
});

app.get('/api/users', (req, res) => {
  // Example endpoint - replace with actual user logic
  const response: ApiResponse<User[]> = {
    success: true,
    data: [],
  };
  res.json(response);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response) => {
  console.error('❌ Server error:', err);
  const response: ApiResponse<null> = {
    success: false,
    error: 'Internal server error',
  };
  res.status(500).json(response);
});

// 404 handler
app.use('*', (req, res) => {
  const response: ApiResponse<null> = {
    success: false,
    error: 'Route not found',
  };
  res.status(404).json(response);
});

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
  });
};

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
