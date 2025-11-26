import { Router, Request, Response } from 'express';
import User from '../models/User';
import PublicKey from '../models/PublicKey';
import Message from '../models/Message';
import SessionKey from '../models/SessionKey';

const router = Router();

// Store user's public key
router.post('/public-key', async (req: Request, res: Response) => {
  try {
    const { username, publicKey } = req.body;

    if (!username || !publicKey) {
      res.status(400).json({ error: 'Username and public key are required' });
      return;
    }

    // Verify user exists
    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update or create public key
    await PublicKey.findOneAndUpdate(
      { username },
      { username, publicKey },
      { upsert: true, new: true }
    );

    res.json({ message: 'Public key stored successfully' });
  } catch (error) {
    console.error('Store public key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's public key
router.get('/public-key/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const publicKey = await PublicKey.findOne({ username });
    if (!publicKey) {
      res.status(404).json({ error: 'Public key not found for this user' });
      return;
    }

    res.json({ username: publicKey.username, publicKey: publicKey.publicKey });
  } catch (error) {
    console.error('Get public key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user's public key (for logout)
router.delete('/public-key/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    await PublicKey.findOneAndDelete({ username });

    res.json({ message: 'Public key deleted successfully' });
  } catch (error) {
    console.error('Delete public key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const { sender, receiver, encryptedContent, messageHash } = req.body;

    if (!sender || !receiver || !encryptedContent || !messageHash) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    // Verify both users exist
    const senderUser = await User.findOne({ username: sender });
    const receiverUser = await User.findOne({ username: receiver });

    if (!senderUser || !receiverUser) {
      res.status(404).json({ error: 'Sender or receiver not found' });
      return;
    }

    const message = new Message({
      sender,
      receiver,
      encryptedContent,
      messageHash,
    });

    await message.save();

    res.status(201).json({
      message: 'Message sent successfully',
      messageId: message._id,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages between two users
router.get('/messages/:user1/:user2', async (req: Request, res: Response) => {
  try {
    const { user1, user2 } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    }).sort({ timestamp: 1 });

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users except the current user (only those with public keys - online users)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { exclude } = req.query;

    // Get all users with public keys (online users)
    const onlineUsers = await PublicKey.find().select('username');
    const onlineUsernames = onlineUsers.map(u => u.username);

    // Filter out the current user
    const filteredUsernames = exclude && typeof exclude === 'string'
      ? onlineUsernames.filter(username => username !== exclude)
      : onlineUsernames;

    // Get full user data for online users
    const users = await User.find({ username: { $in: filteredUsernames } }).select('username createdAt');

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Store encrypted session key
router.post('/session-key', async (req: Request, res: Response) => {
  try {
    const { sender, receiver, encryptedKey } = req.body;

    if (!sender || !receiver || !encryptedKey) {
      res.status(400).json({ error: 'Sender, receiver, and encrypted key are required' });
      return;
    }

    // Verify both users exist
    const senderUser = await User.findOne({ username: sender });
    const receiverUser = await User.findOne({ username: receiver });

    if (!senderUser || !receiverUser) {
      res.status(404).json({ error: 'Sender or receiver not found' });
      return;
    }

    // Store or update session key
    await SessionKey.findOneAndUpdate(
      { sender, receiver },
      { sender, receiver, encryptedKey },
      { upsert: true, new: true }
    );

    res.json({ message: 'Session key stored successfully' });
  } catch (error) {
    console.error('Store session key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get encrypted session key
router.get('/session-key/:sender/:receiver', async (req: Request, res: Response) => {
  try {
    const { sender, receiver } = req.params;

    // Try to find key in either direction (sender->receiver or receiver->sender)
    let sessionKey = await SessionKey.findOne({ sender, receiver });
    
    if (!sessionKey) {
      sessionKey = await SessionKey.findOne({ sender: receiver, receiver: sender });
    }

    if (!sessionKey) {
      res.status(404).json({ error: 'Session key not found' });
      return;
    }

    res.json({ 
      sender: sessionKey.sender,
      receiver: sessionKey.receiver,
      encryptedKey: sessionKey.encryptedKey 
    });
  } catch (error) {
    console.error('Get session key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
