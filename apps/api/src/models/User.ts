import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  clerkId: string; // Clerk user ID
  name: string;
  email: string;
  role: 'student' | 'educator';
  xp: number;
  streaks: number;
  // Enhanced gamification fields
  totalXP: number;
  currentStreak: number;
  maxStreak: number;
  totalQuizzes: number;
  averageAccuracy: number;
  perfectScores: number;
  lastActivityDate: Date;
  subjectMastery: number;
  subjectStats: Map<string, {
    totalQuizzes: number;
    averageScore: number;
    consecutiveHighScores: number;
  }>;
  badges: Array<{
    badgeId: string;
    earnedAt: Date;
    data?: Record<string, any>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  clerkId: {
    type: String,
    required: [true, 'Clerk ID is required'],
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  role: {
    type: String,
    enum: ['student', 'educator'],
    required: [true, 'Role is required'],
    default: 'student'
  },
  xp: {
    type: Number,
    default: 0,
    min: [0, 'XP cannot be negative']
  },
  streaks: {
    type: Number,
    default: 0,
    min: [0, 'Streaks cannot be negative']
  },
  // Enhanced gamification fields
  totalXP: {
    type: Number,
    default: 0,
    min: [0, 'Total XP cannot be negative']
  },
  currentStreak: {
    type: Number,
    default: 0,
    min: [0, 'Current streak cannot be negative']
  },
  maxStreak: {
    type: Number,
    default: 0,
    min: [0, 'Max streak cannot be negative']
  },
  totalQuizzes: {
    type: Number,
    default: 0,
    min: [0, 'Total quizzes cannot be negative']
  },
  averageAccuracy: {
    type: Number,
    default: 0,
    min: [0, 'Average accuracy cannot be negative'],
    max: [100, 'Average accuracy cannot exceed 100']
  },
  perfectScores: {
    type: Number,
    default: 0,
    min: [0, 'Perfect scores cannot be negative']
  },
  lastActivityDate: {
    type: Date,
    default: null
  },
  subjectMastery: {
    type: Number,
    default: 0,
    min: [0, 'Subject mastery cannot be negative']
  },
  subjectStats: {
    type: Map,
    of: {
      totalQuizzes: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      consecutiveHighScores: { type: Number, default: 0 }
    },
    default: new Map()
  },
  badges: [{
    badgeId: {
      type: String,
      required: true,
      trim: true
    },
    earnedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    data: {
      type: Schema.Types.Mixed,
      default: {}
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
UserSchema.index({ clerkId: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ xp: -1 }); // For leaderboard queries

// Virtual for total score (combination of xp and streaks)
UserSchema.virtual('totalScore').get(function() {
  return this.xp + (this.streaks * 10); // Each streak worth 10 points
});

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
