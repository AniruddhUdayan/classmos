'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiClient } from '../../../lib/api';
import type { QuizUser, UserProgress } from '@repo/types';
import { Badge, BadgeCard, XPProgress, StreakCounter, Card, Button } from '@repo/ui';
import MainLayout from '../../components/MainLayout';
import RoleGuard from '../../components/RoleGuard';
import {
  TrophyIcon,
  FireIcon,
  StarIcon,
  ChartBarIcon,
  BookOpenIcon,
  ChatBubbleLeftIcon,
  AcademicCapIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  user: QuizUser;
  progress: UserProgress;
  gamification?: any;
  badges?: any[];
  levelProgress?: any;
}

export default function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (isLoaded && user) {
        try {
          const token = await getToken();
          if (!token) {
            setError('Authentication required');
            return;
          }

          // Fetch user data, progress, and gamification data in parallel
          const [userData, progressData, gamificationData, badgesData, levelProgressData] = await Promise.all([
            apiClient.getCurrentUser(token),
            apiClient.getUserProgress(token),
            apiClient.getGamificationSummary(token),
            apiClient.getAllBadges(token),
            apiClient.getLevelProgress(token)
          ]);

          setDashboardData({
            user: userData,
            progress: progressData,
            gamification: gamificationData,
            badges: badgesData,
            levelProgress: levelProgressData
          });
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
          setError(error instanceof Error ? error.message : 'Failed to load dashboard');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
  }, [isLoaded, user, getToken]);

  if (!isLoaded || loading) {
    return (
      <MainLayout userRole="student">
        <div className="h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-semibold text-foreground">Loading Dashboard...</h2>
            <p className="text-muted-foreground">Fetching your progress data...</p>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout userRole="student">
        <div className="h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl">⚠️</div>
            <h2 className="text-2xl font-bold text-destructive">Error Loading Dashboard</h2>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  if (!dashboardData) {
    return (
      <MainLayout userRole="student">
        <div className="h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl">📊</div>
            <h2 className="text-2xl font-bold text-foreground">No Data Available</h2>
            <p className="text-muted-foreground max-w-md">Unable to load dashboard data</p>
            <Button onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  const { user: userData, progress, gamification, badges, levelProgress } = dashboardData;

  const quickActionCards = [
    {
      title: 'Take Quiz',
      description: 'Test your knowledge',
      href: '/quiz',
      icon: BookOpenIcon,
      color: 'from-blue-500 to-blue-600',
      emoji: '📝'
    },
    {
      title: 'Leaderboard',
      description: 'See your ranking',
      href: '/leaderboard',
      icon: TrophyIcon,
      color: 'from-purple-500 to-purple-600',
      emoji: '🏆'
    },
    {
      title: 'AI Tutor',
      description: 'Get help instantly',
      href: '/chat',
      icon: ChatBubbleLeftIcon,
      color: 'from-green-500 to-green-600',
      emoji: '🤖'
    },
    {
      title: 'Overview',
      description: 'General dashboard',
      href: '/dashboard',
      icon: ChartBarIcon,
      color: 'from-gray-500 to-gray-600',
      emoji: '📊'
    }
  ];

  return (
    <RoleGuard allowedRoles={['student']} fallbackPath="/dashboard/educator">
      <MainLayout userRole="student">
      <div className="h-full overflow-auto custom-scrollbar">
        <div className="w-full p-6 space-y-8">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
                <AcademicCapIcon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">Student Dashboard</h1>
            </div>
            <p className="text-xl text-muted-foreground">
              Welcome back, <span className="text-primary font-semibold">{userData.name}</span>! 🎓
            </p>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Student Account
            </Badge>
          </motion.div>

          {/* Gamification Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* XP Progress */}
            <Card className="p-6 leetcode-border card-hover">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <StarIcon className="w-5 h-5 text-primary mr-2" />
                Level Progress
              </h3>
              {levelProgress ? (
                <XPProgress
                  currentXP={levelProgress.totalXP}
                  level={levelProgress.currentLevel}
                  nextLevelXP={levelProgress.nextLevelXP}
                  currentLevelXP={levelProgress.currentLevelXP}
                  size="md"
                  showDetails={true}
                />
              ) : (
                <div className="animate-pulse">
                  <div className="h-12 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded"></div>
                </div>
              )}
            </Card>

            {/* Streak Counter */}
            <Card className="p-6 leetcode-border card-hover">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <FireIcon className="w-5 h-5 text-orange-500 mr-2" />
                Learning Streak
              </h3>
              {gamification ? (
                <StreakCounter
                  currentStreak={gamification.streak}
                  maxStreak={progress.streaks}
                  size="md"
                  showMaxStreak={true}
                  animated={true}
                />
              ) : (
                <div className="animate-pulse">
                  <div className="h-16 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              )}
            </Card>

            {/* Quick Stats */}
            <Card className="p-6 leetcode-border card-hover">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <ChartBarIcon className="w-5 h-5 text-primary mr-2" />
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Quizzes</span>
                  <span className="font-bold text-foreground">{progress.totalQuizzes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Score</span>
                  <span className="font-bold text-primary">{progress.averageScore}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total XP</span>
                  <span className="font-bold text-primary">{userData.xp.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Badges Earned</span>
                  <span className="font-bold text-primary">{userData.badges.length}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Content Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Weak Topics */}
            <Card className="p-6 leetcode-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                ⚠️ Areas for Improvement
              </h3>
              {progress.weakTopics.length > 0 ? (
                <div className="space-y-3">
                  {progress.weakTopics.map((topic, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20 card-hover"
                    >
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                        <span className="text-foreground">{topic}</span>
                      </div>
                      <Link 
                        href={`/chat?topic=${encodeURIComponent(topic)}`}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors flex items-center"
                      >
                        Get Help <ArrowRightIcon className="ml-1 w-3 h-3" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-muted-foreground">Great job! No weak areas identified.</p>
                </div>
              )}
            </Card>

            {/* Badges */}
            <Card className="p-6 leetcode-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <TrophyIcon className="w-5 h-5 text-primary mr-2" />
                Your Badges
              </h3>
              {badges && badges.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {badges.filter(badge => badge.earned).map((badge, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <BadgeCard
                          badge={badge}
                          earned={badge.earned}
                          earnedAt={badge.earnedAt}
                          size="sm"
                          showDescription={false}
                        />
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Badge Progress */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Badge Progress</span>
                      <span className="font-medium text-foreground">
                        {badges.filter(b => b.earned).length} / {badges.length}
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-muted rounded-full h-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${badges.length > 0 ? (badges.filter(b => b.earned).length / badges.length) * 100 : 0}%` 
                        }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="bg-primary h-2 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🏆</div>
                  <p className="text-muted-foreground mb-4">No badges earned yet</p>
                  <p className="text-sm text-muted-foreground">Complete quizzes and maintain streaks to earn badges!</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Action Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-foreground">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActionCards.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="group"
                >
                  <Link href={action.href}>
                    <Card className="p-6 h-full cursor-pointer card-hover leetcode-border overflow-hidden relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center`}>
                            <action.icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-2xl">{action.emoji}</div>
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
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recent Scores */}
          {progress.recentScores.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6 leetcode-border">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  📊 Recent Quiz Results
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Accuracy
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {progress.recentScores.slice(0, 5).map((score, index) => (
                        <motion.tr 
                          key={index} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {new Date(score.timestamp).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {score.score}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {score.accuracy.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant={score.grade === 'A' ? 'default' : score.grade === 'B' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {score.grade}
                            </Badge>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
    </RoleGuard>
  );
}
