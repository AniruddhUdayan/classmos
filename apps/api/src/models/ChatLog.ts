import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  messageId: string;
}

export interface IChatLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionId: string; // Unique identifier for chat session
  title?: string; // Optional title for the conversation
  messages: IMessage[];
  isActive: boolean; // Whether the chat session is still active
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: [true, 'Message sender is required']
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [10000, 'Message cannot be more than 10000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  messageId: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  }
}, { _id: false });

const ChatLogSchema = new Schema<IChatLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    unique: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  messages: {
    type: [MessageSchema],
    default: [],
    validate: {
      validator: function(messages: IMessage[]) {
        return messages.length <= 1000; // Limit messages per session
      },
      message: 'Chat session cannot have more than 1000 messages'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
ChatLogSchema.index({ userId: 1, lastActivity: -1 });
ChatLogSchema.index({ sessionId: 1 });
ChatLogSchema.index({ userId: 1, isActive: 1 });
ChatLogSchema.index({ createdAt: -1 });

// Virtual for message count
ChatLogSchema.virtual('messageCount').get(function() {
  const messages = (this as any).messages as IMessage[] | undefined;
  return Array.isArray(messages) ? messages.length : 0;
});

// Virtual for last message
ChatLogSchema.virtual('lastMessage').get(function() {
  const messages = (this as any).messages as IMessage[] | undefined;
  return Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1] : null;
});

// Pre-save middleware to update lastActivity when messages are added
ChatLogSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = new Date();
  }
  next();
});

// Method to add a message to the chat
ChatLogSchema.methods.addMessage = function(sender: 'user' | 'ai', text: string) {
  const message: IMessage = {
    sender,
    text,
    timestamp: new Date(),
    messageId: new mongoose.Types.ObjectId().toString()
  };
  
  this.messages.push(message);
  this.lastActivity = new Date();
  return this.save();
};

const ChatLog = mongoose.model<IChatLog>('ChatLog', ChatLogSchema);

export default ChatLog;

