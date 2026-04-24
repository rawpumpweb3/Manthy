const express = require('express');
const router = express.Router();
const db = require('../db');

const FEED_COST = 100;

// POST /api/feed — Feed one NFT
router.post('/', (req, res) => {
  const { wallet, tokenId } = req.body;
  if (!wallet || !tokenId) return res.status(400).json({ error: 'wallet and tokenId required' });

  const user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const nft = db.prepare('SELECT * FROM staked_nfts WHERE wallet = ? AND token_id = ?').get(wallet, tokenId);
  if (!nft) return res.status(404).json({ error: 'NFT not staked by you' });
  if (nft.hp >= 100) return res.status(400).json({ error: 'Already at full HP' });

  if (user.mthy_balance < FEED_COST) {
    return res.status(400).json({ error: `Not enough $MTHY. Need ${FEED_COST}, have ${user.mthy_balance.toFixed(0)}` });
  }

  // Deduct cost, restore HP
  db.prepare('UPDATE users SET mthy_balance = mthy_balance - ? WHERE wallet = ?').run(FEED_COST, wallet);
  db.prepare('UPDATE staked_nfts SET hp = 100, last_fed = datetime("now") WHERE wallet = ? AND token_id = ?').run(wallet, tokenId);

  // Log feed
  db.prepare('INSERT INTO feed_history (wallet, token_id, cost) VALUES (?, ?, ?)').run(wallet, tokenId, FEED_COST);

  const updated = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  res.json({ success: true, balance: updated.mthy_balance, message: `Fed! HP restored to 100%` });
});

// POST /api/feed/all — Feed all hungry staked NFTs
router.post('/all', (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hungry = db.prepare('SELECT * FROM staked_nfts WHERE wallet = ? AND hp < 100').all(wallet);
  if (hungry.length === 0) return res.status(400).json({ error: 'All NFTs already fed' });

  const totalCost = hungry.length * FEED_COST;
  if (user.mthy_balance < totalCost) {
    return res.status(400).json({ error: `Not enough $MTHY. Need ${totalCost}, have ${user.mthy_balance.toFixed(0)}` });
  }

  const feedOne = db.prepare('UPDATE staked_nfts SET hp = 100, last_fed = datetime("now") WHERE wallet = ? AND token_id = ?');
  const logFeed = db.prepare('INSERT INTO feed_history (wallet, token_id, cost) VALUES (?, ?, ?)');

  const feedAll = db.transaction(() => {
    db.prepare('UPDATE users SET mthy_balance = mthy_balance - ? WHERE wallet = ?').run(totalCost, wallet);
    for (const nft of hungry) {
      feedOne.run(wallet, nft.token_id);
      logFeed.run(wallet, nft.token_id, FEED_COST);
    }
  });
  feedAll();

  const updated = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  res.json({ success: true, fed: hungry.length, balance: updated.mthy_balance });
});

module.exports = router;
