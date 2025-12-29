const express = require('express');
const { getDatabase } = require('../database/init');

const router = express.Router();

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

module.exports = router;

