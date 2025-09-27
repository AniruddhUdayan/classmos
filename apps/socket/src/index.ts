import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import type { ChatMessage, UserPresence, RoomData } from '@repo/types';

// Load environment variables
dotenv.config();

const PORT = process.env.SOCKET_PORT || 4001;

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store active users and rooms
const activeUsers = new Map<string, UserPresence>();
const rooms = new Map<string, RoomData>();

// Socket connection handling
io.on('connection', socket => {
  console.log(`✅ User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user:join', (userData: UserPresence) => {
    activeUsers.set(socket.id, { ...userData, socketId: socket.id });
    socket.broadcast.emit('user:joined', userData);
    console.log(`👤 User joined: ${userData.username}`);
  });

  // Handle joining rooms
  socket.on('room:join', (roomId: string) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        participants: [],
        createdAt: new Date().toISOString(),
      });
    }

    const room = rooms.get(roomId)!;
    const user = activeUsers.get(socket.id);

    if (user && !room.participants.find(p => p.socketId === socket.id)) {
      room.participants.push(user);
      socket.to(roomId).emit('room:user_joined', user);
    }

    socket.emit('room:joined', room);
    console.log(`🏠 User ${user?.username || socket.id} joined room: ${roomId}`);
  });

  // Handle leaving rooms
  socket.on('room:leave', (roomId: string) => {
    socket.leave(roomId);

    const room = rooms.get(roomId);
    const user = activeUsers.get(socket.id);

    if (room && user) {
      room.participants = room.participants.filter(p => p.socketId !== socket.id);
      socket.to(roomId).emit('room:user_left', user);

      // Clean up empty rooms
      if (room.participants.length === 0) {
        rooms.delete(roomId);
      }
    }

    console.log(`🚪 User ${user?.username || socket.id} left room: ${roomId}`);
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

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);

    if (user) {
      // Remove user from all rooms
      rooms.forEach((room, roomId) => {
        const participantIndex = room.participants.findIndex(p => p.socketId === socket.id);
        if (participantIndex !== -1) {
          room.participants.splice(participantIndex, 1);
          socket.to(roomId).emit('room:user_left', user);

          // Clean up empty rooms
          if (room.participants.length === 0) {
            rooms.delete(roomId);
          }
        }
      });

      // Remove from active users
      activeUsers.delete(socket.id);
      socket.broadcast.emit('user:left', user);

      console.log(`❌ User disconnected: ${user.username}`);
    } else {
      console.log(`❌ Unknown user disconnected: ${socket.id}`);
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🔌 Socket server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Socket server closed');
    process.exit(0);
  });
});
