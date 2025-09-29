'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import MainLayout from '../components/MainLayout';
import RoleGuard from '../components/RoleGuard';
import { Button, Card, Badge } from '@repo/ui';
import { 
  TrophyIcon, 
  FireIcon, 
  StarIcon,
  BookOpenIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

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

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (isLoaded && user) {
        try {
          console.log('🔍 Fetching user data for:', user.id);
          const token = await getToken();
          
          if (!token) {
            console.error('❌ No authentication token available');
            setLoading(false);
            return;
          }

          console.log('🔍 Making API call to /api/me');
          const response = await fetch(`http://localhost:4000/api/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          console.log('🔍 API Response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ User data fetched successfully:', data.data);
            setUserData(data.data);
          } else {
            console.error('❌ API call failed:', response.status);
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [isLoaded, user, getToken]);

  if (!isLoaded || loading) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-semibold text-foreground">Loading Dashboard...</h2>
            <p className="text-muted-foreground">Fetching your profile...</p>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 max-w-md"
          >
            <h2 className="text-2xl font-semibold text-foreground">Not Signed In</h2>
            <p className="text-muted-foreground">Please sign in to access your dashboard.</p>
            <Button onClick={() => router.push('/auth/sign-in')}>
              Sign In
            </Button>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  const statsCards = [
    {
      title: 'Experience Points',
      value: userData?.xp || 0,
      icon: StarIcon,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Learning Streak',
      value: `${userData?.streaks || 0} days`,
      icon: FireIcon,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Badges Earned',
      value: userData?.badges?.length || 0,
      icon: TrophyIcon,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  ];

  const quickActions = userData?.role === 'educator' 
    ? [
        {
          title: 'Educator Dashboard',
          description: 'Manage classes and view detailed analytics',
          href: '/dashboard/educator',
          icon: ChartBarIcon,
          color: 'from-primary to-primary/80'
        },
        {
          title: 'Manage Quizzes',
          description: 'Create and edit quiz content',
          href: '/dashboard/educator/quizzes',
          icon: BookOpenIcon,
          color: 'from-blue-500 to-blue-600'
        },
        {
          title: 'View Leaderboard',
          description: 'Check student performance rankings',
          href: '/leaderboard',
          icon: TrophyIcon,
          color: 'from-purple-500 to-purple-600'
        }
      ]
    : [
        {
          title: 'Student Dashboard',
          description: 'Enhanced dashboard with detailed progress',
          href: '/dashboard/student',
          icon: ChartBarIcon,
          color: 'from-primary to-primary/80'
        },
        {
          title: 'Take Quiz',
          description: 'Test your knowledge with interactive quizzes',
          href: '/quiz',
          icon: BookOpenIcon,
          color: 'from-blue-500 to-blue-600'
        },
        {
          title: 'AI Tutor Chat',
          description: 'Get instant help from your AI tutor',
          href: '/chat',
          icon: ChatBubbleLeftIcon,
          color: 'from-green-500 to-green-600'
        }
      ];

  return (
    <RoleGuard allowedRoles={['student', 'educator', 'admin']}>
      <MainLayout userRole={userData?.role}>
      <div className="h-full overflow-auto custom-scrollbar">
        <div className="w-full p-6 space-y-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h1 className="text-4xl font-bold text-foreground">
              Welcome back, {user?.firstName || 'User'}! 👋
            </h1>
            <p className="text-xl text-muted-foreground">
              {userData?.role === 'educator' 
                ? 'Manage your classes and track student progress'
                : 'Ready to continue your learning journey?'
              }
            </p>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {userData?.role === 'educator' ? '👨‍🏫 Educator' : '🎓 Student'}
            </Badge>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {statsCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="p-6 card-hover leetcode-border">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-foreground">
              {userData?.role === 'educator' ? 'Educator Tools' : 'Quick Actions'}
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="group"
                >
                  <Card 
                    className="p-6 h-full cursor-pointer card-hover leetcode-border overflow-hidden relative"
                    onClick={() => router.push(action.href)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                    <div className="relative space-y-4">
                      <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <ArrowRightIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 leetcode-border">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {userData?.role === 'educator' 
                    ? 'Manage Your Educational Platform' 
                    : 'Enhance Your Learning Experience'
                  }
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {userData?.role === 'educator'
                    ? 'Access comprehensive tools to create quizzes, track student progress, and analyze performance metrics across your classes.'
                    : 'For a more detailed view of your progress, achievements, and personalized learning recommendations, visit the enhanced student dashboard.'
                  }
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => router.push(userData?.role === 'educator' ? '/dashboard/educator' : '/dashboard/student')}
                  className="mt-4"
                >
                  {userData?.role === 'educator' ? 'Go to Educator Dashboard' : 'Go to Student Dashboard'}
                  <ArrowRightIcon className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </MainLayout>
    </RoleGuard>
  );
}
