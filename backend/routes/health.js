const express = require('express');
const { getDatabase } = require('../database/init');
const os = require('os');

const router = express.Router();

/**
 * Get the server's IPv4 address
 */
function getServerIP() {
  const interfaces = os.networkInterfaces();
  
  // Try to find IPv4 address (prefer non-internal addresses)
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const address of addresses) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  
  // Fallback to localhost
  return '127.0.0.1';
}

// @route   GET /api/health
// @desc    Health check endpoint
// @access  Public
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    await db.execute('SELECT 1');
    
    res.json({
      status: 'ok',
      message: 'Server is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      status: 'ok',
      message: 'Server is running',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// @route   GET /api/health/ip
// @desc    Get server IP address for client configuration
// @access  Public
router.get('/ip', (req, res) => {
  const serverIP = getServerIP();
  const port = process.env.PORT || 3000;
  
  res.json({
    success: true,
    ip: serverIP,
    port: port,
    baseUrl: `http://${serverIP}:${port}/api`,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

