import mongoose, { Schema, Document } from 'mongoose';

export interface IScore extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  score: number;
  accuracy: number; // Percentage (0-100)
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  answers: {
    questionIndex: number;
    selectedAnswer: number;
    isCorrect: boolean;
    timeSpent: number; // time spent on this question in seconds
  }[];
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema({
  questionIndex: {
    type: Number,
    required: true,
    min: 0
  },
  selectedAnswer: {
    type: Number,
    required: true,
    min: 0
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  timeSpent: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const ScoreSchema = new Schema<IScore>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, 'Quiz ID is required']
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [0, 'Score cannot be negative']
  },
  accuracy: {
    type: Number,
    required: [true, 'Accuracy is required'],
    min: [0, 'Accuracy cannot be negative'],
    max: [100, 'Accuracy cannot exceed 100%']
  },
  totalQuestions: {
    type: Number,
    required: [true, 'Total questions count is required'],
    min: [1, 'Must have at least 1 question']
  },
  correctAnswers: {
    type: Number,
    required: [true, 'Correct answers count is required'],
    min: [0, 'Correct answers cannot be negative']
  },
  timeSpent: {
    type: Number,
    required: [true, 'Time spent is required'],
    min: [0, 'Time spent cannot be negative']
  },
  answers: {
    type: [AnswerSchema],
    required: true,
    validate: {
      validator: function(this: IScore, answers: typeof AnswerSchema[]) {
        return answers.length === this.totalQuestions;
      },
      message: 'Number of answers must match total questions'
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
ScoreSchema.index({ userId: 1, quizId: 1 });
ScoreSchema.index({ userId: 1, timestamp: -1 });
ScoreSchema.index({ quizId: 1, score: -1 });
ScoreSchema.index({ timestamp: -1 });

// Virtual for grade calculation
ScoreSchema.virtual('grade').get(function() {
  if (this.accuracy >= 90) return 'A';
  if (this.accuracy >= 80) return 'B';
  if (this.accuracy >= 70) return 'C';
  if (this.accuracy >= 60) return 'D';
  return 'F';
});

// Pre-save middleware to calculate accuracy if not provided
ScoreSchema.pre('save', function(next) {
  if (this.isModified('correctAnswers') || this.isModified('totalQuestions')) {
    this.accuracy = (this.correctAnswers / this.totalQuestions) * 100;
  }
  next();
});

const Score = mongoose.model<IScore>('Score', ScoreSchema);

export default Score;
