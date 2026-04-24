const express = require('express');
const router = express.Router();
const db = require('../db');

const COLLECTION_ADDR = 'stars1sxcf8dghtq9qprulmfy4f898d0rn0xzmhle83rqmtpm00j0smhes93wsys';

// POST /api/stake — Soft stake an NFT
router.post('/', (req, res) => {
  const { wallet, tokenId, name, imageUrl } = req.body;
  if (!wallet || !tokenId) return res.status(400).json({ error: 'wallet and tokenId required' });

  // Check user exists
  const user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  if (!user) return res.status(404).json({ error: 'User not found. Login first.' });

  // Check not already staked
  const existing = db.prepare('SELECT * FROM staked_nfts WHERE token_id = ? AND collection_addr = ?').get(tokenId, COLLECTION_ADDR);
  if (existing) return res.status(400).json({ error: 'NFT already staked' });

  // Check not in museum
  const inMuseum = db.prepare('SELECT * FROM museum WHERE token_id = ? AND collection_addr = ?').get(tokenId, COLLECTION_ADDR);
  if (inMuseum) return res.status(400).json({ error: 'NFT is in museum (caught)' });

  db.prepare(`
    INSERT INTO staked_nfts (wallet, token_id, collection_addr, name, image_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(wallet, tokenId, COLLECTION_ADDR, name || '', imageUrl || '');

  res.json({ success: true, message: `${name || tokenId} staked!` });
});

// POST /api/stake/unstake — Unstake an NFT
router.post('/unstake', (req, res) => {
  const { wallet, tokenId } = req.body;
  if (!wallet || !tokenId) return res.status(400).json({ error: 'wallet and tokenId required' });

  const nft = db.prepare('SELECT * FROM staked_nfts WHERE wallet = ? AND token_id = ? AND collection_addr = ?').get(wallet, tokenId, COLLECTION_ADDR);
  if (!nft) return res.status(404).json({ error: 'NFT not staked by you' });

  db.prepare('DELETE FROM staked_nfts WHERE wallet = ? AND token_id = ? AND collection_addr = ?').run(wallet, tokenId, COLLECTION_ADDR);
  res.json({ success: true, message: 'NFT unstaked' });
});

// GET /api/stake/my?wallet=xxx — Get user's staked NFTs
router.get('/my', (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const staked = db.prepare('SELECT * FROM staked_nfts WHERE wallet = ?').all(wallet);
  res.json({ staked });
});

// GET /api/stake/all — Get all staked NFTs (for arena/garden)
router.get('/all', (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const staked = db.prepare('SELECT * FROM staked_nfts ORDER BY hp DESC, staked_at ASC LIMIT ? OFFSET ?').all(Number(limit), Number(offset));
  const total = db.prepare('SELECT COUNT(*) as count FROM staked_nfts').get().count;
  res.json({ staked, total });
});

module.exports = router;
