import { Request, Response } from 'express';
import { Quiz, User } from '../models';
import { generateQuiz } from '../utils/gemini';
import type { ApiResponse, Quiz as QuizType, CreateQuizRequest } from '@repo/types';

/**
 * POST /api/quizzes - Generate a new quiz using Gemini AI
 */
export const createQuiz = async (req: Request, res: Response) => {
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

    const quizData: CreateQuizRequest = req.body;
    
    // Validate required fields
    if (!quizData.subject || !quizData.title) {
      return res.status(400).json({
        success: false,
        error: 'Subject and title are required'
      });
    }

    // Generate quiz using Gemini
    const geminiResponse = await generateQuiz(quizData);
    
    // Create quiz in database
    const quiz = new Quiz({
      subject: quizData.subject,
      title: quizData.title,
      description: quizData.description,
      questions: geminiResponse.questions,
      createdBy: user._id,
      isPublic: true,
      timeLimit: 30 // Default 30 minutes
    });

    await quiz.save();

    const response: ApiResponse<QuizType> = {
      success: true,
      data: {
        id: quiz._id.toString(),
        subject: quiz.subject,
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions,
        createdBy: quiz.createdBy.toString(),
        isPublic: quiz.isPublic,
        timeLimit: quiz.timeLimit,
        questionCount: quiz.questions.length,
        createdAt: quiz.createdAt.toISOString(),
        updatedAt: quiz.updatedAt.toISOString()
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating quiz:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create quiz'
    };
    res.status(500).json(response);
  }
};

/**
 * GET /api/quizzes - Fetch user's quizzes or public quizzes
 */
export const getQuizzes = async (req: Request, res: Response) => {
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

    const { subject, limit = 10, page = 1, my_quizzes } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: Record<string, unknown> = {};

    // If my_quizzes is true, only show user's created quizzes
    if (my_quizzes === 'true') {
      query.createdBy = user._id;
    } else {
      // Otherwise show public quizzes
      query.isPublic = true;
    }

    // Filter by subject if provided
    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    const quizzes = await Quiz.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const formattedQuizzes: QuizType[] = quizzes.map(quiz => ({
      id: quiz._id.toString(),
      subject: quiz.subject,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions,
      createdBy: quiz.createdBy.toString(),
      isPublic: quiz.isPublic,
      timeLimit: quiz.timeLimit,
      questionCount: quiz.questions.length,
      createdAt: quiz.createdAt.toISOString(),
      updatedAt: quiz.updatedAt.toISOString()
    }));

    const response: ApiResponse<QuizType[]> = {
      success: true,
      data: formattedQuizzes,
      message: `Found ${formattedQuizzes.length} quizzes`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch quizzes'
    };
    res.status(500).json(response);
  }
};

/**
 * GET /api/quizzes/:id - Get a specific quiz by ID
 */
export const getQuizById = async (req: Request, res: Response) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { id } = req.params;
    
    const quiz = await Quiz.findById(id).populate('createdBy', 'name email');
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Check if user can access this quiz
    const user = await User.findOne({ clerkId: req.auth.userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Allow access if quiz is public or user is the creator
    if (!quiz.isPublic && !quiz.createdBy._id.equals(user._id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this quiz'
      });
    }

    const response: ApiResponse<QuizType> = {
      success: true,
      data: {
        id: quiz._id.toString(),
        subject: quiz.subject,
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions,
        createdBy: quiz.createdBy._id.toString(),
        isPublic: quiz.isPublic,
        timeLimit: quiz.timeLimit,
        questionCount: quiz.questions.length,
        createdAt: quiz.createdAt.toISOString(),
        updatedAt: quiz.updatedAt.toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch quiz'
    };
    res.status(500).json(response);
  }
};
