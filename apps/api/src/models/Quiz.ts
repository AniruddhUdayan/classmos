import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface IQuiz extends Document {
  _id: mongoose.Types.ObjectId;
  subject: string;
  title: string;
  description?: string;
  questions: IQuestion[];
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  timeLimit?: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [500, 'Question cannot be more than 500 characters']
  },
  options: [{
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Option cannot be more than 200 characters']
  }],
  correctAnswer: {
    type: Number,
    required: [true, 'Correct answer index is required'],
    min: [0, 'Correct answer index must be 0 or greater']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: [true, 'Difficulty level is required'],
    default: 'medium'
  }
}, { _id: false });

const QuizSchema = new Schema<IQuiz>({
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject cannot be more than 100 characters']
  },
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  questions: {
    type: [QuestionSchema],
    required: [true, 'At least one question is required'],
    validate: [
      {
        validator: function(questions: IQuestion[]) {
          return questions.length > 0;
        },
        message: 'Quiz must have at least one question'
      },
      {
        validator: function(questions: IQuestion[]) {
          return questions.every(q => q.options.length >= 2 && q.correctAnswer < q.options.length);
        },
        message: 'Each question must have at least 2 options and a valid correct answer index'
      }
    ]
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  timeLimit: {
    type: Number,
    min: [1, 'Time limit must be at least 1 minute'],
    max: [240, 'Time limit cannot exceed 240 minutes']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
QuizSchema.index({ subject: 1 });
QuizSchema.index({ createdBy: 1 });
QuizSchema.index({ isPublic: 1 });
QuizSchema.index({ createdAt: -1 });

// Virtual for question count
QuizSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);

export default Quiz;

