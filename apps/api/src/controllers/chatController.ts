import { Request, Response } from 'express';
import { ChatLog, User } from '../models/index.js';
import { getTutorResponse } from '../utils/gemini.js';
import type { ApiResponse, ChatRequest, TutorChatSession, TutorChatMessage } from '@repo/types';
import mongoose from 'mongoose';

/**
 * POST /api/chat - Send a message to the AI tutor and get a response
 */
export const sendChatMessage = async (req: Request, res: Response) => {
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

    const { message, sessionId }: ChatRequest = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    let chatSession;
    let conversationContext: string[] = [];

    // Find or create chat session
    if (sessionId) {
      chatSession = await ChatLog.findOne({ sessionId, userId: user._id });
      if (chatSession) {
        // Get recent conversation context (last 6 messages for context)
        const recentMessages = chatSession.messages.slice(-6);
        conversationContext = recentMessages.map(msg => 
          `${msg.sender}: ${msg.text}`
        );
      }
    }

    if (!chatSession) {
      // Create new chat session
      const newSessionId = sessionId || new mongoose.Types.ObjectId().toString();
      chatSession = new ChatLog({
        userId: user._id,
        sessionId: newSessionId,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [],
        isActive: true,
        lastActivity: new Date()
      });
    }

    // Add user message to chat
    const userMessage = {
      sender: 'user' as const,
      text: message.trim(),
      timestamp: new Date(),
      messageId: new mongoose.Types.ObjectId().toString()
    };
    
    chatSession.messages.push(userMessage);

    // Get AI response from Gemini with timeout
    let geminiResponse;
    try {
      console.log('💬 Requesting tutor response for message:', message.substring(0, 50) + '...');
      
      // Wait for Gemini response without artificial timeout - let it take as long as needed
      geminiResponse = await getTutorResponse(message, conversationContext);
      
      console.log('✅ Gemini response received successfully');
    } catch (error) {
      console.error('❌ Gemini API error:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : error);
      
      // Provide a fallback response when Gemini fails
      geminiResponse = {
        response: "I'm sorry, I'm having trouble connecting to my AI service right now. Please try asking your question again in a moment, or contact your teacher for help.",
        suggestions: ["Try asking again later", "Contact your teacher", "Check your internet connection"]
      };
    }
    
    // Add AI response to chat
    const aiMessage = {
      sender: 'ai' as const,
      text: geminiResponse.response,
      timestamp: new Date(),
      messageId: new mongoose.Types.ObjectId().toString()
    };
    
    chatSession.messages.push(aiMessage);
    chatSession.lastActivity = new Date();

    await chatSession.save();

    // Format messages for response
    const formattedMessages: TutorChatMessage[] = chatSession.messages.map(msg => ({
      id: msg.messageId,
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp.toISOString()
    }));

    const sessionData: TutorChatSession = {
      sessionId: chatSession.sessionId,
      messages: formattedMessages,
      isActive: chatSession.isActive,
      lastActivity: chatSession.lastActivity.toISOString()
    };

    const response: ApiResponse<{
      session: TutorChatSession;
      suggestions: string[];
    }> = {
      success: true,
      data: {
        session: sessionData,
        suggestions: geminiResponse.suggestions || []
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in chat:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process chat message'
    };
    res.status(500).json(response);
  }
};

/**
 * GET /api/chat/sessions - Get user's chat sessions
 */
export const getChatSessions = async (req: Request, res: Response) => {
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

    const { limit = 10, page = 1, active_only } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query: any = { userId: user._id };
    if (active_only === 'true') {
      query.isActive = true;
    }

    const sessions = await ChatLog.find(query)
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('sessionId title isActive lastActivity messageCount createdAt');

    const formattedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      title: session.title || 'Untitled Chat',
      isActive: session.isActive,
      lastActivity: session.lastActivity.toISOString(),
      messageCount: session.get('messageCount') || 0,
      createdAt: session.createdAt.toISOString()
    }));

    const response: ApiResponse<typeof formattedSessions> = {
      success: true,
      data: formattedSessions
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch chat sessions'
    };
    res.status(500).json(response);
  }
};

/**
 * GET /api/chat/sessions/:sessionId - Get a specific chat session with messages
 */
export const getChatSession = async (req: Request, res: Response) => {
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

    const { sessionId } = req.params;
    
    const session = await ChatLog.findOne({ 
      sessionId, 
      userId: user._id 
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }

    const formattedMessages: TutorChatMessage[] = session.messages.map(msg => ({
      id: msg.messageId,
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp.toISOString()
    }));

    const sessionData: TutorChatSession = {
      sessionId: session.sessionId,
      messages: formattedMessages,
      isActive: session.isActive,
      lastActivity: session.lastActivity.toISOString()
    };

    const response: ApiResponse<TutorChatSession> = {
      success: true,
      data: sessionData
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching chat session:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch chat session'
    };
    res.status(500).json(response);
  }
};

/**
 * PUT /api/chat/sessions/:sessionId - Update chat session (e.g., mark as inactive)
 */
export const updateChatSession = async (req: Request, res: Response) => {
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

    const { sessionId } = req.params;
    const { isActive, title } = req.body;
    
    const session = await ChatLog.findOne({ 
      sessionId, 
      userId: user._id 
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }

    // Update session properties
    if (typeof isActive === 'boolean') {
      session.isActive = isActive;
    }
    
    if (title && typeof title === 'string') {
      session.title = title.trim();
    }

    await session.save();

    const response: ApiResponse<{ sessionId: string; updated: boolean }> = {
      success: true,
      data: {
        sessionId: session.sessionId,
        updated: true
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating chat session:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to update chat session'
    };
    res.status(500).json(response);
  }
};
