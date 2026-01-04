const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./database/init');
const { initMainDatabase } = require('./database/main-db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize local database (non-blocking - don't crash server)
initDatabase()
  .then(() => {
    console.log('✅ Local database initialized');
  })
  .catch((error) => {
    console.error('❌ Local database initialization error:', error.message);
    console.log('⚠️  Make sure MySQL is running and .env is configured correctly');
    console.log('⚠️  Server will continue but authentication will not work');
    console.log('💡 Start MySQL from XAMPP Control Panel if not running');
  });

// Initialize main database (for contract search) - non-blocking
setTimeout(() => {
  initMainDatabase()
    .then(() => {
      console.log('✅ Main database initialized');
    })
    .catch((error) => {
      console.error('⚠️  Main database initialization error:', error.message);
      console.log('⚠️  Contract search will not work until main database is configured');
      console.log('💡 Check SSH configuration in .env file (MAIN_SSH_HOST, MAIN_SSH_KEY_PATH, etc.)');
      if (error.code === 'ENOENT') {
        console.log('💡 SSH key file not found. Check MAIN_SSH_KEY_PATH in .env');
      }
    });
}, 2000); // Wait 2 seconds after local DB init

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/health', require('./routes/health'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/history', require('./routes/history'));

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

