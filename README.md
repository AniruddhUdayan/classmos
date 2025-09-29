# Classmos - Educational Platform

A modern educational platform built with Next.js, Express.js, and Socket.io, featuring real-time communication and AI-powered tutoring.

## 🌐 Live Application

**Frontend:** [http://165.22.212.124:3000/](http://165.22.212.124:3000/)

## 🏗️ Architecture

This monorepo contains:
- **`apps/web`** - Next.js frontend application (Port 3000)
- **`apps/api`** - Express.js REST API server (Port 4000)
- **`apps/socket`** - Socket.io WebSocket server for real-time features (Port 4001)
- **`packages/types`** - Shared TypeScript types and interfaces
- **`packages/ui`** - Shared React components

## 🚀 Quick Setup

### Prerequisites
- Node.js >= 18
- pnpm >= 9.0.0
- MongoDB (local or Atlas)

### Local Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd classmos
   pnpm install
   ```

2. **Build the project:**
   ```bash
   pnpm build
   ```

3. **Start development servers:**
   ```bash
   # Start all services
   pnpm dev
   
   # Or start individually:
   pnpm --filter web dev       # Frontend (http://localhost:3000)
   pnpm --filter api dev       # API server (http://localhost:4000)
   pnpm --filter socket dev    # Socket server (http://localhost:4001)
   ```

### Docker Setup

1. **Build and run with Docker Compose:**
   ```bash
   # Build all services
   docker-compose build
   
   # Start all services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   
   # Stop services
   docker-compose down
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:4000
   - Socket: http://localhost:4001

## 📊 MongoDB Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  clerkId: String,           // Clerk user ID
  name: String,              // User's full name
  email: String,             // User's email
  role: String,              // "student" | "educator"
  createdAt: Date,
  updatedAt: Date,
  badges: [String],          // Array of earned badges
  totalScore: Number,        // Total gamification score
  level: Number,             // User level
  xp: Number                 // Experience points
}
```

### Quizzes Collection
```javascript
{
  _id: ObjectId,
  title: String,             // Quiz title
  description: String,       // Quiz description
  subject: String,           // Subject category
  questions: [{
    question: String,        // Question text
    options: [String],       // Answer options
    correctAnswer: Number,   // Index of correct answer
    explanation: String      // Explanation for answer
  }],
  createdBy: ObjectId,       // Reference to User
  timeLimit: Number,         // Time limit in minutes
  isActive: Boolean,         // Whether quiz is active
  createdAt: Date,
  updatedAt: Date
}
```

### Scores Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // Reference to User
  quizId: ObjectId,          // Reference to Quiz
  score: Number,             // Final score
  totalQuestions: Number,    // Total questions
  correctAnswers: Number,    // Correct answers
  timeSpent: Number,         // Time spent in seconds
  answers: [{
    questionIndex: Number,   // Question index
    selectedAnswer: Number,  // Selected answer index
    isCorrect: Boolean,      // Whether answer is correct
    timeSpent: Number        // Time spent on this question
  }],
  completedAt: Date,
  createdAt: Date
}
```

### Chat Sessions Collection
```javascript
{
  _id: ObjectId,
  sessionId: String,         // Unique session identifier
  userId: ObjectId,          // Reference to User
  messages: [{
    role: String,            // "user" | "tutor"
    content: String,         // Message content
    timestamp: Date,
    suggestions: [String]    // AI-generated suggestions
  }],
  isActive: Boolean,         // Whether session is active
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 API Documentation

### Base URL
- **Local:** `http://localhost:4000`
- **Production:** `http://165.22.212.124:4000`

### Authentication
All API endpoints require authentication via Clerk JWT token:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### User Endpoints

#### GET `/api/me`
Get current user information.
```javascript
// Response
{
  success: true,
  data: {
    _id: "user_id",
    clerkId: "clerk_user_id",
    name: "John Doe",
    email: "john@example.com",
    role: "student",
    badges: ["first_quiz"],
    totalScore: 100,
    level: 1,
    xp: 150
  }
}
```

#### POST `/api/users`
Create a new user.
```javascript
// Request Body
{
  name: "John Doe",
  email: "john@example.com",
  role: "student"
}
```

### Quiz Endpoints

#### GET `/api/quizzes`
Get quizzes with optional filters.
```javascript
// Query Parameters
?subject=math&limit=10&page=1&my_quizzes=true

// Response
{
  success: true,
  data: [
    {
      _id: "quiz_id",
      title: "Math Basics",
      description: "Basic math questions",
      subject: "math",
      questions: [...],
      timeLimit: 30,
      isActive: true
    }
  ]
}
```

#### GET `/api/quizzes/:id`
Get a specific quiz by ID.

#### POST `/api/quizzes`
Create a new quiz.
```javascript
// Request Body
{
  title: "New Quiz",
  description: "Quiz description",
  subject: "math",
  questions: [
    {
      question: "What is 2+2?",
      options: ["3", "4", "5", "6"],
      correctAnswer: 1,
      explanation: "2+2 equals 4"
    }
  ],
  timeLimit: 30
}
```

### Score Endpoints

#### POST `/api/scores`
Submit quiz score.
```javascript
// Request Body
{
  quizId: "quiz_id",
  score: 8,
  totalQuestions: 10,
  correctAnswers: 8,
  timeSpent: 1200,
  answers: [
    {
      questionIndex: 0,
      selectedAnswer: 1,
      isCorrect: true,
      timeSpent: 30
    }
  ]
}
```

#### GET `/api/scores`
Get user scores with optional filters.
```javascript
// Query Parameters
?quizId=quiz_id&limit=10&page=1
```

#### GET `/api/scores/leaderboard`
Get leaderboard data.
```javascript
// Query Parameters
?quizId=quiz_id&limit=50

// Response
{
  success: true,
  data: [
    {
      userId: "user_id",
      name: "John Doe",
      score: 95,
      rank: 1
    }
  ]
}
```

### Chat Endpoints

#### GET `/api/chat/sessions`
Get user's chat sessions.
```javascript
// Query Parameters
?limit=10&active_only=true
```

#### POST `/api/chat/message`
Send a message to AI tutor.
```javascript
// Request Body
{
  message: "Explain quadratic equations",
  sessionId: "optional_session_id"
}

// Response
{
  success: true,
  session: {
    sessionId: "session_id",
    messages: [...],
    isActive: true
  },
  suggestions: ["Try practice problems", "Review basics"]
}
```

### Gamification Endpoints

#### GET `/api/gamification/leaderboard`
Get gamification leaderboard.
```javascript
// Query Parameters
?limit=50

// Response
{
  success: true,
  data: [
    {
      userId: "user_id",
      name: "John Doe",
      totalScore: 1500,
      level: 5,
      xp: 2500,
      badges: ["math_master", "quick_learner"],
      rank: 1
    }
  ]
}
```

## 🔧 Development Scripts

### Root Commands
- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps for production
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm check-types` - Type check all packages

### Individual Apps
- `pnpm --filter web <script>` - Run script in web app
- `pnpm --filter api <script>` - Run script in API app
- `pnpm --filter socket <script>` - Run script in socket app


## 📁 Project Structure

```
classmos/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/              # Express.js API
│   └── socket/           # Socket.io server
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shared React components
│   ├── eslint-config/    # ESLint configurations
│   └── typescript-config/ # TypeScript configurations
├── docker/               # Docker configurations
├── docker-compose.yml    # Docker Compose setup
├── .env.example          # Environment variables template
├── turbo.json           # Turborepo configuration
└── package.json         # Root package configuration
```

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts:** Ensure ports 3000, 4000, 4001 are available
2. **MongoDB connection:** Verify MongoDB URI and network access
3. **Dependencies:** Run `pnpm install` at root to sync all packages

### Docker Issues

1. **Build failures:** Check Docker is running and has sufficient resources
2. **Port conflicts:** Stop local services before running Docker
3. **Network access:** Ensure the application can access external services

## 🤝 Contributing

1. Follow the established patterns in each app
2. Use shared types from `@repo/types`
3. Run `pnpm lint` and `pnpm check-types` before committing
4. Use `pnpm format` to maintain consistent code style

## 📞 Support

For issues or questions, please check the troubleshooting section or create an issue in the repository.

---

**Built with ❤️ using Next.js, Express.js, Socket.io, and MongoDB**