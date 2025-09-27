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
