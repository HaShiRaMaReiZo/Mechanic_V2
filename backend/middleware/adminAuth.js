const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a token.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    // Get user from database to check role
    const db = getDatabase();
    const [users] = await db.execute(
      'SELECT id, username, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.',
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

module.exports = adminAuth;

