// Export all models for easy importing
export { default as User } from './User';
export { default as Quiz } from './Quiz';
export { default as Score } from './Score';
export { default as ChatLog } from './ChatLog';
export { default as Leaderboard } from './LeaderboardEntry';

// Export interfaces
export type { IUser } from './User';
export type { IQuiz, IQuestion } from './Quiz';
export type { IScore } from './Score';
export type { IChatLog, IMessage } from './ChatLog';
export type { ILeaderboardEntry } from './LeaderboardEntry';

