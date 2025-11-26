import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import PublicKey from '../models/PublicKey';

const router = Router();

// Hash password using SHA-256
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters long' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create new user
    const user = new User({
      username,
      passwordHash,
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      username: user.username,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Verify password
    const passwordHash = hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    res.json({
      message: 'Login successful',
      username: user.username,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
