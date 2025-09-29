import type { CreateQuizRequest, SubmitScoreRequest, ChatRequest } from '@repo/types';

// Sample quiz creation requests
export const sampleQuizRequests: CreateQuizRequest[] = [
  {
    subject: 'Mathematics',
    title: 'Basic Algebra Quiz',
    description: 'Test your understanding of basic algebraic concepts',
    difficulty: 'easy',
    questionCount: 5,
    topics: ['linear equations', 'variables', 'basic operations']
  },
  {
    subject: 'Science',
    title: 'Physics Fundamentals',
    description: 'Introduction to physics concepts',
    difficulty: 'medium',
    questionCount: 7,
    topics: ['motion', 'forces', 'energy']
  },
  {
    subject: 'History',
    title: 'World War II',
    description: 'Major events and figures of WWII',
    difficulty: 'hard',
    questionCount: 10,
    topics: ['key battles', 'leaders', 'timeline']
  }
];

// Sample score submission (after taking a quiz)
export const sampleScoreSubmission: SubmitScoreRequest = {
  quizId: 'QUIZ_ID_PLACEHOLDER', // Will be replaced with actual quiz ID
  answers: [
    { questionIndex: 0, selectedAnswer: 2, timeSpent: 30 },
    { questionIndex: 1, selectedAnswer: 1, timeSpent: 45 },
    { questionIndex: 2, selectedAnswer: 0, timeSpent: 60 },
    { questionIndex: 3, selectedAnswer: 3, timeSpent: 40 },
    { questionIndex: 4, selectedAnswer: 2, timeSpent: 35 }
  ],
  timeSpent: 210 // Total time in seconds
};

// Sample chat messages for testing the tutor
export const sampleChatMessages: ChatRequest[] = [
  {
    message: "Can you explain the Pythagorean theorem?",
  },
  {
    message: "What is the difference between speed and velocity?",
  },
  {
    message: "How do I solve quadratic equations?",
  },
  {
    message: "What caused World War I?",
  },
  {
    message: "Can you help me understand photosynthesis?",
  }
];

// Sample API endpoints for testing
export const testEndpoints = {
  // Authentication endpoints (already exist)
  getCurrentUser: 'GET /api/me',
  createUser: 'POST /api/users',
  
  // Quiz endpoints
  createQuiz: 'POST /api/quizzes',
  getQuizzes: 'GET /api/quizzes',
  getQuizById: 'GET /api/quizzes/:id',
  getMyQuizzes: 'GET /api/quizzes?my_quizzes=true',
  
  // Score endpoints
  submitScore: 'POST /api/scores',
  getScores: 'GET /api/scores',
  getLeaderboard: 'GET /api/scores/leaderboard',
  
  // Progress endpoints
  getUserProgress: 'GET /api/progress',
  getProgressAnalytics: 'GET /api/progress/analytics',
  
  // Chat endpoints
  sendChatMessage: 'POST /api/chat',
  getChatSessions: 'GET /api/chat/sessions',
  getChatSession: 'GET /api/chat/sessions/:sessionId',
  updateChatSession: 'PUT /api/chat/sessions/:sessionId'
};

export const sampleCurlCommands = `
# Test creating a quiz (requires educator role)
curl -X POST http://localhost:4000/api/quizzes \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \\
  -d '${JSON.stringify(sampleQuizRequests[0], null, 2)}'

# Test getting quizzes
curl -X GET http://localhost:4000/api/quizzes \\
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Test submitting a score
curl -X POST http://localhost:4000/api/scores \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \\
  -d '${JSON.stringify(sampleScoreSubmission, null, 2)}'

# Test getting user progress
curl -X GET http://localhost:4000/api/progress \\
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Test chat with AI tutor
curl -X POST http://localhost:4000/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \\
  -d '${JSON.stringify(sampleChatMessages[0], null, 2)}'
`;

console.log('Sample data loaded. Use these for testing the API endpoints:');
console.log('Available endpoints:', testEndpoints);
console.log('\\nSample curl commands:\\n', sampleCurlCommands);
