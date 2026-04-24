const express = require('express');
const router = express.Router();
const db = require('../db');

const EARN_PER_DAY = 80;

// POST /api/claim — Claim pending $MTHY earnings
router.post('/', (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const staked = db.prepare('SELECT * FROM staked_nfts WHERE wallet = ?').all(wallet);
  if (staked.length === 0) return res.status(400).json({ error: 'No staked NFTs' });

  let totalEarned = 0;
  const now = new Date();

  const updateEarned = db.prepare("UPDATE staked_nfts SET last_earned = datetime('now') WHERE id = ?");

  const claimAll = db.transaction(() => {
    for (const nft of staked) {
      const lastEarned = new Date(nft.last_earned + 'Z');
      const diffMs = now - lastEarned;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const earned = diffDays * EARN_PER_DAY;
      totalEarned += earned;
      updateEarned.run(nft.id);
    }
    db.prepare('UPDATE users SET mthy_balance = mthy_balance + ? WHERE wallet = ?').run(totalEarned, wallet);
  });
  claimAll();

  const updated = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  res.json({
    success: true,
    earned: Math.floor(totalEarned),
    balance: Math.floor(updated.mthy_balance),
    message: `Claimed ${Math.floor(totalEarned)} $MTHY from ${staked.length} NFTs`
  });
});

module.exports = router;
