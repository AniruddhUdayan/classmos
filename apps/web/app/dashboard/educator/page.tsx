'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { useQuizSocket } from '../../../lib/socket';
import type { Quiz, UserProgress } from '@repo/types';
import { Button, Badge } from '@repo/ui';
import RoleGuard from '../../components/RoleGuard';

interface EducatorAnalytics {
  totalStudents: number;
  totalQuizzes: number;
  averageScore: number;
  activeQuizSessions: number;
  recentActivity: {
    date: string;
    quizzesTaken: number;
    averageScore: number;
  }[];
  topPerformers: {
    userId: string;
    userName: string;
    bestScore: number;
    totalQuizzes: number;
  }[];
  subjectPerformance: {
    subject: string;
    averageScore: number;
    totalAttempts: number;
  }[];
}

export default function EducatorDashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  // State
  const [analytics, setAnalytics] = useState<EducatorAnalytics | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Socket for live updates
  const { 
    isConnected, 
    participants, 
    leaderboard,
    actions: socketActions 
  } = useQuizSocket();

  // Remove old role check - now handled by RoleGuard

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (isLoaded && user && !error) {
        try {
          const token = await getToken();
          if (!token) {
            setError('Authentication required');
            return;
          }

          // Fetch analytics data from the API
          const analyticsData = await apiClient.getEducatorAnalytics(token);

          // Transform the API response to match our interface
          const transformedAnalytics: EducatorAnalytics = {
            totalStudents: analyticsData.totalStudents,
            totalQuizzes: analyticsData.totalQuizzes,
            averageScore: analyticsData.averageScore,
            activeQuizSessions: participants.length, // This comes from Socket.io
            recentActivity: analyticsData.recentActivity || [],
            topPerformers: analyticsData.topPerformers || [],
            subjectPerformance: analyticsData.subjectPerformance || []
          };

          setAnalytics(transformedAnalytics);
          setQuizzes(analyticsData.quizStats || []);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
          setError(error instanceof Error ? error.message : 'Failed to load dashboard');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
  }, [isLoaded, user, error, getToken, participants.length]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Data</h2>
          <p className="text-gray-600">Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['educator', 'admin']} fallbackPath="/dashboard/student">
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Educator Dashboard</h1>
              <p className="text-gray-600">Manage your classes and monitor student progress</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Live Updates' : 'Offline'}
                </span>
              </div>
              <Link href="/dashboard/educator/quizzes">
                <Button>Manage Quizzes</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📚</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🔴</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Live Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.activeQuizSessions}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Activity Chart */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {analytics.recentActivity.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-semibold text-sm">
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">{day.quizzesTaken} quizzes taken</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{day.averageScore}%</p>
                    <p className="text-xs text-gray-500">avg score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Performance */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
            <div className="space-y-4">
              {analytics.subjectPerformance.map((subject, index) => (
                <div key={subject.subject} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{subject.subject}</span>
                    <span className="text-sm text-gray-600">{subject.averageScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${subject.averageScore}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{subject.totalAttempts} attempts</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
            <div className="space-y-3">
              {analytics.topPerformers.map((student, index) => (
                <div key={student.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.userName}</p>
                      <p className="text-sm text-gray-500">{student.totalQuizzes} quizzes</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-600 text-white">
                    {student.bestScore}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Quizzes */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Quizzes</h3>
              <Link href="/dashboard/educator/quizzes">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
            {quizzes.length > 0 ? (
              <div className="space-y-3">
                {quizzes.slice(0, 5).map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{quiz.title}</p>
                      <p className="text-sm text-gray-500">{quiz.subject} • {quiz.questions.length} questions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </p>
                      <Badge variant="outline" className="text-xs text-gray-800 border-gray-300">
                        {quiz.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No quizzes created yet</p>
                <Link href="/dashboard/educator/quizzes">
                  <Button>Create Your First Quiz</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Live Sessions (if any) */}
        {participants.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Live Quiz Session ({participants.length} participants)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map((participant) => (
                <div key={participant.userId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-900">{participant.username}</span>
                  </div>
                  {participant.currentScore !== undefined && (
                    <Badge variant="outline" className="text-xs text-gray-800">
                      {participant.currentScore} pts
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/dashboard/educator/quizzes" className="group">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform group-hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Manage Quizzes</h3>
                  <p className="text-blue-100 text-sm">Create and edit quizzes</p>
                </div>
                <div className="text-3xl">📝</div>
              </div>
            </div>
          </Link>

          <Link href="/leaderboard" className="group">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform group-hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">View Leaderboard</h3>
                  <p className="text-purple-100 text-sm">Student rankings</p>
                </div>
                <div className="text-3xl">🏆</div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard" className="group">
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 transform group-hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">General Dashboard</h3>
                  <p className="text-green-100 text-sm">Overview</p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
      </div>
    </RoleGuard>
  );
}
