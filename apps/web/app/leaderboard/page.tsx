'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { useQuizSocket } from '../../lib/socket';
import type { Quiz } from '@repo/types';
import { Button, Badge, BadgeCard, XPProgress } from '@repo/ui';

interface LeaderboardEntry {
  _id: string;
  bestScore: number;
  bestAccuracy: number;
  totalQuizzes: number;
  averageScore: number;
  userName: string;
  userEmail: string;
  userXp: number;
  userStreaks: number;
}

interface GamificationLeaderboardEntry {
  rank: number;
  userId: any;
  username: string;
  totalXP: number;
  currentStreak: number;
  totalQuizzes: number;
  averageScore: number;
  badges: number;
  level: number;
  lastUpdated: string;
}

export default function LeaderboardPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  // State
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [staticLeaderboard, setStaticLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gamificationLeaderboard, setGamificationLeaderboard] = useState<GamificationLeaderboardEntry[]>([]);
  const [viewMode, setViewMode] = useState<'xp' | 'quiz'>('xp'); // Toggle between XP and quiz-based leaderboards
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'educator' | 'admin' | null>(null);

  // Debounce selected quiz id to avoid rapid multiple calls
  const [debouncedQuizId, setDebouncedQuizId] = useState<string>('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuizId(selectedQuizId), 200);
    return () => clearTimeout(t);
  }, [selectedQuizId]);

  // Socket for live updates
  const { 
    isConnected, 
    leaderboard: liveLeaderboard, 
    participants,
    actions: socketActions 
  } = useQuizSocket();

  // Load quizzes and leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      if (isLoaded && user) {
        try {
          const token = await getToken();
          if (!token) {
            setError('Authentication required');
            return;
          }

          // Fetch user role and other data
          const [userData, quizData, leaderboardData, gamificationData] = await Promise.all([
            fetch('http://16.16.78.233:4000/api/me', {
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.ok ? res.json() : null),
            apiClient.getQuizzes(token, { limit: 20 }),
            apiClient.getLeaderboard(token, { limit: 50 }),
            apiClient.getGamificationLeaderboard(token, 50)
          ]);

          if (userData?.data?.role) {
            setUserRole(userData.data.role);
          }

          setQuizzes(quizData);
          setStaticLeaderboard(leaderboardData);
          setGamificationLeaderboard(gamificationData);
        } catch (error) {
          console.error('Error fetching data:', error);
          setError(error instanceof Error ? error.message : 'Failed to load data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [isLoaded, user, getToken]);

  // Fetch quiz-specific leaderboard when quiz is selected
  useEffect(() => {
    const fetchQuizLeaderboard = async () => {
      if (debouncedQuizId && user) {
        try {
          const token = await getToken();
          if (!token) return;

          const leaderboardData = await apiClient.getLeaderboard(token, { 
            quizId: debouncedQuizId, 
            limit: 20 
          });
          setStaticLeaderboard(leaderboardData);
        } catch (error) {
          console.error('Error fetching quiz leaderboard:', error);
        }
      }
    };

    if (debouncedQuizId) {
      fetchQuizLeaderboard();
    }
  }, [debouncedQuizId, user, getToken]);

  const connectToLiveRoom = () => {
    if (selectedQuizId && user && isConnected) {
      const roomId = `leaderboard_${selectedQuizId}`;
      socketActions.joinQuizRoom({
        roomId,
        quizId: selectedQuizId,
        userInfo: {
          userId: user.id,
          username: user.fullName || user.firstName || 'Student',
          email: user.primaryEmailAddress?.emailAddress || ''
        }
      });
    }
  };

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
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // Use live leaderboard if available and connected, otherwise use static
  const displayLeaderboard = liveLeaderboard.length > 0 ? liveLeaderboard : staticLeaderboard;
  const isLiveData = liveLeaderboard.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
              <p className="text-gray-600">See how you rank against other students</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Live Updates' : 'Offline'}
                </span>
              </div>
              {isLiveData && (
                <Badge variant="default" className="bg-green-600 text-white">
                  Live Data
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Leaderboard Mode Toggle */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leaderboard Type</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode('xp')}
              className={`px-6 py-3 rounded-lg transition-all font-medium ${
                viewMode === 'xp'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏆 XP Leaderboard
            </button>
            <button
              onClick={() => setViewMode('quiz')}
              className={`px-6 py-3 rounded-lg transition-all font-medium ${
                viewMode === 'quiz'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📚 Quiz Leaderboard
            </button>
          </div>
        </div>

        {/* Quiz Filter - Only show for quiz mode */}
        {viewMode === 'quiz' && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Quiz</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedQuizId('')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedQuizId === ''
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overall Ranking
            </button>
            {quizzes.map((quiz) => (
              <button
                key={quiz.id}
                onClick={() => setSelectedQuizId(quiz.id)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedQuizId === quiz.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {quiz.title}
              </button>
            ))}
          </div>
          
          {selectedQuizId && !isLiveData && (
            <div className="mt-4">
              <Button onClick={connectToLiveRoom} size="sm">
                Connect to Live Updates
              </Button>
            </div>
          )}
          </div>
        )}

        {/* Live Participants (if connected to a room) */}
        {participants.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Live Participants ({participants.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <div key={participant.userId} className="flex items-center bg-blue-50 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-blue-800">{participant.username}</span>
                  {participant.currentScore !== undefined && (
                    <Badge variant="outline" className="ml-2 text-xs text-gray-800">
                      {participant.currentScore}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {/* Leaderboard Content */}
        {viewMode === 'xp' ? (
          /* XP-based Leaderboard */
          <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <h3 className="text-lg font-semibold">
                🏆 Experience Points Leaderboard
              </h3>
              <p className="text-purple-100 text-sm mt-1">Ranked by total XP and achievements</p>
            </div>

            {gamificationLeaderboard.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {gamificationLeaderboard.map((entry, index) => (
                  <div key={entry.userId} className={`
                    p-6 flex items-center justify-between hover:bg-gray-50 transition-colors
                    ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : ''}
                  `}>
                    <div className="flex items-center space-x-4">
                      {/* Rank */}
                      <div className={`
                        flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg
                        ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                          index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white' :
                          index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white' :
                          'bg-gray-100 text-gray-700'}
                      `}>
                        {index < 3 ? ['🥇', '🥈', '🥉'][index] : entry.rank}
                      </div>

                      {/* User Info */}
                      <div>
                        <h4 className="font-semibold text-gray-900">{entry.username}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Level {entry.level}</span>
                          <span>•</span>
                          <span>{entry.totalQuizzes} quizzes</span>
                          <span>•</span>
                          <span>{entry.averageScore}% avg</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-6">
                      {/* XP */}
                      <div className="text-center">
                        <div className="font-bold text-lg text-purple-600">
                          {entry.totalXP.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">XP</div>
                      </div>

                      {/* Streak */}
                      <div className="text-center">
                        <div className="font-bold text-lg text-orange-600">
                          {entry.currentStreak}
                        </div>
                        <div className="text-xs text-gray-500">Streak</div>
                      </div>

                      {/* Badges */}
                      <div className="text-center">
                        <div className="font-bold text-lg text-yellow-600">
                          {entry.badges}
                        </div>
                        <div className="text-xs text-gray-500">Badges</div>
                      </div>

                      {/* Level Progress */}
                      <div className="w-32">
                        <XPProgress
                          currentXP={entry.totalXP}
                          level={entry.level}
                          nextLevelXP={entry.level * 100}
                          currentLevelXP={(entry.level - 1) * 100}
                          size="sm"
                          showDetails={false}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No XP Data Available</h3>
                <p className="text-gray-500">Complete some quizzes to see the XP leaderboard!</p>
              </div>
            )}
          </div>
        ) : (
          /* Quiz-based Leaderboard */
          <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <h3 className="text-lg font-semibold">
                {selectedQuizId 
                  ? `📚 ${quizzes.find(q => q.id === selectedQuizId)?.title || 'Quiz'} Leaderboard`
                  : '📚 Overall Quiz Leaderboard'
                }
              </h3>
              {isLiveData && (
                <p className="text-blue-100 text-sm mt-1">🔴 Live updates enabled</p>
              )}
            </div>

          {displayLeaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Best Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accuracy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Quizzes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      XP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Streak
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayLeaderboard.map((entry, index) => {
                    const rank = isLiveData ? (entry as any).rank : index + 1;
                    const isCurrentUser = isLiveData 
                      ? (entry as any).userId === user?.id
                      : (entry as any)._id === user?.id;

                    return (
                      <tr 
                        key={isLiveData ? (entry as any).userId : (entry as any)._id}
                        className={`hover:bg-gray-50 ${isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              rank === 1 ? 'bg-yellow-500 text-white' :
                              rank === 2 ? 'bg-gray-400 text-white' :
                              rank === 3 ? 'bg-yellow-600 text-white' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {rank}
                            </div>
                            {rank <= 3 && (
                              <span className="ml-2 text-lg">
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {isLiveData ? (entry as any).username : (entry as any).userName}
                                {isCurrentUser && (
                                  <Badge variant="outline" className="ml-2 text-xs text-gray-800">You</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {isLiveData ? '' : (entry as any).userEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {isLiveData ? (entry as any).score : (entry as any).bestScore}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isLiveData 
                            ? `${(entry as any).accuracy?.toFixed(1) || 0}%`
                            : `${(entry as any).bestAccuracy?.toFixed(1) || 0}%`
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isLiveData ? (entry as any).totalAnswered || 0 : (entry as any).totalQuizzes || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isLiveData ? '-' : (entry as any).userXp?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900">
                              {isLiveData ? '-' : (entry as any).userStreaks || 0}
                            </span>
                            {!isLiveData && (entry as any).userStreaks > 0 && (
                              <span className="ml-1 text-orange-500">🔥</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No leaderboard data available.</p>
              <p className="text-sm text-gray-400 mt-2">
                Complete some quizzes to see rankings!
              </p>
            </div>
          )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button onClick={() => window.location.href = '/quiz'}>
            Take a Quiz
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              const dashboardPath = userRole === 'educator' || userRole === 'admin' 
                ? '/dashboard/educator' 
                : '/dashboard/student';
              window.location.href = dashboardPath;
            }}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
