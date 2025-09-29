import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import connectDB from './db.js';
import { QuizService } from './services/quizService.js';
import type { 
  ChatMessage, 
  UserPresence, 
  RoomData,
  JoinRoomPayload,
  SubmitAnswerPayload,
  QuizRoomData,
  LeaderboardUpdatePayload,
  QuizCompletedPayload,
  ScoreUpdatePayload
} from '@repo/types';
import { SocketEvents } from '@repo/types';

// Load environment variables
dotenv.config();

// Hardcode socket port to avoid env issues temporarily
const PORT = 4001;

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store active users and rooms (for general chat)
const activeUsers = new Map<string, UserPresence>();
const chatRooms = new Map<string, RoomData>();

// Store user-socket mapping for quiz sessions
const userSocketMap = new Map<string, string>(); // userId -> socketId
const socketUserMap = new Map<string, string>(); // socketId -> userId

// Initialize database connection
connectDB().catch(error => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});

// Socket connection handling
io.on('connection', socket => {
  console.log(`✅ User connected: ${socket.id}`);

  // =====================================
  // GENERAL CHAT EVENTS (existing)
  // =====================================

  // Handle user joining
  socket.on('user:join', (userData: UserPresence) => {
    activeUsers.set(socket.id, { ...userData, socketId: socket.id });
    socket.broadcast.emit('user:joined', userData);
    console.log(`👤 User joined: ${userData.username}`);
  });

  // Handle joining general chat rooms
  socket.on('room:join', (roomId: string) => {
    socket.join(roomId);

    if (!chatRooms.has(roomId)) {
      chatRooms.set(roomId, {
        id: roomId,
        participants: [],
        createdAt: new Date().toISOString(),
      });
    }

    const room = chatRooms.get(roomId)!;
    const user = activeUsers.get(socket.id);

    if (user && !room.participants.find(p => p.socketId === socket.id)) {
      room.participants.push(user);
      socket.to(roomId).emit('room:user_joined', user);
    }

    socket.emit('room:joined', room);
    console.log(`🏠 User ${user?.username || socket.id} joined chat room: ${roomId}`);
  });

  // Handle leaving general chat rooms
  socket.on('room:leave', (roomId: string) => {
    socket.leave(roomId);

    const room = chatRooms.get(roomId);
    const user = activeUsers.get(socket.id);

    if (room && user) {
      room.participants = room.participants.filter(p => p.socketId !== socket.id);
      socket.to(roomId).emit('room:user_left', user);

      // Clean up empty rooms
      if (room.participants.length === 0) {
        chatRooms.delete(roomId);
      }
    }

    console.log(`🚪 User ${user?.username || socket.id} left chat room: ${roomId}`);
  });

  // Handle chat messages
  socket.on('chat:message', (message: ChatMessage) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    const enrichedMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${socket.id}`,
      userId: user.userId,
      username: user.username,
      timestamp: new Date().toISOString(),
    };

    // Send to room or broadcast
    if (message.roomId) {
      socket.to(message.roomId).emit('chat:message', enrichedMessage);
    } else {
      socket.broadcast.emit('chat:message', enrichedMessage);
    }

    console.log(`💬 Message from ${user.username}: ${message.content}`);
  });

  // Handle typing indicators
  socket.on('chat:typing', (data: { roomId?: string; isTyping: boolean }) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    const typingData = { ...data, user };

    if (data.roomId) {
      socket.to(data.roomId).emit('chat:typing', typingData);
    } else {
      socket.broadcast.emit('chat:typing', typingData);
    }
  });

  // =====================================
  // QUIZ EVENTS (new)
  // =====================================

  // Handle joining quiz room
  socket.on(SocketEvents.JOIN_ROOM, async (payload: JoinRoomPayload) => {
    try {
      const { roomId, quizId, userInfo } = payload;
      
      // Store user-socket mapping
      userSocketMap.set(userInfo.userId, socket.id);
      socketUserMap.set(socket.id, userInfo.userId);

      // Create or get quiz room
      const quizRoom = await QuizService.createQuizRoom(quizId, roomId);
      
      // Add participant to room
      const participant = await QuizService.addParticipant(
        roomId,
        userInfo.userId,
        userInfo.username,
        socket.id
      );

      // Join socket room
      socket.join(roomId);

      // Notify others in the room
      socket.to(roomId).emit(SocketEvents.USER_JOINED_ROOM, participant);

      // Send room data to the user
      socket.emit(SocketEvents.ROOM_JOINED, {
        room: quizRoom,
        participant
      });

      console.log(`🎯 User ${userInfo.username} joined quiz room: ${roomId} for quiz: ${quizId}`);
    } catch (error) {
      console.error('Error joining quiz room:', error);
      socket.emit(SocketEvents.ERROR, {
        message: 'Failed to join quiz room',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle leaving quiz room
  socket.on(SocketEvents.LEAVE_ROOM, (roomId: string) => {
    try {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      // Remove participant from room
      const participant = QuizService.removeParticipant(roomId, socket.id);
      
      if (participant) {
        // Leave socket room
        socket.leave(roomId);
        
        // Notify others in the room
        socket.to(roomId).emit(SocketEvents.USER_LEFT_ROOM, participant);
        
        // Send confirmation to user
        socket.emit(SocketEvents.ROOM_LEFT, { roomId, participant });

        console.log(`🚪 User ${participant.username} left quiz room: ${roomId}`);
      }

      // Clean up mappings
      userSocketMap.delete(userId);
      socketUserMap.delete(socket.id);
    } catch (error) {
      console.error('Error leaving quiz room:', error);
      socket.emit(SocketEvents.ERROR, {
        message: 'Failed to leave quiz room',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle answer submission
  socket.on(SocketEvents.SUBMIT_ANSWER, async (payload: SubmitAnswerPayload) => {
    try {
      const userId = socketUserMap.get(socket.id);
      if (!userId) {
        socket.emit(SocketEvents.ERROR, { message: 'User not identified' });
        return;
      }

      // Process the answer
      const scoreUpdate: ScoreUpdatePayload = await QuizService.processAnswer({
        ...payload,
        isCorrect: undefined // Will be determined by the service
      });

      // Update with actual user info
      scoreUpdate.userId = userId;

      // Get the room to find username
      const room = QuizService.getQuizRoom(payload.roomId);
      const participant = room?.participants.find(p => p.userId === userId);
      if (participant) {
        scoreUpdate.username = participant.username;
        
        // Update participant's progress
        participant.currentScore = scoreUpdate.currentScore;
        participant.answersSubmitted = scoreUpdate.totalAnswered;
      }

      // Emit score update to the room
      io.to(payload.roomId).emit(SocketEvents.SCORE_UPDATE, scoreUpdate);

      // Confirm answer submission to the user
      socket.emit(SocketEvents.ANSWER_SUBMITTED, {
        questionIndex: payload.questionIndex,
        isCorrect: scoreUpdate.isCorrect,
        score: scoreUpdate.currentScore
      });

      // Calculate and emit updated leaderboard
      const leaderboard = await QuizService.calculateLeaderboard(payload.roomId);
      const leaderboardUpdate: LeaderboardUpdatePayload = {
        roomId: payload.roomId,
        quizId: payload.quizId,
        leaderboard,
        updatedAt: new Date().toISOString()
      };

      io.to(payload.roomId).emit(SocketEvents.LEADERBOARD_UPDATE, leaderboardUpdate);

      console.log(`📝 Answer submitted by ${scoreUpdate.username} for question ${payload.questionIndex}: ${scoreUpdate.isCorrect ? 'Correct' : 'Incorrect'}`);
    } catch (error) {
      console.error('Error processing answer:', error);
      socket.emit(SocketEvents.ERROR, {
        message: 'Failed to process answer',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle quiz completion (no DB write here; REST API owns persistence/X P)
  socket.on(SocketEvents.QUIZ_COMPLETED, async (payload: { roomId: string; quizId: string; answers: any[]; timeSpent: number }) => {
    try {
      const userId = socketUserMap.get(socket.id);
      if (!userId) {
        socket.emit(SocketEvents.ERROR, { message: 'User not identified' });
        return;
      }

      // Expect REST API to have already persisted score and XP.
      // Here we only compute leaderboard from DB and broadcast completion.
      const result = { score: { score: 0, accuracy: 0, totalQuestions: 0, correctAnswers: 0, timeSpent: payload.timeSpent } } as any;

      // Update participant as completed
      const room = QuizService.getQuizRoom(payload.roomId);
      const participant = room?.participants.find(p => p.userId === userId);
      if (participant) {
        participant.isCompleted = true;
      }

      // Calculate final leaderboard
      const leaderboard = await QuizService.calculateLeaderboard(payload.roomId);
      const userRank = leaderboard.findIndex(entry => entry.userId === userId) + 1;

      // Emit quiz completion
      const completionData: QuizCompletedPayload = {
        userId,
        username: participant?.username || 'Unknown',
        finalScore: leaderboard.find(e => e.userId === userId)?.score || 0,
        accuracy: leaderboard.find(e => e.userId === userId)?.accuracy || 0,
        totalQuestions: leaderboard.find(e => e.userId === userId)?.totalAnswered || 0,
        correctAnswers: 0,
        timeSpent: payload.timeSpent,
        rank: userRank
      };

      // Notify the room
      io.to(payload.roomId).emit(SocketEvents.QUIZ_COMPLETED, completionData);

      // Send updated leaderboard
      const leaderboardUpdate: LeaderboardUpdatePayload = {
        roomId: payload.roomId,
        quizId: payload.quizId,
        leaderboard,
        updatedAt: new Date().toISOString()
      };

      io.to(payload.roomId).emit(SocketEvents.LEADERBOARD_UPDATE, leaderboardUpdate);

      console.log(`🏁 Quiz completed by ${completionData.username} with score: ${completionData.finalScore}`);
    } catch (error) {
      console.error('Error completing quiz:', error);
      socket.emit(SocketEvents.ERROR, {
        message: 'Failed to complete quiz',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // =====================================
  // ADMIN/EDUCATOR EVENTS
  // =====================================

  // Start quiz (for educators)
  socket.on(SocketEvents.QUIZ_STARTED, (data: { roomId: string; quizId: string }) => {
    io.to(data.roomId).emit(SocketEvents.QUIZ_STARTED, {
      ...data,
      startedAt: new Date().toISOString()
    });
    console.log(`🚀 Quiz started in room: ${data.roomId}`);
  });

  // End quiz (for educators)
  socket.on(SocketEvents.QUIZ_ENDED, (data: { roomId: string; quizId: string }) => {
    QuizService.endQuizRoom(data.roomId);
    io.to(data.roomId).emit(SocketEvents.QUIZ_ENDED, {
      ...data,
      endedAt: new Date().toISOString()
    });
    console.log(`🏁 Quiz ended in room: ${data.roomId}`);
  });

  // =====================================
  // DISCONNECT HANDLING
  // =====================================

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    const userId = socketUserMap.get(socket.id);

    // Clean up general chat
    if (user) {
      // Remove user from all chat rooms
      chatRooms.forEach((room, roomId) => {
        const participantIndex = room.participants.findIndex(p => p.socketId === socket.id);
        if (participantIndex !== -1) {
          room.participants.splice(participantIndex, 1);
          socket.to(roomId).emit('room:user_left', user);

          // Clean up empty rooms
          if (room.participants.length === 0) {
            chatRooms.delete(roomId);
          }
        }
      });

      activeUsers.delete(socket.id);
      socket.broadcast.emit('user:left', user);
    }

    // Clean up quiz rooms
    if (userId) {
      const quizRooms = QuizService.getAllQuizRooms();
      quizRooms.forEach((room, roomId) => {
        const participant = QuizService.removeParticipant(roomId, socket.id);
        if (participant) {
          socket.to(roomId).emit(SocketEvents.USER_LEFT_ROOM, participant);
        }
      });

      userSocketMap.delete(userId);
      socketUserMap.delete(socket.id);
    }

    console.log(`❌ User disconnected: ${user?.username || userId || socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🔌 Socket server running on http://localhost:${PORT}`);
  console.log('📊 Database connected and ready');
  console.log('🎯 Quiz functionality enabled');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Socket server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Socket server closed');
    process.exit(0);
  });
});

// Export for testing
export { io, httpServer };