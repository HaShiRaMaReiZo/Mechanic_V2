const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getMainDatabase } = require('../database/main-db');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId, mainDbUserId = null) => {
  const payload = { userId };
  if (mainDbUserId) {
    payload.mainDbUserId = mainDbUserId;
  }
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post(
  '/login',
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { username, password } = req.body;

      // Find user by username (case-insensitive)
      let user;
      try {
        user = await User.findByUsername(username);
      } catch (dbError) {
        if (dbError.code === 'ECONNREFUSED' || dbError.message.includes('not initialized')) {
          return res.status(503).json({
            success: false,
            message: 'Database connection failed. Please make sure MySQL is running.',
          });
        }
        throw dbError; // Re-throw if it's a different error
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Update last login
      await user.updateLastLogin();

      // Look up Main DB user ID by username
      let mainDbUserId = null;
      try {
        const mainDb = getMainDatabase();
        const [mainUsers] = await mainDb.execute(
          'SELECT userId FROM tbl_User WHERE userName = ?',
          [user.username]
        );
        if (mainUsers.length > 0) {
          mainDbUserId = mainUsers[0].userId;
        }
      } catch (mainDbError) {
        console.warn('Could not fetch Main DB user ID:', mainDbError.message);
        // Continue without Main DB user ID - will fallback to Standalone DB user ID
      }

      // Generate token with Main DB user ID
      const token = generateToken(user.id, mainDbUserId);

      // Return user data (without password)
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            mainDbUserId: mainDbUserId, // Include Main DB user ID in response
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      
      // Check if it's a database connection error
      if (error.code === 'ECONNREFUSED' || error.message?.includes('not initialized')) {
        return res.status(503).json({
          success: false,
          message: 'Database connection failed. Please make sure MySQL is running.',
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error during login',
      });
    }
  }
);

// @route   GET /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.get('/verify', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    // Find user
    let user;
    try {
      user = await User.findById(decoded.userId);
    } catch (dbError) {
      if (dbError.code === 'ECONNREFUSED' || dbError.message?.includes('not initialized')) {
        return res.status(503).json({
          success: false,
          message: 'Database connection failed. Please make sure MySQL is running.',
        });
      }
      throw dbError;
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    console.error('Token verification error:', error);
    
    if (error.code === 'ECONNREFUSED' || error.message?.includes('not initialized')) {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please make sure MySQL is running.',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during token verification',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    // Find user
    let user;
    try {
      user = await User.findById(decoded.userId);
    } catch (dbError) {
      if (dbError.code === 'ECONNREFUSED' || dbError.message?.includes('not initialized')) {
        return res.status(503).json({
          success: false,
          message: 'Database connection failed. Please make sure MySQL is running.',
        });
      }
      throw dbError;
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          address: user.address,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    console.error('Get user error:', error);
    
    if (error.code === 'ECONNREFUSED' || error.message?.includes('not initialized')) {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please make sure MySQL is running.',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;

