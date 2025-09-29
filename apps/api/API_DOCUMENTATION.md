# ClassMos API Documentation

## Overview

The ClassMos API provides REST endpoints for quiz management, scoring, progress tracking, and AI-powered tutoring. All endpoints require authentication via Clerk.

## Environment Setup

Create a `.env` file in the `apps/api` directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/classmos

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Google Gemini AI API
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=4000
NODE_ENV=development
```

## API Endpoints

### Authentication Endpoints

#### GET /api/me
Get current authenticated user information.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "xp": 150,
    "streaks": 5,
    "badges": ["first_quiz", "streak_master"],
    "totalScore": 850,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/users
Create or update user profile.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "student"
}
```

### Quiz Endpoints

#### POST /api/quizzes
Create a new quiz using Gemini AI (Educators/Admins only).

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Body:**
```json
{
  "subject": "Mathematics",
  "title": "Basic Algebra Quiz",
  "description": "Test your understanding of basic algebraic concepts",
  "difficulty": "easy",
  "questionCount": 5,
  "topics": ["linear equations", "variables", "basic operations"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "quiz_id",
    "subject": "Mathematics",
    "title": "Basic Algebra Quiz",
    "description": "Test your understanding of basic algebraic concepts",
    "questions": [
      {
        "question": "What is the value of x in the equation 2x + 3 = 7?",
        "options": ["1", "2", "3", "4"],
        "correctAnswer": 1,
        "difficulty": "easy"
      }
    ],
    "createdBy": "user_id",
    "isPublic": true,
    "timeLimit": 30,
    "questionCount": 5,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/quizzes
Get available quizzes.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Query Parameters:**
- `subject` (optional): Filter by subject
- `limit` (optional): Number of quizzes per page (default: 10)
- `page` (optional): Page number (default: 1)
- `my_quizzes` (optional): Set to "true" to get only user's created quizzes

#### GET /api/quizzes/:id
Get a specific quiz by ID.

**Headers:**
- `Authorization: Bearer <clerk_token>`

### Score Endpoints

#### POST /api/scores
Submit a quiz score.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Body:**
```json
{
  "quizId": "quiz_id",
  "answers": [
    {
      "questionIndex": 0,
      "selectedAnswer": 2,
      "timeSpent": 30
    }
  ],
  "timeSpent": 210
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "score_id",
    "userId": "user_id",
    "quizId": "quiz_id",
    "score": 80,
    "accuracy": 80,
    "totalQuestions": 5,
    "correctAnswers": 4,
    "timeSpent": 210,
    "answers": [...],
    "grade": "B",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Score submitted! Gained 8 XP. Current streak: 6"
}
```

#### GET /api/scores
Get user scores.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Query Parameters:**
- `quizId` (optional): Filter by specific quiz
- `userId` (optional): Filter by specific user (educators only)
- `limit` (optional): Number of scores per page (default: 10)
- `page` (optional): Page number (default: 1)
- `sortBy` (optional): Sort field (default: "timestamp")
- `order` (optional): Sort order "asc" or "desc" (default: "desc")

#### GET /api/scores/leaderboard
Get leaderboard rankings.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Query Parameters:**
- `quizId` (optional): Filter by specific quiz
- `limit` (optional): Number of entries (default: 10)

### Progress Endpoints

#### GET /api/progress
Get user's learning progress.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "weakTopics": ["quadratic equations", "factoring", "word problems"],
    "streaks": 5,
    "xp": 150,
    "totalQuizzes": 12,
    "averageScore": 78,
    "recentScores": [...]
  }
}
```

#### GET /api/progress/analytics
Get detailed analytics (Educators/Admins only).

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Query Parameters:**
- `timeframe` (optional): Days to look back (default: 30)
- `subject` (optional): Filter by subject

### Chat Endpoints

#### POST /api/chat
Send a message to the AI tutor.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Body:**
```json
{
  "message": "Can you explain the Pythagorean theorem?",
  "sessionId": "session_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "session_id",
      "messages": [
        {
          "id": "msg_id",
          "sender": "user",
          "text": "Can you explain the Pythagorean theorem?",
          "timestamp": "2024-01-01T00:00:00.000Z"
        },
        {
          "id": "msg_id_2",
          "sender": "ai",
          "text": "The Pythagorean theorem states that...",
          "timestamp": "2024-01-01T00:00:00.000Z"
        }
      ],
      "isActive": true,
      "lastActivity": "2024-01-01T00:00:00.000Z"
    },
    "suggestions": [
      "What are some applications of the Pythagorean theorem?",
      "How do you derive the Pythagorean theorem?",
      "Can you show me an example problem?"
    ]
  }
}
```

#### GET /api/chat/sessions
Get user's chat sessions.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Query Parameters:**
- `limit` (optional): Number of sessions per page (default: 10)
- `page` (optional): Page number (default: 1)
- `active_only` (optional): Set to "true" to get only active sessions

#### GET /api/chat/sessions/:sessionId
Get a specific chat session with messages.

**Headers:**
- `Authorization: Bearer <clerk_token>`

#### PUT /api/chat/sessions/:sessionId
Update a chat session.

**Headers:**
- `Authorization: Bearer <clerk_token>`

**Body:**
```json
{
  "isActive": false,
  "title": "New session title"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `401`: Authentication required
- `403`: Access denied (insufficient permissions)
- `404`: Resource not found
- `400`: Bad request (validation errors)
- `500`: Internal server error

## Development

### Start the server:
```bash
cd apps/api
npm run dev
```

### Build for production:
```bash
npm run build
npm start
```

### Testing with curl:

```bash
# Health check
curl http://localhost:4000/health

# Get current user (requires authentication)
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" http://localhost:4000/api/me

# Create a quiz (requires educator role)
curl -X POST http://localhost:4000/api/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "subject": "Mathematics",
    "title": "Test Quiz",
    "description": "A simple test quiz",
    "difficulty": "easy",
    "questionCount": 5
  }'
```

## Dependencies

Key dependencies installed:
- `express`: Web framework
- `mongoose`: MongoDB object modeling
- `@clerk/express`: Authentication middleware
- `@google/generative-ai`: Gemini AI integration
- `axios`: HTTP client
- `helmet`: Security middleware
- `cors`: Cross-origin resource sharing
- `morgan`: HTTP request logger

## Features Implemented

✅ **Quiz Generation**: Generate quizzes using Gemini AI with customizable difficulty and topics
✅ **Score Management**: Submit and retrieve quiz scores with detailed analytics
✅ **Progress Tracking**: Track learning progress with weak topic analysis using AI
✅ **AI Tutoring**: Interactive chat with AI tutor for educational support
✅ **Role-based Access**: Different permissions for students, educators, and admins
✅ **Authentication**: Integrated with Clerk for secure user management
✅ **Data Persistence**: MongoDB with Mongoose for robust data storage
✅ **Real-time Analytics**: Performance tracking and educational insights

All endpoints are fully functional with comprehensive error handling and validation.
