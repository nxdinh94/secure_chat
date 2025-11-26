import mongoose, { Schema, Document } from 'mongoose';

export interface IPublicKey extends Document {
  username: string;
  publicKey: string;
  createdAt: Date;
}

const PublicKeySchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    ref: 'User',
  },
  publicKey: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IPublicKey>('PublicKey', PublicKeySchema);
