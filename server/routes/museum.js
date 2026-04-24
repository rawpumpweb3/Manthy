const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/museum — Get all museum exhibits
router.get('/', (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const exhibits = db.prepare('SELECT * FROM museum ORDER BY caught_at DESC LIMIT ? OFFSET ?').all(Number(limit), Number(offset));
  const total = db.prepare('SELECT COUNT(*) as count FROM museum').get().count;
  res.json({ exhibits, total });
});

module.exports = router;
