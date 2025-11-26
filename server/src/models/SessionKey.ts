import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionKey extends Document {
  sender: string;
  receiver: string;
  encryptedKey: string;
  createdAt: Date;
}

const SessionKeySchema: Schema = new Schema({
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
  encryptedKey: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to quickly find session key between two users
SessionKeySchema.index({ sender: 1, receiver: 1 });

export default mongoose.model<ISessionKey>('SessionKey', SessionKeySchema);
