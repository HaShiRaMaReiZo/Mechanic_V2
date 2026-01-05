const express = require('express');
const { getDatabase } = require('../database/init');
const adminAuth = require('../middleware/adminAuth');
const path = require('path');

const router = express.Router();

// Helper function to format date as YYYY-MM-DD in local time
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get week boundaries (Monday to Sunday)
const getWeekBoundaries = (date = new Date()) => {
  // Create a new date and set to noon to avoid timezone issues
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to subtract to get to Monday
  // Monday (1) -> 0 days back
  // Tuesday (2) -> 1 day back
  // ...
  // Sunday (0) -> 6 days back
  const daysToMonday = day === 0 ? 6 : day - 1;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    weekStart: monday,
    weekEnd: sunday,
    weekStartStr: formatLocalDate(monday),
    weekEndStr: formatLocalDate(sunday),
  };
};

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const weekBounds = getWeekBoundaries();
    
    // Pending reviews count
    const [pendingReviews] = await db.execute(
      `SELECT COUNT(*) as count FROM tbl_AssetMaintenance 
       WHERE reviewStatus = 'pending' AND dateImplemented IS NOT NULL`
    );
    
    // Total services this week
    const [weekServices] = await db.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(actualMaintCost), 0) as total 
       FROM tbl_AssetMaintenance 
       WHERE dateImplemented IS NOT NULL 
       AND DATE(dateImplemented) >= ? AND DATE(dateImplemented) <= ?`,
      [weekBounds.weekStartStr, weekBounds.weekEndStr]
    );
    
    // Total services all time
    const [allServices] = await db.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(actualMaintCost), 0) as total 
       FROM tbl_AssetMaintenance 
       WHERE dateImplemented IS NOT NULL`
    );
    
    // Total pending payments
    const [pendingPayments] = await db.execute(
      `SELECT COUNT(*) as count FROM tbl_MechanicPayment WHERE paymentStatus = 'pending'`
    );
    
    res.json({
      success: true,
      data: {
        pendingReviews: pendingReviews[0].count,
        weekServices: weekServices[0].count,
        weekTotal: parseFloat(weekServices[0].total) || 0,
        allServices: allServices[0].count,
        allTotal: parseFloat(allServices[0].total) || 0,
        pendingPayments: pendingPayments[0].count,
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

// @route   GET /api/admin/services
// @desc    Get all services with review status, filterable
// @access  Private (Admin)
router.get('/services', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { status, userId, startDate, endDate, search, page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT 
        am.maintId,
        am.maintenanceCode,
        am.mileage,
        am.actualMaintCost,
        am.dateImplemented,
        am.engineOilRefilled,
        am.engineOilCost,
        am.chainTightened,
        am.chainTightenedCost,
        am.chainSprocketChanged,
        am.chainSprocketChangedCost,
        am.otherMaintServices,
        am.otherMaintServicesCost,
        am.maintCurrentReport,
        am.reviewStatus,
        am.reviewedBy,
        am.reviewedAt,
        am.reviewNotes,
        am.personImplemented
      FROM tbl_AssetMaintenance am
      WHERE am.dateImplemented IS NOT NULL AND am.dtDeleted IS NULL
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND am.reviewStatus = ?';
      params.push(status);
    }
    
    if (userId) {
      query += ' AND u.id = ?';
      params.push(userId);
    }
    
    if (startDate) {
      query += ' AND DATE(am.dateImplemented) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND DATE(am.dateImplemented) <= ?';
      params.push(endDate);
    }
    
    if (search) {
      query += ' AND (am.maintenanceCode LIKE ? OR am.maintId = ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, search);
    }
    
    query += ' ORDER BY am.dateImplemented DESC';
    
    // Get total count for pagination
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [services] = await db.execute(query, params);
    
    // Format services with image URLs
    // Note: personImplemented stores Main DB user ID, so we'll show it as-is
    // If you need mechanic names, you'll need to maintain a mapping table
    const formattedServices = services.map(service => ({
      ...service,
      imageUrl: service.maintCurrentReport 
        ? `/uploads/${service.maintCurrentReport.replace(/^uploads[\\/]/, '')}`
        : null,
      actualMaintCost: parseFloat(service.actualMaintCost) || 0,
      engineOilCost: parseFloat(service.engineOilCost) || 0,
      chainTightenedCost: parseFloat(service.chainTightenedCost) || 0,
      chainSprocketChangedCost: parseFloat(service.chainSprocketChangedCost) || 0,
      otherMaintServicesCost: parseFloat(service.otherMaintServicesCost) || 0,
      mechanicName: service.personImplemented ? `User ID: ${service.personImplemented}` : 'N/A',
    }));
    
    res.json({
      success: true,
      data: {
        services: formattedServices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get admin services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message,
    });
  }
});

// @route   GET /api/admin/services/:maintId
// @desc    Get single service details
// @access  Private (Admin)
router.get('/services/:maintId', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { maintId } = req.params;
    
    // First get the service
    const [services] = await db.execute(
      `SELECT * FROM tbl_AssetMaintenance WHERE maintId = ? AND dtDeleted IS NULL`,
      [maintId]
    );
    
    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    
    const service = services[0];
    
    service.imageUrl = service.maintCurrentReport 
      ? `/uploads/${service.maintCurrentReport.replace(/^uploads[\\/]/, '')}`
      : null;
    
    // Note: personImplemented is Main DB user ID
    // If you need mechanic name, maintain a mapping or query Main DB
    service.mechanicName = service.personImplemented ? `User ID: ${service.personImplemented}` : 'N/A';
    
    res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('Get service details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service details',
      error: error.message,
    });
  }
});

// @route   POST /api/admin/services/:maintId/approve
// @desc    Approve service
// @access  Private (Admin)
router.post('/services/:maintId/approve', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { maintId } = req.params;
    const adminId = req.user.id;
    
    const [result] = await db.execute(
      `UPDATE tbl_AssetMaintenance 
       SET reviewStatus = 'approved',
           reviewedBy = ?,
           reviewedAt = NOW()
       WHERE maintId = ?`,
      [adminId, maintId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Service approved successfully',
    });
  } catch (error) {
    console.error('Approve service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve service',
      error: error.message,
    });
  }
});

// @route   POST /api/admin/services/:maintId/reject
// @desc    Reject service with notes
// @access  Private (Admin)
router.post('/services/:maintId/reject', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { maintId } = req.params;
    const { reviewNotes } = req.body;
    const adminId = req.user.id;
    
    const [result] = await db.execute(
      `UPDATE tbl_AssetMaintenance 
       SET reviewStatus = 'rejected',
           reviewedBy = ?,
           reviewedAt = NOW(),
           reviewNotes = ?
       WHERE maintId = ?`,
      [adminId, reviewNotes || null, maintId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Service rejected successfully',
    });
  } catch (error) {
    console.error('Reject service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject service',
      error: error.message,
    });
  }
});

// @route   PUT /api/admin/services/:maintId
// @desc    Edit service data
// @access  Private (Admin)
router.put('/services/:maintId', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { maintId } = req.params;
    const {
      mileage,
      actualMaintCost,
      engineOilRefilled,
      engineOilCost,
      chainTightened,
      chainTightenedCost,
      chainSprocketChanged,
      chainSprocketChangedCost,
      otherMaintServices,
      otherMaintServicesCost,
    } = req.body;
    
    const updateFields = [];
    const updateValues = [];
    
    if (mileage !== undefined) {
      updateFields.push('mileage = ?');
      updateValues.push(mileage);
    }
    if (actualMaintCost !== undefined) {
      updateFields.push('actualMaintCost = ?');
      updateValues.push(actualMaintCost);
    }
    if (engineOilRefilled !== undefined) {
      updateFields.push('engineOilRefilled = ?');
      updateValues.push(engineOilRefilled ? 1 : 0);
    }
    if (engineOilCost !== undefined) {
      updateFields.push('engineOilCost = ?');
      updateValues.push(engineOilCost);
    }
    if (chainTightened !== undefined) {
      updateFields.push('chainTightened = ?');
      updateValues.push(chainTightened ? 1 : 0);
    }
    if (chainTightenedCost !== undefined) {
      updateFields.push('chainTightenedCost = ?');
      updateValues.push(chainTightenedCost);
    }
    if (chainSprocketChanged !== undefined) {
      updateFields.push('chainSprocketChanged = ?');
      updateValues.push(chainSprocketChanged ? 1 : 0);
    }
    if (chainSprocketChangedCost !== undefined) {
      updateFields.push('chainSprocketChangedCost = ?');
      updateValues.push(chainSprocketChangedCost);
    }
    if (otherMaintServices !== undefined) {
      updateFields.push('otherMaintServices = ?');
      updateValues.push(otherMaintServices);
    }
    if (otherMaintServicesCost !== undefined) {
      updateFields.push('otherMaintServicesCost = ?');
      updateValues.push(otherMaintServicesCost);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }
    
    updateFields.push('dtUpdated = NOW()');
    updateValues.push(maintId);
    
    const [result] = await db.execute(
      `UPDATE tbl_AssetMaintenance 
       SET ${updateFields.join(', ')}
       WHERE maintId = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Service updated successfully',
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: error.message,
    });
  }
});

// @route   DELETE /api/admin/services/:maintId
// @desc    Soft delete service
// @access  Private (Admin)
router.delete('/services/:maintId', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { maintId } = req.params;
    const adminId = req.user.id;
    
    const [result] = await db.execute(
      `UPDATE tbl_AssetMaintenance 
       SET dtDeleted = NOW(),
           personDeleted = ?
       WHERE maintId = ?`,
      [adminId, maintId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      error: error.message,
    });
  }
});

// @route   GET /api/admin/weekly-summary
// @desc    Get weekly summaries (all users or filtered)
// @access  Private (Admin)
router.get('/weekly-summary', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { weekStartDate, userId } = req.query;
    
    let weekBounds;
    if (weekStartDate) {
      weekBounds = getWeekBoundaries(new Date(weekStartDate));
    } else {
      weekBounds = getWeekBoundaries();
    }
    
    let query = `
      SELECT 
        mp.paymentId,
        mp.userId,
        mp.weekStartDate,
        mp.weekEndDate,
        mp.totalAmount,
        mp.serviceCount,
        mp.paymentStatus,
        u.username,
        u.first_name,
        u.last_name
      FROM tbl_MechanicPayment mp
      LEFT JOIN users u ON mp.userId = u.id
      WHERE mp.weekStartDate = ?
    `;
    
    const params = [weekBounds.weekStartStr];
    
    if (userId) {
      query += ' AND mp.userId = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY mp.weekStartDate DESC, u.username';
    
    const [payments] = await db.execute(query, params);
    
    res.json({
      success: true,
      data: payments.map(p => ({
        ...p,
        totalAmount: parseFloat(p.totalAmount) || 0,
      })),
    });
  } catch (error) {
    console.error('Get weekly summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly summary',
      error: error.message,
    });
  }
});

// @route   GET /api/admin/payments
// @desc    Get payment records with status
// @access  Private (Admin)
router.get('/payments', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { status, userId, page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT 
        mp.*,
        u.username,
        u.first_name,
        u.last_name
      FROM tbl_MechanicPayment mp
      LEFT JOIN users u ON mp.userId = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND mp.paymentStatus = ?';
      params.push(status);
    }
    
    if (userId) {
      query += ' AND mp.userId = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY mp.weekStartDate DESC';
    
    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;
    
    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [payments] = await db.execute(query, params);
    
    res.json({
      success: true,
      data: {
        payments: payments.map(p => ({
          ...p,
          totalAmount: parseFloat(p.totalAmount) || 0,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
});

// @route   PUT /api/admin/payments/:paymentId/status
// @desc    Update payment status
// @access  Private (Admin)
router.put('/payments/:paymentId/status', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const { paymentId } = req.params;
    const { paymentStatus, paidDate, remarks } = req.body;
    const adminId = req.user.id;
    
    if (!paymentStatus || !['pending', 'paid'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status',
      });
    }
    
    const updateFields = ['paymentStatus = ?'];
    const updateValues = [paymentStatus];
    
    if (paymentStatus === 'paid') {
      updateFields.push('paidDate = ?', 'paidBy = ?');
      updateValues.push(paidDate ? new Date(paidDate) : new Date(), adminId);
    }
    
    if (remarks !== undefined) {
      updateFields.push('remarks = ?');
      updateValues.push(remarks);
    }
    
    updateValues.push(paymentId);
    
    const [result] = await db.execute(
      `UPDATE tbl_MechanicPayment 
       SET ${updateFields.join(', ')}
       WHERE paymentId = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Payment status updated successfully',
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message,
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get list of mechanics for filtering
// @access  Private (Admin)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const db = getDatabase();
    
    const [users] = await db.execute(
      `SELECT id, username, first_name, last_name, email, role, is_active
       FROM users
       WHERE role = 'mechanic' AND is_active = 1
       ORDER BY username`
    );
    
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
});

module.exports = router;

