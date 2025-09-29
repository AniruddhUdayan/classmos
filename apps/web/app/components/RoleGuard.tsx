'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@repo/ui';
import { motion } from 'framer-motion';
import { ShieldExclamationIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('student' | 'educator' | 'admin')[];
  fallbackPath?: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'educator';
  xp: number;
  streaks: number;
  badges: string[];
  totalScore?: number;
}

export default function RoleGuard({ children, allowedRoles, fallbackPath }: RoleGuardProps) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!isLoaded) return;
      
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          router.push('/auth/sign-in');
          return;
        }

        // Get user data from our database (more reliable than Clerk metadata)
        const response = await fetch('http://165.22.212.124:4000/api/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data.data);
          
          // Check if user's role is allowed
          if (!allowedRoles.includes(data.data.role)) {
            setAccessDenied(true);
          }
        } else {
          // User doesn't exist in database, redirect to onboarding
          router.push('/onboarding');
          return;
        }
      } catch (error) {
        console.error('Error checking user access:', error);
        router.push('/auth/sign-in');
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [isLoaded, user, getToken, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-900">Checking Access...</h2>
          <p className="text-gray-600">Verifying your permissions...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return <AccessDeniedPage userRole={userData?.role} fallbackPath={fallbackPath} />;
  }

  return <>{children}</>;
}

interface AccessDeniedPageProps {
  userRole?: string;
  fallbackPath?: string;
}

function AccessDeniedPage({ userRole, fallbackPath }: AccessDeniedPageProps) {
  const router = useRouter();
  
  const getRedirectPath = () => {
    if (fallbackPath) return fallbackPath;
    if (userRole === 'educator') return '/dashboard/educator';
    if (userRole === 'student') return '/dashboard/student';
    return '/dashboard';
  };

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'educator': return 'Educator';
      case 'student': return 'Student';
      default: return 'User';
    }
  };

  const getAccessMessage = () => {
    if (userRole === 'educator') {
      return "You don't have permission to access student pages. As an educator, you can manage quizzes and view analytics.";
    } else if (userRole === 'student') {
      return "You don't have permission to access educator pages. As a student, you can take quizzes and track your progress.";
    }
    return "You don't have permission to access this page.";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-8 max-w-md mx-auto px-6"
      >
        {/* Icon */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldExclamationIcon className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Access Denied
          </h1>
          <p className="text-gray-600 text-lg">
            {getAccessMessage()}
          </p>
        </motion.div>

        {/* User Role Badge */}
        {userRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-700"
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${
              userRole === 'educator' ? 'bg-blue-500' : 'bg-green-500'
            }`} />
            {getRoleDisplayName(userRole)} Account
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="space-y-4"
        >
          <Button
            onClick={() => router.push(getRedirectPath())}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Go to {getRoleDisplayName(userRole)} Dashboard
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="w-full"
          >
            General Dashboard
          </Button>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-sm text-gray-500 space-y-1"
        >
          <p>🔒 Role-based access control is active</p>
          <p>📋 Contact your administrator if you need different permissions</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

