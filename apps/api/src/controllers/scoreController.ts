import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Score, Quiz, User } from '../models';
import { GamificationService } from '../services/gamificationService';
import type { ApiResponse, QuizScore, SubmitScoreRequest } from '@repo/types';

/**
 * POST /api/scores - Save a quiz score
 */
export const submitScore = async (req: Request, res: Response) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findOne({ clerkId: req.auth.userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const scoreData: SubmitScoreRequest = req.body;
    
    // Validate required fields
    if (!scoreData.quizId || !scoreData.answers || !Array.isArray(scoreData.answers)) {
      return res.status(400).json({
        success: false,
        error: 'Quiz ID and answers array are required'
      });
    }

    // Get the quiz to validate answers
    const quiz = await Quiz.findById(scoreData.quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Validate answer count matches question count
    if (scoreData.answers.length !== quiz.questions.length) {
      return res.status(400).json({
        success: false,
        error: 'Answer count must match question count'
      });
    }

    // Calculate score
    let correctAnswers = 0;
    const processedAnswers = scoreData.answers.map((answer, index) => {
      const question = quiz.questions[index];
      if (!question) {
        throw new Error(`Question at index ${index} not found`);
      }
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      if (isCorrect) correctAnswers++;

      return {
        questionIndex: index,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        timeSpent: answer.timeSpent || 0
      };
    });

    const accuracy = (correctAnswers / quiz.questions.length) * 100;
    const score = Math.round(accuracy); // Simple scoring: accuracy percentage as score

    // Create score record
    const scoreRecord = new Score({
      userId: user._id,
      quizId: quiz._id,
      score,
      accuracy,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      timeSpent: scoreData.timeSpent || 0,
      answers: processedAnswers
    });

    await scoreRecord.save();

    // Update gamification data using the new service
    const gamificationResult = await GamificationService.updateUserGamification(
      req.auth.userId,
      {
        score,
        accuracy,
        timeSpent: scoreData.timeSpent || 0,
        quizId: quiz._id.toString(),
        subject: quiz.subject
      }
    );

    // Keep old fields for backward compatibility
    user.xp = gamificationResult.user.totalXP || 0;
    user.streaks = gamificationResult.user.currentStreak || 0;
    await user.save();

    const response: ApiResponse<QuizScore> = {
      success: true,
      data: {
        id: scoreRecord._id.toString(),
        userId: scoreRecord.userId.toString(),
        quizId: scoreRecord.quizId.toString(),
        score: scoreRecord.score,
        accuracy: scoreRecord.accuracy,
        totalQuestions: scoreRecord.totalQuestions,
        correctAnswers: scoreRecord.correctAnswers,
        timeSpent: scoreRecord.timeSpent,
        answers: scoreRecord.answers,
        grade: scoreRecord.get('grade'),
        timestamp: scoreRecord.timestamp.toISOString(),
        createdAt: scoreRecord.createdAt.toISOString(),
        updatedAt: scoreRecord.updatedAt.toISOString()
      },
      message: `Score submitted! Gained ${gamificationResult.xpEarned.total} XP. Current streak: ${gamificationResult.user.currentStreak}${gamificationResult.newBadges.length > 0 ? ` 🎉 New badges earned: ${gamificationResult.newBadges.map(b => b.name).join(', ')}` : ''}`
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error submitting score:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to submit score'
    };
    res.status(500).json(response);
  }
};

/**
 * GET /api/scores - Fetch scores for user or class
 */
export const getScores = async (req: Request, res: Response) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findOne({ clerkId: req.auth.userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const { 
      quizId, 
      userId, 
      limit = 10, 
      page = 1, 
      sortBy = 'timestamp',
      order = 'desc' 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    let query: any = {};

    // If specific quiz is requested
    if (quizId) {
      query.quizId = quizId;
    }

    // For educators/admins, they can view all users' scores
    // For students, they can only view their own scores
    if (user.role === 'student') {
      query.userId = user._id;
    } else if (userId) {
      // Educators can specify a specific user
      const targetUser = await User.findById(userId);
      if (targetUser) {
        query.userId = targetUser._id;
      }
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = order === 'asc' ? 1 : -1;

    const scores = await Score.find(query)
      .populate('userId', 'name email')
      .populate('quizId', 'title subject')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    const total = await Score.countDocuments(query);

    const formattedScores: QuizScore[] = scores.map(score => ({
      id: score._id.toString(),
      userId: score.userId._id.toString(),
      quizId: score.quizId._id.toString(),
      score: score.score,
      accuracy: score.accuracy,
      totalQuestions: score.totalQuestions,
      correctAnswers: score.correctAnswers,
      timeSpent: score.timeSpent,
      answers: score.answers,
      grade: score.get('grade'),
      timestamp: score.timestamp.toISOString(),
      createdAt: score.createdAt.toISOString(),
      updatedAt: score.updatedAt.toISOString()
    }));

    const response: ApiResponse<QuizScore[]> = {
      success: true,
      data: formattedScores,
      message: `Found ${formattedScores.length} scores`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching scores:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch scores'
    };
    res.status(500).json(response);
  }
};

/**
 * GET /api/scores/leaderboard - Get leaderboard for a quiz or overall
 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { quizId, limit = 10 } = req.query;

    let matchStage: any = {};
    if (quizId) {
      // quizId in Score is an ObjectId. Cast incoming string to ObjectId to match correctly.
      try {
        matchStage.quizId = new mongoose.Types.ObjectId(String(quizId));
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid quizId' });
      }
    }

    // Get top scores with user info
    const leaderboard = await Score.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$userId',
          bestScore: { $max: '$score' },
          bestAccuracy: { $max: '$accuracy' },
          totalQuizzes: { $sum: 1 },
          averageScore: { $avg: '$score' }
        }
      },
      { $sort: { bestScore: -1, bestAccuracy: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          bestScore: 1,
          bestAccuracy: 1,
          totalQuizzes: 1,
          averageScore: { $round: ['$averageScore', 1] },
          userName: '$user.name',
          userEmail: '$user.email',
          userXp: '$user.xp',
          userStreaks: '$user.streaks'
        }
      }
    ]);

    const response: ApiResponse<typeof leaderboard> = {
      success: true,
      data: leaderboard
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch leaderboard'
    };
    res.status(500).json(response);
  }
};
