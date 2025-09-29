import mongoose, { Schema, Document } from 'mongoose';

// User interface for socket operations
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  clerkId: string;
  name: string;
  email: string;
  role: 'student' | 'educator' | 'admin';
  xp: number;
  streaks: number;
  badges: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Quiz interface for socket operations
export interface IQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface IQuiz extends Document {
  _id: mongoose.Types.ObjectId;
  subject: string;
  title: string;
  description?: string;
  questions: IQuestion[];
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  timeLimit?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Score interface for socket operations
export interface IScore extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
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
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User Schema
const UserSchema = new Schema<IUser>({
  clerkId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['student', 'educator', 'admin'], default: 'student' },
  xp: { type: Number, default: 0 },
  streaks: { type: Number, default: 0 },
  badges: [{ type: String }]
}, { timestamps: true });

// Question Schema
const QuestionSchema = new Schema<IQuestion>({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
}, { _id: false });

// Quiz Schema
const QuizSchema = new Schema<IQuiz>({
  subject: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  questions: [QuestionSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: true },
  timeLimit: { type: Number }
}, { timestamps: true });

// Answer Schema
const AnswerSchema = new Schema({
  questionIndex: { type: Number, required: true },
  selectedAnswer: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
  timeSpent: { type: Number, required: true }
}, { _id: false });

// Score Schema
const ScoreSchema = new Schema<IScore>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  timeSpent: { type: Number, required: true },
  answers: [AnswerSchema],
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Create models
export const User = mongoose.model<IUser>('User', UserSchema);
export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
export const Score = mongoose.model<IScore>('Score', ScoreSchema);
