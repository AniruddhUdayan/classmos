# ClassMos Socket.io Server

A real-time WebSocket server for the ClassMos educational platform, providing live quiz functionality, leaderboards, and interactive features.

## Features

- 🎯 **Real-time Quiz Sessions**: Live quiz rooms with immediate scoring
- 🏆 **Live Leaderboards**: Real-time score updates and rankings
- 👥 **Room Management**: Dynamic quiz rooms per class/quiz
- 📊 **MongoDB Integration**: Persistent scoring and user progress
- 💬 **Chat Support**: General chat rooms for communication
- 🔐 **User Authentication**: Integration with Clerk authentication

## Environment Setup

Create a `.env` file in the `apps/socket` directory:

```env
# Server Configuration
SOCKET_PORT=4001
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/classmos

# Development
NODE_ENV=development
```

## Installation & Running

```bash
# Install dependencies
cd apps/socket
pnpm install

# Development mode
pnpm dev

# Production build
pnpm build
pnpm start
```

## Socket.io Event Contracts

### Connection

#### Client Connection
```typescript
const socket = io('http://localhost:4001');
```

### Quiz Room Events

#### 1. Join Quiz Room
**Event:** `quiz:joinRoom`

**Client sends:**
```typescript
{
  roomId: string;      // Unique room identifier (e.g., "quiz_123_room_456")
  quizId: string;      // MongoDB ObjectId of the quiz
  userInfo: {
    userId: string;    // User's unique identifier
    username: string;  // Display name
    email: string;     // User's email
  };
}
```

**Server responds:**
```typescript
// Event: 'quiz:roomJoined'
{
  room: {
    quizId: string;
    quizTitle: string;
    participants: QuizParticipant[];
    isActive: boolean;
    startedAt: string; // ISO timestamp
  };
  participant: {
    userId: string;
    username: string;
    socketId: string;
    joinedAt: string;
    currentScore: number;
    answersSubmitted: number;
    isCompleted: boolean;
  };
}
```

**Broadcast to room:**
```typescript
// Event: 'quiz:userJoinedRoom'
{
  userId: string;
  username: string;
  socketId: string;
  joinedAt: string;
  currentScore: number;
  answersSubmitted: number;
  isCompleted: boolean;
}
```

#### 2. Leave Quiz Room
**Event:** `quiz:leaveRoom`

**Client sends:**
```typescript
roomId: string
```

**Server responds:**
```typescript
// Event: 'quiz:roomLeft'
{
  roomId: string;
  participant: QuizParticipant;
}
```

**Broadcast to room:**
```typescript
// Event: 'quiz:userLeftRoom'
{
  userId: string;
  username: string;
  // ... other participant data
}
```

### Quiz Answer Events

#### 3. Submit Answer
**Event:** `quiz:submitAnswer`

**Client sends:**
```typescript
{
  roomId: string;
  quizId: string;
  questionIndex: number;    // 0-based index
  selectedAnswer: number;   // 0-based index of selected option
  timeSpent: number;        // Time spent on this question (seconds)
}
```

**Server responds to user:**
```typescript
// Event: 'quiz:answerSubmitted'
{
  questionIndex: number;
  isCorrect: boolean;
  score: number;
}
```

**Broadcast to room:**
```typescript
// Event: 'quiz:scoreUpdate'
{
  userId: string;
  username: string;
  questionIndex: number;
  isCorrect: boolean;
  currentScore: number;
  totalAnswered: number;
  timeSpent: number;
}
```

#### 4. Quiz Completion
**Event:** `quiz:completed`

**Client sends:**
```typescript
{
  roomId: string;
  quizId: string;
  answers: Array<{
    questionIndex: number;
    selectedAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
  }>;
  timeSpent: number; // Total quiz time
}
```

**Broadcast to room:**
```typescript
// Event: 'quiz:completed'
{
  userId: string;
  username: string;
  finalScore: number;
  accuracy: number;        // Percentage (0-100)
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  rank: number;           // Current rank in leaderboard
}
```

### Leaderboard Events

#### 5. Leaderboard Updates
**Event:** `quiz:leaderboardUpdate` (Auto-triggered)

**Server broadcasts:**
```typescript
{
  roomId: string;
  quizId: string;
  leaderboard: Array<{
    userId: string;
    username: string;
    score: number;
    accuracy: number;
    totalAnswered: number;
    timeSpent: number;
    isCompleted: boolean;
    rank: number;
  }>;
  updatedAt: string; // ISO timestamp
}
```

### Quiz State Events

#### 6. Quiz Start (Educator only)
**Event:** `quiz:started`

**Client sends:**
```typescript
{
  roomId: string;
  quizId: string;
}
```

**Broadcast to room:**
```typescript
{
  roomId: string;
  quizId: string;
  startedAt: string; // ISO timestamp
}
```

#### 7. Quiz End (Educator only)
**Event:** `quiz:ended`

**Client sends:**
```typescript
{
  roomId: string;
  quizId: string;
}
```

**Broadcast to room:**
```typescript
{
  roomId: string;
  quizId: string;
  endedAt: string; // ISO timestamp
}
```

### Error Events

#### 8. Error Handling
**Event:** `quiz:error`

**Server sends:**
```typescript
{
  message: string;
  error?: string; // Detailed error message
}
```

## Usage Examples

### Frontend Integration

#### React Hook Example
```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useQuizSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:4001');

    // Listen for leaderboard updates
    newSocket.on('quiz:leaderboardUpdate', (data) => {
      setLeaderboard(data.leaderboard);
    });

    // Listen for score updates
    newSocket.on('quiz:scoreUpdate', (data) => {
      console.log('Score update:', data);
    });

    // Listen for user join/leave
    newSocket.on('quiz:userJoinedRoom', (participant) => {
      setParticipants(prev => [...prev, participant]);
    });

    newSocket.on('quiz:userLeftRoom', (participant) => {
      setParticipants(prev => prev.filter(p => p.userId !== participant.userId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinQuizRoom = (roomId: string, quizId: string, userInfo: any) => {
    socket?.emit('quiz:joinRoom', { roomId, quizId, userInfo });
  };

  const submitAnswer = (roomId: string, quizId: string, questionIndex: number, selectedAnswer: number, timeSpent: number) => {
    socket?.emit('quiz:submitAnswer', {
      roomId,
      quizId,
      questionIndex,
      selectedAnswer,
      timeSpent
    });
  };

  return {
    socket,
    leaderboard,
    participants,
    joinQuizRoom,
    submitAnswer
  };
}
```

#### Join a Quiz Room
```typescript
const socket = io('http://localhost:4001');

socket.emit('quiz:joinRoom', {
  roomId: 'quiz_123_session_456',
  quizId: '507f1f77bcf86cd799439011',
  userInfo: {
    userId: 'user_789',
    username: 'John Doe',
    email: 'john@example.com'
  }
});
```

#### Submit an Answer
```typescript
socket.emit('quiz:submitAnswer', {
  roomId: 'quiz_123_session_456',
  quizId: '507f1f77bcf86cd799439011',
  questionIndex: 0,
  selectedAnswer: 2,
  timeSpent: 45
});
```

#### Listen for Real-time Updates
```typescript
// Score updates
socket.on('quiz:scoreUpdate', (data) => {
  console.log(\`\${data.username} answered question \${data.questionIndex}: \${data.isCorrect ? 'Correct!' : 'Incorrect'}\`);
  updateUIWithScore(data);
});

// Leaderboard updates
socket.on('quiz:leaderboardUpdate', (data) => {
  console.log('Updated leaderboard:', data.leaderboard);
  updateLeaderboardUI(data.leaderboard);
});

// User activity
socket.on('quiz:userJoinedRoom', (participant) => {
  console.log(\`\${participant.username} joined the quiz!\`);
  addParticipantToUI(participant);
});
```

## Testing

### Manual Testing with Sample Client

Run the sample test client:

```bash
cd apps/socket
npx tsx src/sampleEvents.ts
```

This will simulate multiple users joining a quiz room, submitting answers, and completing the quiz.

### Testing with Postman or Similar

You can also test using any Socket.io client or testing tool:

1. Connect to `http://localhost:4001`
2. Emit events according to the contracts above
3. Listen for responses and broadcasts

## Architecture

### Data Flow

1. **User joins quiz room** → Server creates/updates room data → Broadcasts to participants
2. **User submits answer** → Server validates → Updates score → Calculates leaderboard → Broadcasts updates
3. **Quiz completion** → Server saves to MongoDB → Updates user XP/streaks → Final leaderboard

### Database Integration

- **Users**: XP and streak updates in real-time
- **Quizzes**: Question validation and scoring
- **Scores**: Persistent storage of quiz results
- **Leaderboards**: Dynamic calculation based on current scores

### Room Management

- Quiz rooms are automatically created when users join
- Rooms are cleaned up when empty
- Each room maintains participant state
- Real-time synchronization across all participants

## Production Considerations

### Scaling
- Use Redis adapter for multi-server deployments
- Implement rate limiting for answer submissions
- Add connection limits per room

### Security
- Validate all incoming data
- Implement proper authentication
- Rate limit connections and events

### Monitoring
- Log all quiz events for analytics
- Monitor connection counts
- Track performance metrics

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check if server is running on correct port
2. **Room Not Found**: Ensure quiz exists in database
3. **Score Not Updating**: Verify answer format and question indices
4. **Leaderboard Empty**: Check if scores are being saved to database

### Debug Mode

Set `DEBUG=socket.io:*` environment variable for detailed socket.io logs.

## API Integration

The socket server integrates with the REST API (`apps/api`) for:
- User authentication and data
- Quiz data and questions
- Score persistence
- Progress tracking

Ensure both servers are running for full functionality.
