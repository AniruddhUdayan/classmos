import { Request, Response } from 'express';
import { User } from '../models/index.js';
import { GamificationService, BADGE_DEFINITIONS } from '../services/gamificationService.js';
import type { ApiResponse } from '@repo/types';

/**
 * GET /api/gamification/summary - Get user's gamification summary
 */
export const getUserGamificationSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const summary = await GamificationService.getUserGamificationSummary(userId);

    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching gamification summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gamification summary'
    });
  }
};

/**
 * GET /api/gamification/badges - Get all available badges
 */
export const getAllBadges = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get user's earned badges
    const user = await User.findOne({ clerkId: userId });
    const earnedBadgeIds = user?.badges?.map(b => b.badgeId) || [];

    // Add earned status to badge definitions
    const badgesWithStatus = BADGE_DEFINITIONS.map(badge => ({
      ...badge,
      earned: earnedBadgeIds.includes(badge.id),
      earnedAt: user?.badges?.find(b => b.badgeId === badge.id)?.earnedAt || null
    }));

    const response: ApiResponse<typeof badgesWithStatus> = {
      success: true,
      data: badgesWithStatus
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch badges'
    });
  }
};

/**
 * GET /api/gamification/leaderboard - Get enhanced leaderboard with gamification data
 */
export const getEnhancedLeaderboard = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    
    const leaderboard = await GamificationService.getEnhancedLeaderboard(Number(limit));

    const response: ApiResponse<typeof leaderboard> = {
      success: true,
      data: leaderboard
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching enhanced leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
};

/**
 * GET /api/gamification/level-progress - Get user's level progress
 */
export const getUserLevelProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const totalXP = user.totalXP || 0;
    const level = Math.floor(totalXP / 100) + 1;
    const currentLevelXP = (level - 1) * 100;
    const nextLevelXP = level * 100;
    const progressXP = totalXP - currentLevelXP;
    const progressPercentage = (progressXP / 100) * 100;

    const levelProgress = {
      currentLevel: level,
      totalXP,
      currentLevelXP,
      nextLevelXP,
      progressXP,
      progressPercentage: Math.min(progressPercentage, 100),
      xpToNextLevel: nextLevelXP - totalXP
    };

    const response: ApiResponse<typeof levelProgress> = {
      success: true,
      data: levelProgress
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching level progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch level progress'
    });
  }
};

/**
 * GET /api/gamification/achievements - Get user's recent achievements
 */
export const getUserAchievements = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get recent badges (last 10)
    const recentBadges = (user.badges || [])
      .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
      .slice(0, 10)
      .map(userBadge => {
        const badgeDefinition = BADGE_DEFINITIONS.find(b => b.id === userBadge.badgeId);
        return {
          ...badgeDefinition,
          earnedAt: userBadge.earnedAt,
          data: userBadge.data
        };
      })
      .filter(badge => badge.id); // Remove any badges that don't have definitions

    const achievements = {
      totalXP: user.totalXP || 0,
      currentStreak: user.currentStreak || 0,
      maxStreak: user.maxStreak || 0,
      totalQuizzes: user.totalQuizzes || 0,
      averageAccuracy: user.averageAccuracy || 0,
      perfectScores: user.perfectScores || 0,
      totalBadges: (user.badges || []).length,
      recentBadges,
      level: Math.floor((user.totalXP || 0) / 100) + 1
    };

    const response: ApiResponse<typeof achievements> = {
      success: true,
      data: achievements
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements'
    });
  }
};
