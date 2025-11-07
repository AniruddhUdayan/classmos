import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { 
  JoinRoomPayload,
  SubmitAnswerPayload,
  QuizRoomData,
  QuizParticipant,
  ScoreUpdatePayload,
  LeaderboardUpdatePayload,
  LeaderboardEntry
} from '@repo/types';
import { SocketEvents } from '@repo/types';

const SOCKET_URL = 'http://16.16.78.233:4001';

// Socket context hook for quiz functionality
export function useQuizSocket(): {
  socket: Socket | null;
  isConnected: boolean;
  participants: QuizParticipant[];
  leaderboard: LeaderboardEntry[];
  quizRoom: QuizRoomData | null;
  lastScoreUpdate: ScoreUpdatePayload | null;
  error: string | null;
  actions: {
    joinQuizRoom: (payload: JoinRoomPayload) => void;
    leaveQuizRoom: (roomId: string) => void;
    submitAnswer: (payload: SubmitAnswerPayload) => void;
    completeQuiz: (payload: { roomId: string; quizId: string; answers: any[]; timeSpent: number }) => void;
    startQuiz: (data: { roomId: string; quizId: string }) => void;
    endQuiz: (data: { roomId: string; quizId: string }) => void;
  };
} {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quizRoom, setQuizRoom] = useState<QuizRoomData | null>(null);
  const [lastScoreUpdate, setLastScoreUpdate] = useState<ScoreUpdatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to socket server:', newSocket.id);
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from socket server');
      setIsConnected(false);
    });

    // Quiz room events
    newSocket.on(SocketEvents.ROOM_JOINED, (data: { room: QuizRoomData; participant: QuizParticipant }) => {
      console.log('🎯 Joined quiz room:', data);
      setQuizRoom(data.room);
      setParticipants(data.room.participants);
    });

    newSocket.on(SocketEvents.USER_JOINED_ROOM, (participant: QuizParticipant) => {
      console.log('👤 User joined room:', participant);
      setParticipants(prev => {
        const exists = prev.find(p => p.userId === participant.userId);
        if (exists) return prev;
        return [...prev, participant];
      });
    });

    newSocket.on(SocketEvents.USER_LEFT_ROOM, (participant: QuizParticipant) => {
      console.log('🚪 User left room:', participant);
      setParticipants(prev => prev.filter(p => p.userId !== participant.userId));
    });

    // Quiz answer events
    newSocket.on(SocketEvents.ANSWER_SUBMITTED, (data: any) => {
      console.log('📝 Answer submitted:', data);
    });

    newSocket.on(SocketEvents.SCORE_UPDATE, (data: ScoreUpdatePayload) => {
      console.log('🎯 Score update:', data);
      setLastScoreUpdate(data);
      
      // Update participant scores
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId 
          ? { ...p, currentScore: data.currentScore, answersSubmitted: data.totalAnswered }
          : p
      ));
    });

    // Leaderboard events
    newSocket.on(SocketEvents.LEADERBOARD_UPDATE, (data: LeaderboardUpdatePayload) => {
      console.log('🏆 Leaderboard update:', data);
      setLeaderboard(data.leaderboard);
    });

    // Quiz completion events
    newSocket.on(SocketEvents.QUIZ_COMPLETED, (data: any) => {
      console.log('🏁 Quiz completed:', data);
    });

    // Quiz state events
    newSocket.on(SocketEvents.QUIZ_STARTED, (data: any) => {
      console.log('🚀 Quiz started:', data);
    });

    newSocket.on(SocketEvents.QUIZ_ENDED, (data: any) => {
      console.log('🏁 Quiz ended:', data);
    });

    // Error events
    newSocket.on(SocketEvents.ERROR, (error: any) => {
      console.error('❌ Socket error:', error);
      setError(error.message || 'Socket error occurred');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Socket actions
  const joinQuizRoom = (payload: JoinRoomPayload) => {
    if (socket && isConnected) {
      socket.emit(SocketEvents.JOIN_ROOM, payload);
    } else {
      setError('Not connected to server');
    }
  };

  const leaveQuizRoom = (roomId: string) => {
    if (socket && isConnected) {
      socket.emit(SocketEvents.LEAVE_ROOM, roomId);
    }
  };

  const submitAnswer = (payload: SubmitAnswerPayload) => {
    if (socket && isConnected) {
      socket.emit(SocketEvents.SUBMIT_ANSWER, payload);
    } else {
      setError('Not connected to server');
    }
  };

  const completeQuiz = (payload: { roomId: string; quizId: string; answers: any[]; timeSpent: number }) => {
    if (socket && isConnected) {
      socket.emit(SocketEvents.QUIZ_COMPLETED, payload);
    }
  };

  const startQuiz = (data: { roomId: string; quizId: string }) => {
    if (socket && isConnected) {
      socket.emit(SocketEvents.QUIZ_STARTED, data);
    }
  };

  const endQuiz = (data: { roomId: string; quizId: string }) => {
    if (socket && isConnected) {
      socket.emit(SocketEvents.QUIZ_ENDED, data);
    }
  };

  return {
    socket,
    isConnected,
    participants,
    leaderboard,
    quizRoom,
    lastScoreUpdate,
    error,
    actions: {
      joinQuizRoom,
      leaveQuizRoom,
      submitAnswer,
      completeQuiz,
      startQuiz,
      endQuiz
    }
  };
}

// Simple socket hook for general use
export function useSocket(): { socket: Socket | null; isConnected: boolean } {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, isConnected };
}
