import { io } from 'socket.io-client';
import type { 
  JoinRoomPayload, 
  SubmitAnswerPayload
} from '@repo/types';
import { SocketEvents } from '@repo/types';

// Sample Socket.io client for testing quiz events
export class QuizSocketClient {
  private socket: any;
  private serverUrl: string;

  constructor(serverUrl = 'http://localhost:4001') {
    this.serverUrl = serverUrl;
  }

  // Connect to server
  connect(): Promise<void> {
    return new Promise((resolve) => {
      this.socket = io(this.serverUrl);
      
      this.socket.on('connect', () => {
        console.log('✅ Connected to socket server:', this.socket.id);
        resolve();
      });

      this.setupEventListeners();
    });
  }

  // Setup event listeners
  private setupEventListeners() {
    // Quiz room events
    this.socket.on(SocketEvents.ROOM_JOINED, (data: any) => {
      console.log('🎯 Joined quiz room:', data);
    });

    this.socket.on(SocketEvents.USER_JOINED_ROOM, (participant: any) => {
      console.log('👤 User joined room:', participant);
    });

    this.socket.on(SocketEvents.USER_LEFT_ROOM, (participant: any) => {
      console.log('🚪 User left room:', participant);
    });

    // Quiz answer events
    this.socket.on(SocketEvents.ANSWER_SUBMITTED, (data: any) => {
      console.log('📝 Answer submitted:', data);
    });

    this.socket.on(SocketEvents.SCORE_UPDATE, (data: any) => {
      console.log('🎯 Score update:', data);
    });

    // Leaderboard events
    this.socket.on(SocketEvents.LEADERBOARD_UPDATE, (data: any) => {
      console.log('🏆 Leaderboard update:', data);
    });

    // Quiz completion events
    this.socket.on(SocketEvents.QUIZ_COMPLETED, (data: any) => {
      console.log('🏁 Quiz completed:', data);
    });

    // Error events
    this.socket.on(SocketEvents.ERROR, (error: any) => {
      console.error('❌ Socket error:', error);
    });
  }

  // Join a quiz room
  joinQuizRoom(payload: JoinRoomPayload) {
    this.socket.emit(SocketEvents.JOIN_ROOM, payload);
  }

  // Leave a quiz room
  leaveQuizRoom(roomId: string) {
    this.socket.emit(SocketEvents.LEAVE_ROOM, roomId);
  }

  // Submit an answer
  submitAnswer(payload: SubmitAnswerPayload) {
    this.socket.emit(SocketEvents.SUBMIT_ANSWER, payload);
  }

  // Complete quiz
  completeQuiz(payload: { roomId: string; quizId: string; answers: any[]; timeSpent: number }) {
    this.socket.emit(SocketEvents.QUIZ_COMPLETED, payload);
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('❌ Disconnected from socket server');
    }
  }
}

// Sample test scenarios
export const sampleTestScenarios = {
  // Test joining a quiz room
  testJoinRoom: (client: QuizSocketClient) => {
    const joinPayload: JoinRoomPayload = {
      roomId: 'quiz_room_123',
      quizId: '507f1f77bcf86cd799439011', // Sample MongoDB ObjectId
      userInfo: {
        userId: 'user_123',
        username: 'TestUser',
        email: 'test@example.com'
      }
    };

    client.joinQuizRoom(joinPayload);
  },

  // Test submitting answers
  testSubmitAnswers: (client: QuizSocketClient) => {
    const answers = [
      {
        roomId: 'quiz_room_123',
        quizId: '507f1f77bcf86cd799439011',
        questionIndex: 0,
        selectedAnswer: 2,
        timeSpent: 30
      },
      {
        roomId: 'quiz_room_123',
        quizId: '507f1f77bcf86cd799439011',
        questionIndex: 1,
        selectedAnswer: 1,
        timeSpent: 45
      },
      {
        roomId: 'quiz_room_123',
        quizId: '507f1f77bcf86cd799439011',
        questionIndex: 2,
        selectedAnswer: 0,
        timeSpent: 60
      }
    ];

    // Submit answers with delays
    answers.forEach((answer, index) => {
      setTimeout(() => {
        client.submitAnswer(answer);
      }, index * 2000); // 2 second delay between answers
    });
  },

  // Test quiz completion
  testCompleteQuiz: (client: QuizSocketClient) => {
    const completionPayload = {
      roomId: 'quiz_room_123',
      quizId: '507f1f77bcf86cd799439011',
      answers: [
        { questionIndex: 0, selectedAnswer: 2, isCorrect: true, timeSpent: 30 },
        { questionIndex: 1, selectedAnswer: 1, isCorrect: false, timeSpent: 45 },
        { questionIndex: 2, selectedAnswer: 0, isCorrect: true, timeSpent: 60 }
      ],
      timeSpent: 135
    };

    client.completeQuiz(completionPayload);
  }
};

// Example usage function
export async function runSampleTest() {
  console.log('🧪 Starting Socket.io Quiz Test...');
  
  // Create two clients to simulate multiple users
  const client1 = new QuizSocketClient();
  const client2 = new QuizSocketClient();

  try {
    // Connect both clients
    await client1.connect();
    await client2.connect();

    // Wait a bit for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Client 1 joins room
    console.log('\n📍 Test 1: Client 1 joining room...');
    sampleTestScenarios.testJoinRoom(client1);

    // Wait and then client 2 joins
    setTimeout(() => {
      console.log('\n📍 Test 2: Client 2 joining room...');
      const joinPayload: JoinRoomPayload = {
        roomId: 'quiz_room_123',
        quizId: '507f1f77bcf86cd799439011',
        userInfo: {
          userId: 'user_456',
          username: 'TestUser2',
          email: 'test2@example.com'
        }
      };
      client2.joinQuizRoom(joinPayload);
    }, 2000);

    // Submit answers from both clients
    setTimeout(() => {
      console.log('\n📍 Test 3: Submitting answers...');
      sampleTestScenarios.testSubmitAnswers(client1);
    }, 4000);

    setTimeout(() => {
      sampleTestScenarios.testSubmitAnswers(client2);
    }, 5000);

    // Complete quiz
    setTimeout(() => {
      console.log('\n📍 Test 4: Completing quiz...');
      sampleTestScenarios.testCompleteQuiz(client1);
    }, 12000);

    setTimeout(() => {
      sampleTestScenarios.testCompleteQuiz(client2);
    }, 13000);

    // Disconnect after test
    setTimeout(() => {
      client1.disconnect();
      client2.disconnect();
      console.log('\n✅ Test completed!');
    }, 15000);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runSampleTest();
}
