import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaderboardEntry extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  rank: number;
  totalScore: number; // Calculated total score
  totalXP: number;
  currentStreak: number;
  totalQuizzes: number;
  averageScore: number;
  badges: number; // Number of badges
  level: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaderboard extends Document {
  _id: mongoose.Types.ObjectId;
  type: 'global' | 'weekly' | 'monthly';
  period?: {
    start: Date;
    end: Date;
  };
  entries: ILeaderboardEntry[];
  lastComputed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
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
  totalScore: {
    type: Number,
    required: [true, 'Total score is required'],
    min: [0, 'Total score cannot be negative']
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

const LeaderboardSchema = new Schema<ILeaderboard>({
  type: {
    type: String,
    enum: ['global', 'weekly', 'monthly'],
    required: [true, 'Leaderboard type is required'],
    default: 'global'
  },
  period: {
    start: {
      type: Date,
      required: function(this: ILeaderboard) {
        return this.type !== 'global';
      }
    },
    end: {
      type: Date,
      required: function(this: ILeaderboard) {
        return this.type !== 'global';
      }
    }
  },
  entries: {
    type: [LeaderboardEntrySchema],
    default: [],
    validate: {
      validator: function(entries: ILeaderboardEntry[]) {
        // Check if ranks are consecutive starting from 1
        const ranks = entries.map(entry => entry.rank).sort((a, b) => a - b);
        for (let i = 0; i < ranks.length; i++) {
          if (ranks[i] !== i + 1) return false;
        }
        return true;
      },
      message: 'Leaderboard entries must have consecutive ranks starting from 1'
    }
  },
  lastComputed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
LeaderboardSchema.index({ type: 1, lastComputed: -1 });
LeaderboardSchema.index({ 'period.start': 1, 'period.end': 1 });
LeaderboardSchema.index({ 'entries.userId': 1 });
LeaderboardSchema.index({ 'entries.rank': 1 });

// Static method to compute and update leaderboard
LeaderboardSchema.statics.computeLeaderboard = async function(
  type: 'global' | 'weekly' | 'monthly' = 'global'
) {
  const User = mongoose.model('User');
  
  // Define period for non-global leaderboards
  let periodFilter = {};
  let period = undefined;
  
  if (type === 'weekly') {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    startOfWeek.setHours(0, 0, 0, 0);
    endOfWeek.setHours(23, 59, 59, 999);
    
    period = { start: startOfWeek, end: endOfWeek };
    periodFilter = { createdAt: { $gte: startOfWeek, $lte: endOfWeek } };
  } else if (type === 'monthly') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    period = { start: startOfMonth, end: endOfMonth };
    periodFilter = { createdAt: { $gte: startOfMonth, $lte: endOfMonth } };
  }

  // Get users sorted by total score (xp + streaks * 10)
  const users = await User.aggregate([
    ...(Object.keys(periodFilter).length > 0 ? [{ $match: periodFilter }] : []),
    {
      $addFields: {
        totalScore: { $add: ['$xp', { $multiply: ['$streaks', 10] }] }
      }
    },
    { $sort: { totalScore: -1, xp: -1, streaks: -1 } },
    { $limit: 100 } // Top 100 users
  ]);

  // Create leaderboard entries
  const entries = users.map((user, index) => ({
    userId: user._id,
    rank: index + 1,
    totalScore: user.totalScore,
    xp: user.xp,
    streaks: user.streaks,
    badges: user.badges || [],
    lastUpdated: new Date()
  }));

  // Update or create leaderboard
  const leaderboard = await this.findOneAndUpdate(
    { type, ...(period && { period }) },
    {
      type,
      period,
      entries,
      lastComputed: new Date()
    },
    { upsert: true, new: true }
  );

  return leaderboard;
};

// Virtual for entry count
LeaderboardSchema.virtual('entryCount').get(function() {
  return this.entries.length;
});

const Leaderboard = mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);

export default Leaderboard;

