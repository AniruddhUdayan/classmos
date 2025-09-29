import { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/express';

// Create Clerk client with hardcoded key
const clerkClient = createClerkClient({
  secretKey: "sk_test_obpYuZWfGuRHi9PrkVcXQnILcD5CD7Vvb6auCHYoBh"
});

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId?: string;
      };
    }
  }
}

// Middleware to verify Clerk JWT token
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔍 Auth middleware - Headers:', req.headers.authorization ? 'Token present' : 'No token');
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No authorization token provided');
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    console.log('🔍 Verifying token with Clerk...');
    // Verify the token with Clerk
    const payload = await verifyToken(token, {
      secretKey: "sk_test_obpYuZWfGuRHi9PrkVcXQnILcD5CD7Vvb6auCHYoBh"
    });
    
    if (!payload || !payload.sub) {
      console.log('❌ Token verification failed');
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    console.log('✅ Token verified, userId:', payload.sub);

    // Add user info to request
    req.auth = {
      userId: payload.sub, // Clerk user ID
      sessionId: payload.sid || undefined
    };

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Middleware to check user role
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get user from Clerk with retry logic
      let user;
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          console.log(`🔍 Getting user from Clerk (${4 - retries}/3):`, req.auth.userId);
          user = await clerkClient.users.getUser(req.auth.userId);
          break;
        } catch (error) {
          lastError = error;
          retries--;
          console.log(`❌ Clerk API error (${4 - retries}/3):`, error instanceof Error ? error.message : error);
          
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }
      
      if (!user) {
        console.error('❌ Failed to get user from Clerk after 3 attempts:', lastError);
        // Instead of failing, assume default role for now
        console.log('⚠️ Using fallback - assuming student role');
        const userRole = 'student'; // Default fallback role
        
        if (!roles.includes(userRole)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
        }
        
        next();
        return;
      }
      
      const userRole = user.publicMetadata?.role as string || 'student';

      if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify user role'
      });
    }
  };
};
