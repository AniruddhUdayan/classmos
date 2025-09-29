import { User, Quiz, Score } from '../models';
import type { 
  QuizRoomData, 
  QuizParticipant, 
  LeaderboardEntry, 
  SubmitAnswerPayload,
  ScoreUpdatePayload 
} from '@repo/types';

export class QuizService {
  // Store active quiz rooms
  private static quizRooms = new Map<string, QuizRoomData>();

  // Create or get quiz room
  static async createQuizRoom(quizId: string, roomId?: string): Promise<QuizRoomData> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const finalRoomId = roomId || `quiz_${quizId}_${Date.now()}`;
    
    if (this.quizRooms.has(finalRoomId)) {
      return this.quizRooms.get(finalRoomId)!;
    }

    const quizRoom: QuizRoomData = {
      quizId,
      quizTitle: quiz.title,
      participants: [],
      isActive: true,
      startedAt: new Date().toISOString()
    };

    this.quizRooms.set(finalRoomId, quizRoom);
    return quizRoom;
  }

  // Add participant to quiz room
  static async addParticipant(
    roomId: string, 
    userId: string, 
    username: string, 
    socketId: string
  ): Promise<QuizParticipant> {
    const room = this.quizRooms.get(roomId);
    if (!room) {
      throw new Error('Quiz room not found');
    }

    // Check if user is already in the room
    const existingParticipant = room.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      // Update socket ID for reconnection
      existingParticipant.socketId = socketId;
      return existingParticipant;
    }

    const participant: QuizParticipant = {
      userId,
      username,
      socketId,
      joinedAt: new Date().toISOString(),
      currentScore: 0,
      answersSubmitted: 0,
      isCompleted: false
    };

    room.participants.push(participant);
    return participant;
  }

  // Remove participant from quiz room
  static removeParticipant(roomId: string, socketId: string): QuizParticipant | null {
    const room = this.quizRooms.get(roomId);
    if (!room) {
      return null;
    }

    const participantIndex = room.participants.findIndex(p => p.socketId === socketId);
    if (participantIndex === -1) {
      return null;
    }

    const [participant] = room.participants.splice(participantIndex, 1);
    
    // Clean up empty rooms
    if (room.participants.length === 0) {
      this.quizRooms.delete(roomId);
    }

    return participant || null;
  }

  // Get quiz room
  static getQuizRoom(roomId: string): QuizRoomData | null {
    return this.quizRooms.get(roomId) || null;
  }

  // Process answer submission
  static async processAnswer(payload: SubmitAnswerPayload): Promise<ScoreUpdatePayload> {
    const { roomId, quizId, questionIndex, selectedAnswer, timeSpent } = payload;
    
    const room = this.quizRooms.get(roomId);
    if (!room) {
      throw new Error('Quiz room not found');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const question = quiz.questions[questionIndex];
    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect = selectedAnswer === question.correctAnswer;
    
    // Find participant by socketId (we'll need to track this separately)
    // For now, we'll return a sample response
    const scoreUpdate: ScoreUpdatePayload = {
      userId: 'user_id', // This should come from the authenticated user
      username: 'username', // This should come from the participant data
      questionIndex,
      isCorrect,
      currentScore: isCorrect ? 10 : 0, // Simple scoring
      totalAnswered: questionIndex + 1,
      timeSpent
    };

    return scoreUpdate;
  }

  // Calculate and update leaderboard
  static async calculateLeaderboard(roomId: string): Promise<LeaderboardEntry[]> {
    const room = this.quizRooms.get(roomId);
    if (!room) {
      throw new Error('Quiz room not found');
    }

    // Get scores from database for all participants
    // First, find users by their clerkId to get their MongoDB ObjectIds
    const users = await User.find({ clerkId: { $in: room.participants.map(p => p.userId) } });
    const userObjectIds = users.map(u => u._id);
    
    const scores = await Score.find({
      userId: { $in: userObjectIds },
      quizId: room.quizId
    }).populate('userId', 'name');

    // Create leaderboard entries
    const leaderboard: LeaderboardEntry[] = scores
      .map((score, index) => {
        // Find the corresponding user to get their clerkId
        const user = users.find(u => u._id.toString() === score.userId._id.toString());
        return {
          userId: user?.clerkId || score.userId._id.toString(), // Use clerkId for consistency
          username: (score.userId as any).name,
          score: score.score,
          accuracy: score.accuracy,
          totalAnswered: score.totalQuestions,
          timeSpent: score.timeSpent,
          isCompleted: true,
          rank: index + 1
        };
      })
      .sort((a, b) => {
        // Sort by score desc, then by time asc (faster completion)
        if (b.score !== a.score) return b.score - a.score;
        return a.timeSpent - b.timeSpent;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return leaderboard;
  }

  // Save quiz score to database
  static async saveScore(
    userId: string,
    quizId: string,
    answers: { questionIndex: number; selectedAnswer: number; isCorrect: boolean; timeSpent: number; }[],
    totalTimeSpent: number
  ): Promise<any> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Find user by clerkId instead of _id since userId is a Clerk string
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      throw new Error('User not found');
    }

    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const accuracy = (correctAnswers / answers.length) * 100;
    const score = Math.round(accuracy);

    const scoreRecord = new Score({
      userId: user._id, // Use the MongoDB ObjectId from the found user
      quizId,
      score,
      accuracy,
      totalQuestions: answers.length,
      correctAnswers,
      timeSpent: totalTimeSpent,
      answers
    });

    await scoreRecord.save();

    // Update user XP and streaks
    const xpGained = Math.round(accuracy / 10);
    user.xp += xpGained;
    
    if (accuracy >= 70) {
      user.streaks += 1;
    } else {
      user.streaks = 0;
    }

    await user.save();

    return {
      score: scoreRecord,
      xpGained,
      newXp: user.xp,
      newStreaks: user.streaks
    };
  }

  // Get all quiz rooms
  static getAllQuizRooms(): Map<string, QuizRoomData> {
    return this.quizRooms;
  }

  // End quiz room
  static endQuizRoom(roomId: string): boolean {
    const room = this.quizRooms.get(roomId);
    if (!room) {
      return false;
    }

    room.isActive = false;
    room.endedAt = new Date().toISOString();
    return true;
  }
}
