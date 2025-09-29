import { Request, Response } from 'express';
import { createClerkClient } from '@clerk/express';
import { User } from '../models/index.js';
import type { ApiResponse, QuizUser } from '@repo/types';

// Create Clerk client with hardcoded key
const clerkClient = createClerkClient({
  secretKey: "sk_test_obpYuZWfGuRHi9PrkVcXQnILcD5CD7Vvb6auCHYoBh"
});

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const dbUser = await User.findOne({ clerkId: req.auth.userId });

    // Don't auto-create users here - let onboarding handle it
    if (!dbUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found - needs onboarding'
      });
    }

    const response: ApiResponse<QuizUser> = {
      success: true,
      data: {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        xp: dbUser.xp,
        streaks: dbUser.streaks,
        badges: (dbUser.badges || []).map(b => typeof b === 'string' ? b : b.badgeId),
        totalScore: dbUser.get('totalScore'),
        createdAt: dbUser.createdAt.toISOString(),
        updatedAt: dbUser.updatedAt.toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching current user:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch user data'
    };
    res.status(500).json(response);
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    console.log('🔍 Creating user - Auth userId:', req.auth?.userId);
    console.log('🔍 Request body:', req.body);
    
    if (!req.auth?.userId) {
      console.log('❌ No auth userId provided');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { name, email, role } = req.body;
    console.log('🔍 Extracted data:', { name, email, role });

    let user = await User.findOne({ clerkId: req.auth.userId });
    console.log('🔍 Existing user found:', user ? 'Yes' : 'No');

    if (user) {
      console.log('🔄 Updating existing user');
      user.name = name || user.name;
      user.email = email || user.email;
      user.role = role || user.role;
      await user.save();
      console.log('✅ User updated successfully');
    } else {
      console.log('➕ Creating new user');
      user = new User({
        clerkId: req.auth.userId,
        name,
        email,
        role: role || 'student',
        xp: 0,
        streaks: 0,
        badges: []
      });
      await user.save();
      console.log('✅ New user created successfully');
    }

    // Update Clerk user metadata  
    console.log('🔍 Updating Clerk metadata with role:', user.role);
    try {
      await clerkClient.users.updateUserMetadata(req.auth.userId, {
        publicMetadata: {
          role: user.role
        }
      });
      console.log('✅ Clerk metadata updated successfully');
    } catch (metadataError) {
      console.error('⚠️ Failed to update Clerk metadata (non-critical):', metadataError);
      // Don't fail the request if metadata update fails
    }

    const response: ApiResponse<QuizUser> = {
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        streaks: user.streaks,
        badges: (user.badges || []).map(b => typeof b === 'string' ? b : b.badgeId),
        totalScore: user.get('totalScore'),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating/updating user:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to create/update user'
    };
    res.status(500).json(response);
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({}).select('-__v').sort({ totalScore: -1 });
    
    const response: ApiResponse<QuizUser[]> = {
      success: true,
      data: users.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        streaks: user.streaks,
        badges: (user.badges || []).map(b => typeof b === 'string' ? b : b.badgeId),
        totalScore: user.get('totalScore'),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }))
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching users:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch users'
    };
    res.status(500).json(response);
  }
};
