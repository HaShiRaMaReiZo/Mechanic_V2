const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./database/init');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
initDatabase()
  .then(() => {
    console.log('✅ Database initialized');
  })
  .catch((error) => {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/health', require('./routes/health'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for network access

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Network access: http://${require('os').networkInterfaces().en0?.[0]?.address || 'YOUR_IP'}:${PORT}/api`);
  console.log(`💡 Make sure your phone and computer are on the same WiFi network!`);
});

