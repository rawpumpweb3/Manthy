const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/admin/users — List all users
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY last_seen DESC').all();
  res.json({ users });
});

// POST /api/admin/add-mthy — Add $MTHY to a user
router.post('/add-mthy', (req, res) => {
  const { wallet, amount } = req.body;
  if (!wallet || !amount) return res.status(400).json({ error: 'wallet and amount required' });

  const user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  if (!user) {
    // Create user with the amount
    db.prepare('INSERT INTO users (wallet, mthy_balance) VALUES (?, ?)').run(wallet, amount);
  } else {
    db.prepare('UPDATE users SET mthy_balance = mthy_balance + ? WHERE wallet = ?').run(amount, wallet);
  }
  res.json({ success: true, message: `Added ${amount} $MTHY to ${wallet.slice(0,12)}...` });
});

// POST /api/admin/force-catch — Force catch any NFT regardless of HP
router.post('/force-catch', (req, res) => {
  const { tokenId } = req.body;
  if (!tokenId) return res.status(400).json({ error: 'tokenId required' });

  const nft = db.prepare('SELECT * FROM staked_nfts WHERE token_id = ?').get(tokenId);
  if (!nft) return res.status(404).json({ error: 'NFT not found in garden' });

  const catchNft = db.transaction(() => {
    db.prepare(`
      INSERT INTO museum (token_id, collection_addr, name, image_url, original_owner, caught_by, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nft.token_id, nft.collection_addr, nft.name, nft.image_url, nft.wallet, 'ADMIN', 'Force caught by admin');

    db.prepare('DELETE FROM staked_nfts WHERE token_id = ? AND collection_addr = ?').run(nft.token_id, nft.collection_addr);
  });
  catchNft();

  res.json({ success: true, message: `Force caught ${nft.name}` });
});

// POST /api/admin/reset — Reset entire game (DANGEROUS)
router.post('/reset', (req, res) => {
  const { confirm } = req.body;
  if (confirm !== 'RESET_GAME') return res.status(400).json({ error: 'Send confirm: "RESET_GAME" to confirm' });

  db.exec('DELETE FROM staked_nfts');
  db.exec('DELETE FROM museum');
  db.exec('DELETE FROM feed_history');
  db.exec('DELETE FROM users');

  res.json({ success: true, message: 'Game reset. All data cleared.' });
});

module.exports = router;
