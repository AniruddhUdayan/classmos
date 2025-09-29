'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { useQuizSocket } from '../../../../lib/socket';
import type { Quiz, CreateQuizRequest, QuizScore } from '@repo/types';
import { Button, Badge, Input } from '@repo/ui';
import { motion } from 'framer-motion';
import RoleGuard from '../../../components/RoleGuard';

interface QuizWithStats extends Quiz {
  totalAttempts: number;
  averageScore: number;
  lastAttempt?: string;
}

interface QuizResultWithStudent {
  id: string;
  score: number;
  grade: string;
  accuracy: number;
  timeSpent: number;
  timestamp: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
}

export default function EducatorQuizzesPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  // State
  const [quizzes, setQuizzes] = useState<QuizWithStats[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResultWithStudent[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create quiz form state
  const [createForm, setCreateForm] = useState<CreateQuizRequest>({
    subject: '',
    title: '',
    description: '',
    difficulty: 'medium',
    questionCount: 5,
    topics: []
  });
  const [creating, setCreating] = useState(false);

  // Socket for live updates
  const { 
    isConnected, 
    participants, 
    leaderboard,
    actions: socketActions 
  } = useQuizSocket();

  // Remove old role check - now handled by RoleGuard

  // Fetch quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (isLoaded && user && !error) {
        try {
          const token = await getToken();
          if (!token) {
            setError('Authentication required');
            return;
          }

          const analyticsData = await apiClient.getEducatorAnalytics(token);
          
          // Use real quiz stats from the analytics API
          const quizzesWithStats: QuizWithStats[] = analyticsData.quizStats || [];

          setQuizzes(quizzesWithStats);
        } catch (error) {
          console.error('Error fetching quizzes:', error);
          setError(error instanceof Error ? error.message : 'Failed to load quizzes');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchQuizzes();
  }, [isLoaded, user, error, getToken]);

  // Fetch quiz results when a quiz is selected
  useEffect(() => {
    const fetchQuizResults = async () => {
      if (selectedQuiz && user) {
        try {
          const token = await getToken();
          if (!token) return;

          const results = await apiClient.getQuizResults(token, selectedQuiz.id, { 
            limit: 20,
            offset: 0
          });
          setQuizResults(results.results || []);
        } catch (error) {
          console.error('Error fetching quiz results:', error);
        }
      }
    };

    if (selectedQuiz) {
      fetchQuizResults();
    }
  }, [selectedQuiz, user, getToken]);

  const handleCreateQuiz = async () => {
    if (!user || creating) return;

    setCreating(true);
    try {
      const token = await getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const newQuiz = await apiClient.createQuiz(token, createForm);
      
      // Add to local state with mock stats
      const quizWithStats: QuizWithStats = {
        ...newQuiz,
        totalAttempts: 0,
        averageScore: 0,
        lastAttempt: undefined
      };
      
      setQuizzes(prev => [quizWithStats, ...prev]);
      setShowCreateForm(false);
      setCreateForm({
        subject: '',
        title: '',
        description: '',
        difficulty: 'medium',
        questionCount: 5,
        topics: []
      });
    } catch (error) {
      console.error('Error creating quiz:', error);
      setError(error instanceof Error ? error.message : 'Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  const startLiveSession = (quiz: Quiz) => {
    if (isConnected) {
      const roomId = `live_quiz_${quiz.id}_${Date.now()}`;
      socketActions.joinQuizRoom({
        roomId,
        quizId: quiz.id,
        userInfo: {
          userId: user?.id || 'educator',
          username: user?.fullName || 'Educator',
          email: user?.primaryEmailAddress?.emailAddress || ''
        }
      });
      // In a real implementation, you'd also start the quiz for students
      socketActions.startQuiz({ roomId, quizId: quiz.id });
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
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['educator', 'admin']} fallbackPath="/dashboard/student">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center border border-gray-100"
          >
            <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <h3 className="text-2xl font-bold text-gray-900">Creating your quiz…</h3>
            <p className="text-gray-600 mt-1">Gemini is generating high‑quality questions.</p>

            <div className="mt-6 space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-sm text-gray-700">Drafting questions</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-sm text-gray-700">Balancing options</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                <span className="text-sm text-gray-700">Finalizing correct answers</span>
              </div>
            </div>

            <div className="mt-6 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 w-1/3 bg-gradient-to-r from-blue-500 to-purple-600 animate-[progress_1.4s_ease_infinite] rounded-full" />
            </div>

            <p className="mt-4 text-xs text-gray-500">This can take a few seconds depending on difficulty and question count.</p>
          </motion.div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quiz Management</h1>
              <p className="text-gray-600">Create, manage, and monitor your quizzes</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/educator">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Button onClick={() => setShowCreateForm(true)}>
                Create New Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Quiz Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create New Quiz</h3>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiz Title
                </label>
                <Input
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter quiz title"
                  disabled={creating}
                  className="bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <Input
                  value={createForm.subject}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Mathematics, Science"
                  disabled={creating}
                  className="bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={createForm.difficulty}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  disabled={creating}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <Input
                  type="number"
                  min="3"
                  max="20"
                  value={createForm.questionCount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, questionCount: parseInt(e.target.value) || 5 }))}
                  disabled={creating}
                  className="bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this quiz covers"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                disabled={creating}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleCreateQuiz}
                disabled={!createForm.title || !createForm.subject || creating}
              >
                {creating ? 'Creating...' : 'Create Quiz'}
              </Button>
            </div>
          </div>
        )}

        {/* Live Session Info */}
        {participants.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  Live Quiz Session Active
                </h3>
                <p className="text-green-600">{participants.length} students participating</p>
              </div>
              <div className="flex space-x-2">
                <Link href="/leaderboard">
                  <Button variant="outline" size="sm">View Live Leaderboard</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quiz List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quizzes */}
          <div className="bg-white rounded-lg shadow-md border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Your Quizzes ({quizzes.length})</h3>
            </div>
            
            {quizzes.length > 0 ? (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {quizzes.map((quiz) => (
                  <div 
                    key={quiz.id} 
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedQuiz?.id === quiz.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedQuiz(quiz)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                        <p className="text-sm text-gray-600">{quiz.subject}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge variant="outline" className="text-xs text-gray-800">
                          {quiz.questions.length} questions
                        </Badge>
                        <Badge 
                          variant={quiz.isPublic ? 'default' : 'outline'}
                          className="text-xs text-gray-800"
                        >
                          {quiz.isPublic ? 'Public' : 'Private'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{quiz.totalAttempts} attempts</span>
                      <span>Avg: {quiz.averageScore}%</span>
                    </div>
                    
                    <div className="mt-3 flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          startLiveSession(quiz);
                        }}
                        disabled={!isConnected}
                      >
                        Start Live Session
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // In a real app, this would navigate to edit page
                          alert('Edit functionality would be implemented here');
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500 mb-4">No quizzes created yet</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  Create Your First Quiz
                </Button>
              </div>
            )}
          </div>

          {/* Quiz Results */}
          <div className="bg-white rounded-lg shadow-md border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedQuiz ? `Results: ${selectedQuiz.title}` : 'Quiz Results'}
              </h3>
            </div>
            
            {selectedQuiz ? (
              <div className="p-6">
                {/* Quiz Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {(selectedQuiz as QuizWithStats).totalAttempts}
                    </p>
                    <p className="text-sm text-gray-500">Total Attempts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {(selectedQuiz as QuizWithStats).averageScore}%
                    </p>
                    <p className="text-sm text-gray-500">Average Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedQuiz.questions.length}
                    </p>
                    <p className="text-sm text-gray-500">Questions</p>
                  </div>
                </div>

                {/* Recent Results */}
                {quizResults.length > 0 ? (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Recent Results</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {quizResults.map((result) => (
                        <div key={result.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{result.student?.name || 'Unknown Student'}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(result.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{result.score}%</p>
                            <Badge 
                              variant={result.grade === 'A' ? 'default' : result.grade === 'F' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {result.grade}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No results yet for this quiz</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500">Select a quiz to view results</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </RoleGuard>
  );
}
