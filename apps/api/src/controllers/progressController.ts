import { Request, Response } from 'express';
import { Score, Quiz, User } from '../models';
import { analyzeWeakTopics } from '../utils/gemini';
import type { ApiResponse, UserProgress, QuizScore } from '@repo/types';
import type { IQuiz } from '../models/Quiz';

/**
 * GET /api/progress - Get user's learning progress including weak topics, streaks, and XP
 */
export const getUserProgress = async (req: Request, res: Response) => {
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

    // Get user's recent scores (last 10)
    const recentScores = await Score.find({ userId: user._id })
      .populate('quizId', 'title subject questions')
      .sort({ timestamp: -1 })
      .limit(10);

    // Calculate overall statistics
    const totalScores = await Score.countDocuments({ userId: user._id });
    const averageScoreResult = await Score.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);
    
    const averageScore = averageScoreResult.length > 0 ? Math.round(averageScoreResult[0].avgScore) : 0;

    // Get weak topics by analyzing recent incorrect answers
    let weakTopics: string[] = [];
    
    try {
      // Collect incorrect answers from recent quizzes
      const incorrectAnswers: { question: string; correctAnswer: string; userAnswer: string; }[] = [];
      const subjects = new Set<string>();

      for (const score of recentScores) {
        const quiz = score.quizId as unknown as IQuiz;
        if (quiz && quiz.questions && quiz.subject) {
          subjects.add(quiz.subject);
          
          score.answers.forEach((answer, index) => {
            if (!answer.isCorrect && quiz.questions[index]) {
              const question = quiz.questions[index];
              const correctOption = question.options[question.correctAnswer];
              if (correctOption) {
                incorrectAnswers.push({
                  question: question.question,
                  correctAnswer: correctOption,
                  userAnswer: question.options[answer.selectedAnswer] || 'No answer'
                });
              }
            }
          });
        }
      }

      // Analyze weak topics using Gemini for the most common subject
      if (incorrectAnswers.length > 0 && subjects.size > 0) {
        const mostCommonSubject = Array.from(subjects)[0]; // Use first subject for now
        if (mostCommonSubject) {
          weakTopics = await analyzeWeakTopics({
            subject: mostCommonSubject,
            incorrectAnswers: incorrectAnswers.slice(0, 10) // Limit to prevent token limit issues
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing weak topics:', error);
      // Fallback to simple analysis
      const subjectPerformance = new Map<string, { total: number; correct: number }>();
      
      recentScores.forEach(score => {
        const quiz = score.quizId as unknown as IQuiz;
        if (quiz && quiz.subject) {
          const subject = quiz.subject;
          const current = subjectPerformance.get(subject) || { total: 0, correct: 0 };
          subjectPerformance.set(subject, {
            total: current.total + score.totalQuestions,
            correct: current.correct + score.correctAnswers
          });
        }
      });

      // Find subjects with accuracy < 70%
      weakTopics = Array.from(subjectPerformance.entries())
        .filter(([_, stats]) => (stats.correct / stats.total) < 0.7)
        .map(([subject, _]) => subject)
        .slice(0, 5);
    }

    // Format recent scores
    const formattedRecentScores: QuizScore[] = recentScores.map(score => ({
      id: score._id.toString(),
      userId: score.userId.toString(),
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

    const progressData: UserProgress = {
      weakTopics,
      streaks: user.streaks,
      xp: user.xp,
      totalQuizzes: totalScores,
      averageScore,
      recentScores: formattedRecentScores
    };

    const response: ApiResponse<UserProgress> = {
      success: true,
      data: progressData
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch user progress'
    };
    res.status(500).json(response);
  }
};

/**
 * GET /api/progress/analytics - Get detailed analytics for educators
 */
export const getProgressAnalytics = async (req: Request, res: Response) => {
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

    // Only educators and admins can access analytics
    if (!['educator', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Educator role required.'
      });
    }

    const { timeframe = '30', subject } = req.query;
    const daysBack = parseInt(timeframe as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    let matchStage: any = {
      timestamp: { $gte: startDate }
    };

    if (subject) {
      // Get quiz IDs for the specified subject
      const quizzes = await Quiz.find({ subject: { $regex: subject, $options: 'i' } });
      const quizIds = quizzes.map(q => q._id);
      matchStage.quizId = { $in: quizIds };
    }

    // Aggregate analytics data
    const analytics = await Score.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: '$user' },
      { $unwind: '$quiz' },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$score' },
          averageAccuracy: { $avg: '$accuracy' },
          averageTimeSpent: { $avg: '$timeSpent' },
          uniqueStudents: { $addToSet: '$userId' },
          subjectBreakdown: {
            $push: {
              subject: '$quiz.subject',
              score: '$score',
              accuracy: '$accuracy'
            }
          },
          performanceOverTime: {
            $push: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              score: '$score',
              accuracy: '$accuracy'
            }
          }
        }
      },
      {
        $project: {
          totalAttempts: 1,
          averageScore: { $round: ['$averageScore', 1] },
          averageAccuracy: { $round: ['$averageAccuracy', 1] },
          averageTimeSpent: { $round: ['$averageTimeSpent', 0] },
          uniqueStudents: { $size: '$uniqueStudents' },
          subjectBreakdown: 1,
          performanceOverTime: 1
        }
      }
    ]);

    const response: ApiResponse<typeof analytics[0]> = {
      success: true,
      data: analytics[0] || {
        totalAttempts: 0,
        averageScore: 0,
        averageAccuracy: 0,
        averageTimeSpent: 0,
        uniqueStudents: 0,
        subjectBreakdown: [],
        performanceOverTime: []
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching progress analytics:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch progress analytics'
    };
    res.status(500).json(response);
  }
};
