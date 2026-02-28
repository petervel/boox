import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );

    const token = jwt.sign(
      { id: result.insertId, username, email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: result.insertId, username, email } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
