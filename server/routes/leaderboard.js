const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/leaderboard — Top NFTs by HP
router.get('/', (req, res) => {
  const { sort = 'hp', limit = 20, offset = 0 } = req.query;

  let orderBy = 'hp DESC, staked_at ASC';
  if (sort === 'score') orderBy = '(hp * CAST((julianday("now") - julianday(staked_at)) AS INTEGER)) DESC';

  const nfts = db.prepare(`SELECT *, CAST((julianday('now') - julianday(staked_at)) AS INTEGER) as days_staked FROM staked_nfts ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(Number(limit), Number(offset));
  const total = db.prepare('SELECT COUNT(*) as count FROM staked_nfts').get().count;

  res.json({ nfts, total });
});

// GET /api/leaderboard/stats — Game stats
router.get('/stats', (req, res) => {
  const alive = db.prepare('SELECT COUNT(*) as count FROM staked_nfts').get().count;
  const weak = db.prepare('SELECT COUNT(*) as count FROM staked_nfts WHERE hp <= 80').get().count;
  const dead = db.prepare('SELECT COUNT(*) as count FROM museum').get().count;
  const config = db.prepare('SELECT value FROM game_config WHERE key = ?').get('game_start');

  res.json({ alive, weak, dead, survivors: 20, gameStart: config?.value });
});

module.exports = router;
