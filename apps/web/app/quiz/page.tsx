'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api';
import { useQuizSocket } from '../../lib/socket';
import type { Quiz } from '@repo/types';
import { Button, Badge, Progress } from '@repo/ui';

interface QuizAnswer {
  questionIndex: number;
  selectedAnswer: number;
  timeSpent: number;
}

export default function QuizPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  
  // Quiz state
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Socket state
  const { 
    isConnected, 
    participants, 
    leaderboard, 
    lastScoreUpdate, 
    actions: socketActions,
    error: socketError 
  } = useQuizSocket();

  const [roomId, setRoomId] = useState<string>('');
  const [isInRoom, setIsInRoom] = useState(false);

  // Load available quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      if (isLoaded && user) {
        try {
          const token = await getToken();
          if (!token) {
            setError('Authentication required');
            return;
          }

          const quizData = await apiClient.getQuizzes(token, { limit: 10 });
          setQuizzes(quizData);
        } catch (error) {
          console.error('Error fetching quizzes:', error);
          setError(error instanceof Error ? error.message : 'Failed to load quizzes');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchQuizzes();
  }, [isLoaded, user, getToken]);

  // Timer for current question
  useEffect(() => {
    if (selectedQuiz && questionStartTime && !isCompleted) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - questionStartTime.getTime()) / 1000);
        setTimeSpent(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedQuiz, questionStartTime, isCompleted]);

  const startQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setTimeSpent(0);
    setQuizStartTime(new Date());
    setQuestionStartTime(new Date());
    setIsCompleted(false);

    // Generate room ID and join socket room
    const newRoomId = `quiz_${quiz.id}_${Date.now()}`;
    setRoomId(newRoomId);

    if (isConnected && user) {
      socketActions.joinQuizRoom({
        roomId: newRoomId,
        quizId: quiz.id,
        userInfo: {
          userId: user.id,
          username: user.fullName || user.firstName || 'Student',
          email: user.primaryEmailAddress?.emailAddress || ''
        }
      });
      setIsInRoom(true);
    }
  };

  const submitAnswer = async () => {
    if (!selectedQuiz || selectedAnswer === null || !questionStartTime) return;

    const questionTime = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000);
    const question = selectedQuiz.questions[currentQuestionIndex];
    if (!question) return;

    const answerData: QuizAnswer = {
      questionIndex: currentQuestionIndex,
      selectedAnswer,
      timeSpent: questionTime
    };

    setAnswers(prev => [...prev, answerData]);

    // Submit answer via socket for real-time updates
    if (isConnected && isInRoom) {
      socketActions.submitAnswer({
        roomId,
        quizId: selectedQuiz.id,
        questionIndex: currentQuestionIndex,
        selectedAnswer,
        timeSpent: questionTime
      });
    }

    // Move to next question or complete quiz
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setQuestionStartTime(new Date());
      setTimeSpent(0);
    } else {
      await completeQuiz([...answers, answerData]);
    }
  };

  const completeQuiz = async (finalAnswers: QuizAnswer[]) => {
    if (!selectedQuiz || !quizStartTime || !user) return;

    setIsCompleted(true);
    const totalTime = Math.floor((new Date().getTime() - quizStartTime.getTime()) / 1000);

    try {
      const token = await getToken();
      if (!token) return;

      const scoreData = {
        quizId: selectedQuiz.id,
        answers: finalAnswers.map(answer => ({
          questionIndex: answer.questionIndex,
          selectedAnswer: answer.selectedAnswer,
          timeSpent: answer.timeSpent
        })),
        timeSpent: totalTime
      };

      // If connected to a live room, complete via socket only (avoid duplicate DB writes)
      if (isConnected && isInRoom) {
        socketActions.completeQuiz({
          roomId,
          quizId: selectedQuiz.id,
          answers: finalAnswers.map(answer => ({
            ...answer,
            isCorrect: answer.selectedAnswer === (selectedQuiz.questions[answer.questionIndex]?.correctAnswer ?? -1)
          })),
          timeSpent: totalTime
        });
      } else {
        // Fallback to REST API when not in a live socket room
        await apiClient.submitScore(token, scoreData);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz results');
    }
  };

  const restartQuiz = () => {
    setSelectedQuiz(null);
    setIsCompleted(false);
    if (isInRoom && roomId) {
      socketActions.leaveQuizRoom(roomId);
      setIsInRoom(false);
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

  // Quiz selection screen
  if (!selectedQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="w-full px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Choose a Quiz</h1>
            <p className="text-gray-600">Select a quiz to test your knowledge</p>
            
            {/* Socket status */}
            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected to real-time server' : 'Connecting...'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>Subject: {quiz.subject}</span>
                    <div className="flex space-x-2">
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">{quiz.questions.length} questions</Badge>
                    </div>
                  </div>
                  
                  {quiz.timeLimit && (
                    <p className="text-sm text-gray-500 mb-4">Time limit: {quiz.timeLimit} minutes</p>
                  )}
                </div>
                
                <Button 
                  onClick={() => startQuiz(quiz)}
                  className="w-full"
                  disabled={!isConnected}
                >
                  Start Quiz
                </Button>
              </div>
            ))}
          </div>

          {quizzes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No quizzes available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Quiz completion screen
  if (isCompleted) {
    const correctAnswers = answers.filter(answer => 
      answer.selectedAnswer === (selectedQuiz.questions[answer.questionIndex]?.correctAnswer ?? -1)
    ).length;
    const accuracy = (correctAnswers / selectedQuiz.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="w-full px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Quiz Completed! 🎉</h1>
            <p className="text-gray-600">Great job on completing the quiz</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 border border-gray-100 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{correctAnswers}/{selectedQuiz.questions.length}</p>
                <p className="text-gray-600">Correct Answers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{accuracy.toFixed(1)}%</p>
                <p className="text-gray-600">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {Math.floor(answers.reduce((sum, a) => sum + a.timeSpent, 0) / 60)}m
                </p>
                <p className="text-gray-600">Time Taken</p>
              </div>
            </div>

            {lastScoreUpdate && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Real-time Update</h3>
                <p className="text-blue-800">
                  Your score has been updated live! Current position in room: {participants.length} participants
                </p>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              <Button onClick={restartQuiz}>Take Another Quiz</Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/leaderboard')}
              >
                View Leaderboard
              </Button>
            </div>
          </div>

          {/* Live Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Leaderboard</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry) => (
                  <div key={entry.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {entry.rank}
                      </span>
                      <span className="font-medium">{entry.username}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{entry.score}%</p>
                      <p className="text-sm text-gray-500">{entry.accuracy.toFixed(1)}% accuracy</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Quiz question screen
  const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Question Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load the current question</p>
          <Button onClick={restartQuiz}>Restart Quiz</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{selectedQuiz.title}</h1>
            <Badge variant="outline">
              {currentQuestionIndex + 1} of {selectedQuiz.questions.length}
            </Badge>
          </div>
          
          <Progress value={progress} className="mb-4" />
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Subject: {selectedQuiz.subject}</span>
            <span>Time on question: {timeSpent}s</span>
            {participants.length > 1 && (
              <span>{participants.length} participants online</span>
            )}
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-100 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === index
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <span className="font-medium mr-3">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Difficulty: <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">{currentQuestion.difficulty}</Badge>
            </div>
            
            <Button 
              onClick={submitAnswer}
              disabled={selectedAnswer === null}
            >
              {currentQuestionIndex < selectedQuiz.questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
            </Button>
          </div>
        </div>

        {/* Socket Error */}
        {socketError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Socket Error: {socketError}</p>
          </div>
        )}

        {/* Live Updates */}
        {lastScoreUpdate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Live Update</h3>
            <p className="text-blue-800">
              {lastScoreUpdate.username} just answered question {lastScoreUpdate.questionIndex + 1}: 
              <span className={lastScoreUpdate.isCorrect ? 'text-green-600' : 'text-red-600'}>
                {lastScoreUpdate.isCorrect ? ' Correct!' : ' Incorrect'}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
