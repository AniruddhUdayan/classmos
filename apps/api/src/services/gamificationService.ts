import { User, Score, Leaderboard } from '../models';
import { createClerkClient } from '@clerk/clerk-sdk-node';

// Create Clerk client with the secret key
const clerkClient = createClerkClient({
  secretKey: 'sk_test_obpYuZWfGuRHi9PrkVcXQnILcD5CD7Vvb6auCHYoBh',
});

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'streak' | 'accuracy' | 'completion' | 'achievement';
  criteria: {
    field: string;
    operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
    value: number | string;
  };
}

export interface UserBadge {
  badgeId: string;
  earnedAt: Date;
  data?: Record<string, any>;
}

export interface XPCalculation {
  baseXP: number;
  accuracyBonus: number;
  streakBonus: number;
  completionBonus: number;
  total: number;
}

// Badge definitions
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_quiz',
    name: 'First Steps',
    description: 'Complete your first quiz',
    icon: '🎯',
    type: 'completion',
    criteria: { field: 'totalQuizzes', operator: 'gte', value: 1 }
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: '🔥',
    type: 'streak',
    criteria: { field: 'currentStreak', operator: 'gte', value: 7 }
  },
  {
    id: 'streak_30',
    name: 'Month Master',
    description: 'Maintain a 30-day learning streak',
    icon: '⚡',
    type: 'streak',
    criteria: { field: 'currentStreak', operator: 'gte', value: 30 }
  },
  {
    id: 'accuracy_90',
    name: 'Precision Pro',
    description: 'Achieve 90% accuracy average',
    icon: '🎪',
    type: 'accuracy',
    criteria: { field: 'averageAccuracy', operator: 'gte', value: 90 }
  },
  {
    id: 'accuracy_100',
    name: 'Perfect Score',
    description: 'Score 100% on any quiz',
    icon: '💯',
    type: 'accuracy',
    criteria: { field: 'perfectScores', operator: 'gte', value: 1 }
  },
  {
    id: 'quiz_10',
    name: 'Quiz Explorer',
    description: 'Complete 10 quizzes',
    icon: '🧭',
    type: 'completion',
    criteria: { field: 'totalQuizzes', operator: 'gte', value: 10 }
  },
  {
    id: 'quiz_50',
    name: 'Quiz Master',
    description: 'Complete 50 quizzes',
    icon: '👑',
    type: 'completion',
    criteria: { field: 'totalQuizzes', operator: 'gte', value: 50 }
  },
  {
    id: 'high_scorer',
    name: 'High Achiever',
    description: 'Reach 1000 XP',
    icon: '🌟',
    type: 'achievement',
    criteria: { field: 'totalXP', operator: 'gte', value: 1000 }
  },
  {
    id: 'subject_master',
    name: 'Subject Expert',
    description: 'Score above 85% in any subject for 5 consecutive quizzes',
    icon: '🎓',
    type: 'achievement',
    criteria: { field: 'subjectMastery', operator: 'gte', value: 1 }
  }
];

export class GamificationService {
  /**
   * Calculate XP earned for a quiz completion
   */
  static calculateXP(score: number, accuracy: number, timeSpent: number, currentStreak: number): XPCalculation {
    // Base XP based on score (0-100 points)
    const baseXP = Math.round(score);

    // Accuracy bonus (up to 50 points for 100% accuracy)
    const accuracyBonus = Math.round((accuracy / 100) * 50);

    // Time bonus (faster completion = more XP, max 25 points)
    const timeBonus = Math.max(0, 25 - Math.round(timeSpent / 60)); // 1 point less per minute

    // Streak bonus (5 XP per day in streak, max 100)
    const streakBonus = Math.min(currentStreak * 5, 100);

    // Completion bonus (always get 10 XP for finishing)
    const completionBonus = 10;

    const total = baseXP + accuracyBonus + timeBonus + streakBonus + completionBonus;

    return {
      baseXP: baseXP + timeBonus,
      accuracyBonus,
      streakBonus,
      completionBonus,
      total
    };
  }

  /**
   * Update user's gamification data after quiz completion
   */
  static async updateUserGamification(userId: string, scoreData: {
    score: number;
    accuracy: number;
    timeSpent: number;
    quizId: string;
    subject: string;
  }): Promise<{ xpEarned: XPCalculation; newBadges: BadgeDefinition[]; user: any }> {
    try {
      // Get or create user
      let user = await User.findOne({ clerkId: userId });
      if (!user) {
        user = new User({
          clerkId: userId,
          name: 'Unknown User',
          email: '',
          role: 'student'
        });
      }

      // Calculate current streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
      let currentStreak = user.currentStreak || 0;

      if (lastActivity) {
        const lastActivityDate = new Date(lastActivity);
        lastActivityDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day
          currentStreak += 1;
        } else if (daysDiff === 0) {
          // Same day, keep current streak
        } else {
          // Streak broken
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      // Calculate XP
      const xpCalculation = this.calculateXP(
        scoreData.score,
        scoreData.accuracy,
        scoreData.timeSpent,
        currentStreak
      );

      // Update user stats
      const previousTotalQuizzes = user.totalQuizzes || 0;
      const previousTotalXP = user.totalXP || 0;
      const previousPerfectScores = user.perfectScores || 0;

      user.totalQuizzes = previousTotalQuizzes + 1;
      user.totalXP = previousTotalXP + xpCalculation.total;
      user.currentStreak = currentStreak;
      user.maxStreak = Math.max(user.maxStreak || 0, currentStreak);
      user.lastActivityDate = new Date();

      // Track perfect scores
      if (scoreData.accuracy === 100) {
        user.perfectScores = previousPerfectScores + 1;
      }

      // Calculate average accuracy
      const scores = await Score.find({ userId: user._id });
      const totalAccuracy = scores.reduce((sum, s) => sum + (s.accuracy || 0), 0) + scoreData.accuracy;
      user.averageAccuracy = totalAccuracy / (scores.length + 1);

      // Track subject mastery
      if (!user.subjectStats) {
        user.subjectStats = new Map();
      }
      
      const subjectStats = user.subjectStats.get(scoreData.subject) || {
        totalQuizzes: 0,
        averageScore: 0,
        consecutiveHighScores: 0
      };

      subjectStats.totalQuizzes += 1;
      subjectStats.averageScore = ((subjectStats.averageScore * (subjectStats.totalQuizzes - 1)) + scoreData.score) / subjectStats.totalQuizzes;

      // Check for consecutive high scores (85%+)
      if (scoreData.score >= 85) {
        subjectStats.consecutiveHighScores += 1;
      } else {
        subjectStats.consecutiveHighScores = 0;
      }

      user.subjectStats.set(scoreData.subject, subjectStats);

      // Check for subject mastery badge
      if (subjectStats.consecutiveHighScores >= 5) {
        user.subjectMastery = (user.subjectMastery || 0) + 1;
      }

      // Check for new badges
      const currentBadges = user.badges || [];
      const currentBadgeIds = currentBadges.map(b => b.badgeId);
      const newBadges: BadgeDefinition[] = [];

      for (const badgeDefinition of BADGE_DEFINITIONS) {
        if (!currentBadgeIds.includes(badgeDefinition.id)) {
          const earned = this.checkBadgeCriteria(badgeDefinition, {
            totalQuizzes: user.totalQuizzes,
            currentStreak: user.currentStreak,
            averageAccuracy: user.averageAccuracy,
            perfectScores: user.perfectScores,
            totalXP: user.totalXP,
            subjectMastery: user.subjectMastery || 0
          });

          if (earned) {
            const userBadge: UserBadge = {
              badgeId: badgeDefinition.id,
              earnedAt: new Date()
            };
            currentBadges.push(userBadge);
            newBadges.push(badgeDefinition);
          }
        }
      }

      user.badges = currentBadges;

      // Save user
      await user.save();

      // Update Clerk metadata
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            role: user.role,
            totalXP: user.totalXP,
            currentStreak: user.currentStreak,
            maxStreak: user.maxStreak,
            totalQuizzes: user.totalQuizzes,
            averageAccuracy: user.averageAccuracy,
            badges: user.badges?.length || 0,
            level: Math.floor((user.totalXP || 0) / 100) + 1
          }
        });
      } catch (error) {
        console.warn('Failed to update Clerk metadata:', error);
      }

      // Update leaderboard
      await this.updateLeaderboard(user);

      return {
        xpEarned: xpCalculation,
        newBadges,
        user: user.toObject()
      };
    } catch (error) {
      console.error('Error updating user gamification:', error);
      throw error;
    }
  }

  /**
   * Check if user meets criteria for a badge
   */
  private static checkBadgeCriteria(badge: BadgeDefinition, userStats: Record<string, any>): boolean {
    const { field, operator, value } = badge.criteria;
    const userValue = userStats[field];

    if (userValue === undefined) return false;

    switch (operator) {
      case 'gte':
        return userValue >= value;
      case 'lte':
        return userValue <= value;
      case 'gt':
        return userValue > value;
      case 'lt':
        return userValue < value;
      case 'eq':
        return userValue === value;
      default:
        return false;
    }
  }

  /**
   * Update or create leaderboard entry
   */
  private static async updateLeaderboard(user: any): Promise<void> {
    try {
      const leaderboardEntry = await Leaderboard.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          username: user.name,
          // totalScore combines XP and streaks for tie-breakers (kept for compatibility)
          totalScore: (user.totalXP || 0) + (user.currentStreak || 0) * 10,
          totalXP: user.totalXP || 0,
          currentStreak: user.currentStreak || 0,
          totalQuizzes: user.totalQuizzes || 0,
          averageScore: user.averageAccuracy || 0,
          badges: (user.badges || []).length,
          // Level derived from total XP (100 XP per level, minimum 1)
          level: Math.floor((user.totalXP || 0) / 100) + 1,
          rank: 0, // Will be recalculated separately
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );

      // Recalculate ranks for all users
      await this.recalculateRanks();
    } catch (error) {
      console.error('Error updating leaderboard:', error);
    }
  }

  /**
   * Recalculate ranks for all leaderboard entries
   */
  private static async recalculateRanks(): Promise<void> {
    try {
      const entries = await Leaderboard.find({}).sort({ totalXP: -1, averageScore: -1 });
      
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry) {
          entry.rank = i + 1;
          await entry.save();
        }
      }
    } catch (error) {
      console.error('Error recalculating ranks:', error);
    }
  }

  /**
   * Get user's gamification summary
   */
  static async getUserGamificationSummary(userId: string): Promise<{
    xp: number;
    streak: number;
    badges: Array<{ badge: BadgeDefinition; earnedAt: Date }>;
    rank: number;
    level: number;
    nextLevelXP: number;
  }> {
    try {
      const user = await User.findOne({ clerkId: userId });
      const leaderboardEntry = await Leaderboard.findOne({ userId: user?._id });

      if (!user) {
        return {
          xp: 0,
          streak: 0,
          badges: [],
          rank: 0,
          level: 1,
          nextLevelXP: 100
        };
      }

      // Calculate level (every 100 XP = 1 level)
      const level = Math.floor((user.totalXP || 0) / 100) + 1;
      const nextLevelXP = level * 100;

      // Get badge details
      const userBadges = (user.badges || []).map(userBadge => {
        const badgeDefinition = BADGE_DEFINITIONS.find(b => b.id === userBadge.badgeId);
        return {
          badge: badgeDefinition!,
          earnedAt: userBadge.earnedAt
        };
      }).filter(b => b.badge);

      return {
        xp: user.totalXP || 0,
        streak: user.currentStreak || 0,
        badges: userBadges,
        rank: leaderboardEntry?.rank || 0,
        level,
        nextLevelXP
      };
    } catch (error) {
      console.error('Error getting user gamification summary:', error);
      throw error;
    }
  }

  /**
   * Get all available badges
   */
  static getAllBadges(): BadgeDefinition[] {
    return BADGE_DEFINITIONS;
  }

  /**
   * Get leaderboard with gamification data
   */
  static async getEnhancedLeaderboard(limit: number = 20): Promise<any[]> {
    try {
      const entries = await Leaderboard.find({})
        .sort({ totalXP: -1, averageScore: -1 })
        .limit(limit)
        .populate('userId', 'name email');

      return entries.map(entry => ({
        rank: entry.rank,
        userId: entry.userId,
        username: entry.username,
        totalXP: entry.totalXP,
        currentStreak: entry.currentStreak,
        totalQuizzes: entry.totalQuizzes,
        averageScore: entry.averageScore,
        badges: entry.badges,
        level: Math.floor(entry.totalXP / 100) + 1,
        lastUpdated: entry.lastUpdated
      }));
    } catch (error) {
      console.error('Error getting enhanced leaderboard:', error);
      throw error;
    }
  }
}
