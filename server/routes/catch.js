const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/catch — Catch a weak NFT (HP <= 50)
router.post('/', (req, res) => {
  const { wallet, tokenId } = req.body;
  if (!wallet || !tokenId) return res.status(400).json({ error: 'wallet and tokenId required' });

  const user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(wallet);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const nft = db.prepare('SELECT * FROM staked_nfts WHERE token_id = ?').get(tokenId);
  if (!nft) return res.status(404).json({ error: 'NFT not found in garden' });
  if (nft.hp > 50) return res.status(400).json({ error: `HP too high (${nft.hp}%). Must be 50% or below.` });

  // Can't catch your own
  if (nft.wallet === wallet) return res.status(400).json({ error: "Can't catch your own NFT" });

  // Move to museum
  const catchNft = db.transaction(() => {
    db.prepare(`
      INSERT INTO museum (token_id, collection_addr, name, image_url, original_owner, caught_by, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nft.token_id, nft.collection_addr, nft.name, nft.image_url, nft.wallet, wallet, 'Caught in the garden');

    db.prepare('DELETE FROM staked_nfts WHERE token_id = ? AND collection_addr = ?').run(nft.token_id, nft.collection_addr);
  });
  catchNft();

  res.json({ success: true, message: `${nft.name} caught! Sent to Museum.` });
});

module.exports = router;
