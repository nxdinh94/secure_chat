import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sender: string;
  receiver: string;
  encryptedContent: string;
  messageHash: string;
  timestamp: Date;
}

const MessageSchema: Schema = new Schema({
  sender: {
    type: String,
    required: true,
    ref: 'User',
  },
  receiver: {
    type: String,
    required: true,
    ref: 'User',
  },
  encryptedContent: {
    type: String,
    required: true,
  },
  messageHash: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

MessageSchema.index({ sender: 1, receiver: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
