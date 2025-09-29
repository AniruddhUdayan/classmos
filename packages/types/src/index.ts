// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface UserPresence {
  userId: string;
  username: string;
  avatar?: string;
  socketId?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Chat and Messaging Types
export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  username: string;
  roomId?: string;
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
  replyTo?: string; // Message ID this is replying to
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'class';
  ownerId: string;
  participants: User[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomData {
  id: string;
  participants: UserPresence[];
  createdAt: string;
}

// Socket Event Types
export interface SocketEvent {
  type: string;
  payload: unknown;
  timestamp: string;
}

export interface TypingIndicator {
  userId: string;
  username: string;
  roomId?: string;
  isTyping: boolean;
}

// Class and Education Types
export interface Class {
  id: string;
  name: string;
  description?: string;
  subject: string;
  teacherId: string;
  students: string[]; // User IDs
  schedule?: ClassSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSchedule {
  startTime: string;
  endTime: string;
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  timezone: string;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  points: number;
  attachments?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  attachments?: string[];
  grade?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
}

// File and Media Types
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'assignment' | 'grade' | 'announcement';
  title: string;
  content: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

// Request/Response Types for API endpoints
export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateClassRequest {
  name: string;
  description?: string;
  subject: string;
  schedule?: ClassSchedule;
}

export interface CreateAssignmentRequest {
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  points: number;
}

export interface SendMessageRequest {
  content: string;
  roomId?: string;
  replyTo?: string;
}

// Quiz and Assessment Types
export interface QuizUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'educator' | 'admin';
  xp: number;
  streaks: number;
  badges: string[];
  totalScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Quiz {
  id: string;
  subject: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  createdBy: string;
  isPublic: boolean;
  timeLimit?: number;
  questionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizScore {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  answers: {
    questionIndex: number;
    selectedAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
  }[];
  grade?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProgress {
  weakTopics: string[];
  streaks: number;
  xp: number;
  totalQuizzes: number;
  averageScore: number;
  recentScores: QuizScore[];
}

export interface TutorChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface TutorChatSession {
  sessionId: string;
  messages: TutorChatMessage[];
  isActive: boolean;
  lastActivity: string;
}

// Request Types
export interface CreateQuizRequest {
  subject: string;
  title: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionCount?: number;
  topics?: string[];
}

export interface SubmitScoreRequest {
  quizId: string;
  answers: {
    questionIndex: number;
    selectedAnswer: number;
    timeSpent: number;
  }[];
  timeSpent: number;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

// Socket.io Event Types for Quiz System
export interface QuizRoomData {
  quizId: string;
  quizTitle: string;
  participants: QuizParticipant[];
  isActive: boolean;
  startedAt?: string;
  endedAt?: string;
}

export interface QuizParticipant {
  userId: string;
  username: string;
  socketId: string;
  joinedAt: string;
  currentScore?: number;
  answersSubmitted: number;
  isCompleted: boolean;
}

export interface JoinRoomPayload {
  roomId: string;
  quizId: string;
  userInfo: {
    userId: string;
    username: string;
    email: string;
  };
}

export interface SubmitAnswerPayload {
  roomId: string;
  quizId: string;
  questionIndex: number;
  selectedAnswer: number;
  timeSpent: number;
  isCorrect?: boolean; // Will be determined by server
}

export interface ScoreUpdatePayload {
  userId: string;
  username: string;
  questionIndex: number;
  isCorrect: boolean;
  currentScore: number;
  totalAnswered: number;
  timeSpent: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  accuracy: number;
  totalAnswered: number;
  timeSpent: number;
  isCompleted: boolean;
  rank: number;
}

export interface LeaderboardUpdatePayload {
  roomId: string;
  quizId: string;
  leaderboard: LeaderboardEntry[];
  updatedAt: string;
}

export interface QuizCompletedPayload {
  userId: string;
  username: string;
  finalScore: number;
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  rank: number;
}

// Socket Event Names
export enum SocketEvents {
  // Room Management
  JOIN_ROOM = 'quiz:joinRoom',
  LEAVE_ROOM = 'quiz:leaveRoom',
  ROOM_JOINED = 'quiz:roomJoined',
  ROOM_LEFT = 'quiz:roomLeft',
  USER_JOINED_ROOM = 'quiz:userJoinedRoom',
  USER_LEFT_ROOM = 'quiz:userLeftRoom',
  
  // Quiz Events
  SUBMIT_ANSWER = 'quiz:submitAnswer',
  ANSWER_SUBMITTED = 'quiz:answerSubmitted',
  SCORE_UPDATE = 'quiz:scoreUpdate',
  QUIZ_COMPLETED = 'quiz:completed',
  
  // Leaderboard Events
  LEADERBOARD_UPDATE = 'quiz:leaderboardUpdate',
  
  // Quiz State Events
  QUIZ_STARTED = 'quiz:started',
  QUIZ_ENDED = 'quiz:ended',
  
  // Error Events
  ERROR = 'quiz:error'
}

