const express = require('express');
const cors = require('cors');
const path = require('path');
const { startCronJobs } = require('./cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stake', require('./routes/stake'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/catch', require('./routes/catch'));
app.use('/api/claim', require('./routes/claim'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/museum', require('./routes/museum'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Manthy server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);
  console.log(`Frontend: http://localhost:${PORT}`);
  startCronJobs();
});
