import { Request, Response } from 'express';
import { Quiz, Score, User } from '../models';

export const getEducatorAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all students from the database
    const students = await User.find({ role: 'student' }).select('name email xp streaks totalQuizzes averageAccuracy badges createdAt');
    
    // Get all quizzes
    const quizzes = await Quiz.find({}).select('title subject questions createdAt');
    
    // Get all scores to calculate analytics
    const scores = await Score.find({}).populate('userId', 'name').populate('quizId', 'title subject');
    
    // Calculate total students
    const totalStudents = students.length;
    
    // Calculate total quizzes
    const totalQuizzes = quizzes.length;
    
    // Calculate average score across all students
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length)
      : 0;
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentScores = scores.filter(score => score.timestamp >= sevenDaysAgo);
    const recentActivity = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayScores = recentScores.filter(score => 
        score.timestamp >= dayStart && score.timestamp <= dayEnd
      );
      
      const dayAverage = dayScores.length > 0 
        ? Math.round(dayScores.reduce((sum, score) => sum + score.score, 0) / dayScores.length)
        : 0;
      
      recentActivity.push({
        date: dayStart.toISOString().split('T')[0],
        quizzesTaken: dayScores.length,
        averageScore: dayAverage
      });
    }
    
    // Get top performers (students with highest scores)
    const studentScores = new Map();
    scores.forEach(score => {
      const studentId = score.userId._id.toString();
      const studentName = (score.userId as any).name;
      
      if (!studentScores.has(studentId)) {
        studentScores.set(studentId, {
          userId: studentId,
          userName: studentName,
          bestScore: score.score,
          totalQuizzes: 1,
          totalScore: score.score
        });
      } else {
        const existing = studentScores.get(studentId);
        existing.bestScore = Math.max(existing.bestScore, score.score);
        existing.totalQuizzes += 1;
        existing.totalScore += score.score;
      }
    });
    
    const topPerformers = Array.from(studentScores.values())
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 5);
    
    // Get subject performance
    const subjectStats = new Map();
    scores.forEach(score => {
      const subject = (score.quizId as any).subject;
      if (!subjectStats.has(subject)) {
        subjectStats.set(subject, {
          subject,
          totalScore: score.score,
          totalAttempts: 1
        });
      } else {
        const existing = subjectStats.get(subject);
        existing.totalScore += score.score;
        existing.totalAttempts += 1;
      }
    });
    
    const subjectPerformance = Array.from(subjectStats.values()).map(stat => ({
      subject: stat.subject,
      averageScore: Math.round(stat.totalScore / stat.totalAttempts),
      totalAttempts: stat.totalAttempts
    }));
    
    // Get recent quizzes (last 5)
    const recentQuizzes = quizzes
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const analytics = {
      totalStudents,
      totalQuizzes,
      averageScore,
      activeQuizSessions: 0, // This comes from Socket.io
      recentActivity,
      topPerformers,
      subjectPerformance,
      quizStats: recentQuizzes
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching educator analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all students with their scores and progress
    const students = await User.find({ role: 'student' })
      .select('name email xp streaks totalQuizzes averageAccuracy badges createdAt')
      .sort({ totalScore: -1 });

    // Get scores for each student to calculate additional metrics
    const studentsWithScores = await Promise.all(
      students.map(async (student) => {
        const studentScores = await Score.find({ userId: student._id })
          .populate('quizId', 'title subject')
          .sort({ timestamp: -1 });

        const totalScore = studentScores.reduce((sum, score) => sum + score.score, 0);
        const averageScore = studentScores.length > 0 ? Math.round(totalScore / studentScores.length) : 0;
        const bestScore = studentScores.length > 0 ? Math.max(...studentScores.map(s => s.score)) : 0;
        const lastActivity = studentScores.length > 0 ? studentScores[0]?.timestamp : null;

        return {
          id: student._id.toString(),
          name: student.name,
          email: student.email,
          xp: student.xp,
          streaks: student.streaks,
          totalQuizzes: student.totalQuizzes,
          averageAccuracy: student.averageAccuracy,
          badges: student.badges,
          createdAt: student.createdAt,
          // Additional calculated metrics
          totalScore,
          averageScore,
          bestScore,
          lastActivity,
          totalAttempts: studentScores.length,
          recentScores: studentScores.slice(0, 5).map(score => ({
            quizTitle: (score.quizId as any).title,
            subject: (score.quizId as any).subject,
            score: score.score,
            timestamp: score.timestamp
          }))
        };
      })
    );

    res.json({
      success: true,
      data: studentsWithScores
    });
  } catch (error) {
    console.error('Error fetching all students:', error);
    res.status(500).json({
      error: 'Failed to fetch students',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getQuizResults = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Mock quiz results for now
    const mockResults = {
      results: [
        {
          id: '1',
          score: 85,
          grade: 'B',
          accuracy: 85,
          timeSpent: 300,
          timestamp: new Date().toISOString(),
          student: {
            id: 'student1',
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      ],
      total: 1,
      limit: 20,
      offset: 0,
      hasMore: false
    };

    res.json({
      success: true,
      data: mockResults
    });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({
      error: 'Failed to fetch quiz results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getClassAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const classAnalytics = {
      totalStudents: 30,
      totalQuizzesTaken: 150,
      averageClassScore: 78,
      participationRate: 85,
      improvementTrend: 'positive',
      strugglingStudents: [],
      topPerformers: []
    };

    res.json({
      success: true,
      data: classAnalytics
    });
  } catch (error) {
    console.error('Error fetching class analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch class analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
