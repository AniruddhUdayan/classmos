import axios, { AxiosResponse } from 'axios';
import type { 
  ApiResponse, 
  QuizUser, 
  Quiz, 
  QuizScore, 
  UserProgress, 
  CreateQuizRequest,
  SubmitScoreRequest,
  ChatRequest,
  TutorChatSession
} from '@repo/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Token will be added by the component using useAuth from Clerk
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API functions
export const apiClient = {
  // User endpoints
  getCurrentUser: async (token: string): Promise<QuizUser> => {
    const response: AxiosResponse<ApiResponse<QuizUser>> = await api.get('/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch user');
    }
    return response.data.data!;
  },

  createUser: async (token: string, userData: { name: string; email: string; role: string }): Promise<QuizUser> => {
    const response: AxiosResponse<ApiResponse<QuizUser>> = await api.post('/api/users', userData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create user');
    }
    return response.data.data!;
  },

  // Quiz endpoints
  getQuizzes: async (token: string, params?: { subject?: string; limit?: number; page?: number; my_quizzes?: boolean }): Promise<Quiz[]> => {
    const response: AxiosResponse<ApiResponse<Quiz[]>> = await api.get('/api/quizzes', {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch quizzes');
    }
    return response.data.data!;
  },

  getQuizById: async (token: string, quizId: string): Promise<Quiz> => {
    const response: AxiosResponse<ApiResponse<Quiz>> = await api.get(`/api/quizzes/${quizId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch quiz');
    }
    return response.data.data!;
  },

  createQuiz: async (token: string, quizData: CreateQuizRequest): Promise<Quiz> => {
    const response: AxiosResponse<ApiResponse<Quiz>> = await api.post('/api/quizzes', quizData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create quiz');
    }
    return response.data.data!;
  },

  // Score endpoints
  submitScore: async (token: string, scoreData: SubmitScoreRequest): Promise<QuizScore> => {
    const response: AxiosResponse<ApiResponse<QuizScore>> = await api.post('/api/scores', scoreData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to submit score');
    }
    return response.data.data!;
  },

  getScores: async (token: string, params?: { quizId?: string; limit?: number; page?: number }): Promise<QuizScore[]> => {
    const response: AxiosResponse<ApiResponse<QuizScore[]>> = await api.get('/api/scores', {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch scores');
    }
    return response.data.data!;
  },

  getLeaderboard: async (token: string, params?: { quizId?: string; limit?: number }): Promise<any[]> => {
    const response: AxiosResponse<ApiResponse<any[]>> = await api.get('/api/scores/leaderboard', {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch leaderboard');
    }
    return response.data.data!;
  },

  // Progress endpoints
  getUserProgress: async (token: string): Promise<UserProgress> => {
    const response: AxiosResponse<ApiResponse<UserProgress>> = await api.get('/api/progress', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch progress');
    }
    return response.data.data!;
  },

  // Chat endpoints
  sendChatMessage: async (token: string, chatData: ChatRequest): Promise<{ session: TutorChatSession; suggestions: string[] }> => {
    const response: AxiosResponse<ApiResponse<{ session: TutorChatSession; suggestions: string[] }>> = await api.post('/api/chat', chatData, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 0,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to send message');
    }
    return response.data.data!;
  },

  getChatSessions: async (token: string, params?: { limit?: number; page?: number; active_only?: boolean }): Promise<any[]> => {
    const response: AxiosResponse<ApiResponse<any[]>> = await api.get('/api/chat/sessions', {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch chat sessions');
    }
    return response.data.data!;
  },

  getChatSession: async (token: string, sessionId: string): Promise<TutorChatSession> => {
    const response: AxiosResponse<ApiResponse<TutorChatSession>> = await api.get(`/api/chat/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch chat session');
    }
    return response.data.data!;
  },

  // Analytics endpoints (for educators)
  getEducatorAnalytics: async (token: string): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api/analytics/educator', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch educator analytics');
    }
    return response.data.data!;
  },

  getAllStudents: async (token: string): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api/analytics/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch students data');
    }
    return response.data.data!;
  },

  getQuizResults: async (token: string, quizId: string, params?: { limit?: number; offset?: number }): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get(`/api/analytics/quiz/${quizId}/results`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch quiz results');
    }
    return response.data.data!;
  },

  getClassAnalytics: async (token: string): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api/analytics/class', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch class analytics');
    }
    return response.data.data!;
  },

  // Gamification endpoints
  getGamificationSummary: async (token: string): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api/gamification/summary', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch gamification summary');
    }
    return response.data.data!;
  },

  getAllBadges: async (token: string): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api/gamification/badges', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch badges');
    }
    return response.data.data!;
  },

  getGamificationLeaderboard: async (token: string, limit?: number): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api/gamification/leaderboard', {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch gamification leaderboard');
    }
    return response.data.data!;
  },

  getLevelProgress: async (token: string): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api/gamification/level-progress', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch level progress');
    }
    return response.data.data!;
  },

  getUserAchievements: async (token: string): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/api/gamification/achievements', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch achievements');
    }
    return response.data.data!;
  }
};

export default api;
