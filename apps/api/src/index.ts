import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import type { ApiResponse } from '@repo/types';
import connectDB from './db.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { getCurrentUser, createUser, getAllUsers } from './controllers/userController.js';
import { createQuiz, getQuizzes, getQuizById } from './controllers/quizController.js';
import { submitScore, getScores, getLeaderboard } from './controllers/scoreController.js';
import { getUserProgress, getProgressAnalytics } from './controllers/progressController.js';
import { sendChatMessage, getChatSessions, getChatSession, updateChatSession } from './controllers/chatController.js';
import { getEducatorAnalytics, getAllStudents, getQuizResults, getClassAnalytics } from './controllers/analyticsController.js';
import { getUserGamificationSummary, getAllBadges, getEnhancedLeaderboard, getUserLevelProgress, getUserAchievements } from './controllers/gamificationController.js';

dotenv.config();

const app = express();
// Hardcode port to avoid env issues temporarily
const PORT = 4000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

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

app.get('/api/me', requireAuth, getCurrentUser);

app.post('/api/users', requireAuth, createUser);

app.get('/api/users', requireAuth, requireRole(['educator', 'admin']), getAllUsers);

app.get('/api/student/dashboard', requireAuth, requireRole(['student']), (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Welcome to student dashboard',
      availableActions: ['take_quiz', 'chat_tutor', 'view_progress']
    }
  });
});

app.get('/api/educator/dashboard', requireAuth, requireRole(['educator']), (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Welcome to educator dashboard',
      availableActions: ['create_quiz', 'view_analytics', 'manage_students']
    }
  });
});

// Quiz routes
app.post('/api/quizzes', requireAuth, requireRole(['educator', 'admin']), createQuiz);
app.get('/api/quizzes', requireAuth, getQuizzes);
app.get('/api/quizzes/:id', requireAuth, getQuizById);

// Score routes  
app.post('/api/scores', requireAuth, submitScore);
app.get('/api/scores', requireAuth, getScores);
app.get('/api/scores/leaderboard', requireAuth, getLeaderboard);

// Progress routes
app.get('/api/progress', requireAuth, getUserProgress);
app.get('/api/progress/analytics', requireAuth, requireRole(['educator', 'admin']), getProgressAnalytics);

// Chat routes
app.post('/api/chat', requireAuth, sendChatMessage);
app.get('/api/chat/sessions', requireAuth, getChatSessions);
app.get('/api/chat/sessions/:sessionId', requireAuth, getChatSession);
app.put('/api/chat/sessions/:sessionId', requireAuth, updateChatSession);

// Analytics routes
app.get('/api/analytics/educator', requireAuth, requireRole(['educator', 'admin']), getEducatorAnalytics);
app.get('/api/analytics/students', requireAuth, requireRole(['educator', 'admin']), getAllStudents);
app.get('/api/analytics/quiz/:quizId/results', requireAuth, requireRole(['educator', 'admin']), getQuizResults);
app.get('/api/analytics/class', requireAuth, requireRole(['educator', 'admin']), getClassAnalytics);

// Gamification routes
app.get('/api/gamification/summary', requireAuth, getUserGamificationSummary);
app.get('/api/gamification/badges', requireAuth, getAllBadges);
app.get('/api/gamification/leaderboard', requireAuth, getEnhancedLeaderboard);
app.get('/api/gamification/level-progress', requireAuth, getUserLevelProgress);
app.get('/api/gamification/achievements', requireAuth, getUserAchievements);

// Test endpoint for Gemini API (no auth required for testing)
app.post('/api/test-gemini', async (req, res) => {
  try {
        const { getTutorResponse } = await import('./utils/gemini.js');
    const message = req.body.message || 'Hello, can you explain what photosynthesis is?';
    
    console.log('🧪 Testing Gemini API with message:', message);
    const response = await getTutorResponse(message);
    
    res.json({
      success: true,
      data: response,
      message: 'Gemini API test successful'
    });
  } catch (error) {
    console.error('❌ Gemini test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Gemini API test failed'
    });
  }
});

app.use((err: Error, req: express.Request, res: express.Response) => {
  console.error('Server error:', err);
  const response: ApiResponse<null> = {
    success: false,
    error: 'Internal server error',
  };
  res.status(500).json(response);
});

app.use('*', (req, res) => {
  const response: ApiResponse<null> = {
    success: false,
    error: 'Route not found',
  };
  res.status(404).json(response);
});

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
