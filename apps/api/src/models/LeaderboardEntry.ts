import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaderboardEntry extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  rank: number;
  totalXP: number;
  currentStreak: number;
  totalQuizzes: number;
  averageScore: number;
  badges: number; // Number of badges earned
  level: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true
  },
  rank: {
    type: Number,
    required: [true, 'Rank is required'],
    min: [1, 'Rank must be at least 1']
  },
  totalXP: {
    type: Number,
    required: [true, 'Total XP is required'],
    min: [0, 'Total XP cannot be negative']
  },
  currentStreak: {
    type: Number,
    required: [true, 'Current streak is required'],
    min: [0, 'Current streak cannot be negative']
  },
  totalQuizzes: {
    type: Number,
    required: [true, 'Total quizzes is required'],
    min: [0, 'Total quizzes cannot be negative']
  },
  averageScore: {
    type: Number,
    required: [true, 'Average score is required'],
    min: [0, 'Average score cannot be negative'],
    max: [100, 'Average score cannot exceed 100']
  },
  badges: {
    type: Number,
    required: [true, 'Badge count is required'],
    min: [0, 'Badge count cannot be negative']
  },
  level: {
    type: Number,
    required: [true, 'Level is required'],
    min: [1, 'Level must be at least 1']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
LeaderboardEntrySchema.index({ rank: 1 });
LeaderboardEntrySchema.index({ totalXP: -1 });
LeaderboardEntrySchema.index({ userId: 1 });

const Leaderboard = mongoose.model<ILeaderboardEntry>('Leaderboard', LeaderboardEntrySchema);

export default Leaderboard;
