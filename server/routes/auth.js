const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/auth/login — Register or login user by wallet address
router.post('/login', (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'Wallet address required' });

  const existing = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  if (existing) {
    db.prepare('UPDATE users SET last_seen = datetime("now") WHERE wallet = ?').run(wallet);
    return res.json({ user: existing, isNew: false });
  }

  // New user — give starting balance
  db.prepare('INSERT INTO users (wallet, mthy_balance) VALUES (?, ?)').run(wallet, 1000);
  const user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  res.json({ user, isNew: true });
});

// GET /api/auth/me?wallet=xxx — Get user data
router.get('/me', (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'Wallet required' });

  const user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const staked = db.prepare('SELECT * FROM staked_nfts WHERE wallet = ?').all(wallet);
  const earnRate = staked.length * 80;

  res.json({ user, staked, earnRate });
});

module.exports = router;
