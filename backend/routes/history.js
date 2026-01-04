const express = require('express');
const { getDatabase } = require('../database/init');
const { getMainDatabase } = require('../database/main-db');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Helper function to get user ID from token
const getUserIdFromToken = (req) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    return decoded.userId;
  } catch (error) {
    return null;
  }
};

// Helper function to get Main DB user ID from token (fallback to Standalone DB user ID lookup)
const getMainDbUserIdFromToken = async (req) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    
    // If Main DB user ID is in token, use it
    if (decoded.mainDbUserId) {
      return decoded.mainDbUserId;
    }
    
    // Fallback: Look up Main DB user ID by username from Standalone DB
    const db = getDatabase();
    const [users] = await db.execute('SELECT username FROM users WHERE id = ?', [decoded.userId]);
    if (users.length > 0) {
      const mainDb = getMainDatabase();
      const [mainUsers] = await mainDb.execute(
        'SELECT userId FROM tbl_User WHERE userName = ?',
        [users[0].username]
      );
      if (mainUsers.length > 0) {
        return mainUsers[0].userId;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Helper function to get week boundaries (Monday to Sunday)
const getWeekBoundaries = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    weekStart: monday,
    weekEnd: sunday,
    weekStartStr: monday.toISOString().split('T')[0],
    weekEndStr: sunday.toISOString().split('T')[0],
  };
};

// Helper function to format service types
const formatServiceTypes = (service) => {
  const types = [];
  if (service.engineOilRefilled) types.push('Engine oil');
  if (service.chainTightened) types.push('Chain Tightening');
  if (service.chainSprocketChanged) types.push('Chain Sprocket');
  if (service.otherMaintServices) types.push(service.otherMaintServices);
  return types.length > 0 ? types.join(', ') : 'No services';
};

// @route   GET /api/history/weekly-summary
// @desc    Get current week summary for authenticated user
// @access  Private
router.get('/weekly-summary', async (req, res) => {
  try {
    const mainDbUserId = await getMainDbUserIdFromToken(req);
    if (!mainDbUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or Main DB user ID not found',
      });
    }

    const db = getDatabase();
    const { weekStart, weekEnd, weekStartStr, weekEndStr } = getWeekBoundaries();

    // Get services for current week using Main DB user ID
    const servicesQuery = `
      SELECT 
        maintId,
        actualMaintCost,
        dateImplemented
      FROM tbl_AssetMaintenance
      WHERE personImplemented = ?
        AND dateImplemented IS NOT NULL
        AND DATE(dateImplemented) >= ?
        AND DATE(dateImplemented) <= ?
    `;

    const [services] = await db.execute(servicesQuery, [mainDbUserId, weekStartStr, weekEndStr]);

    const totalAmount = services.reduce((sum, s) => sum + (parseFloat(s.actualMaintCost) || 0), 0);
    const serviceCount = services.length;

    // Get Standalone DB user ID for payment record (use userId from token)
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get or create payment record (use Standalone DB user ID for payment tracking)
    let [paymentRecords] = await db.execute(
      'SELECT * FROM tbl_MechanicPayment WHERE userId = ? AND weekStartDate = ?',
      [userId, weekStartStr]
    );

    let paymentRecord = paymentRecords[0];
    
    if (!paymentRecord) {
      // Create new payment record
      const [result] = await db.execute(
        `INSERT INTO tbl_MechanicPayment (userId, weekStartDate, weekEndDate, totalAmount, serviceCount, paymentStatus)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [userId, weekStartStr, weekEndStr, totalAmount, serviceCount]
      );
      
      [paymentRecords] = await db.execute(
        'SELECT * FROM tbl_MechanicPayment WHERE paymentId = ?',
        [result.insertId]
      );
      paymentRecord = paymentRecords[0];
    } else {
      // Update existing record with current totals
      await db.execute(
        `UPDATE tbl_MechanicPayment 
         SET totalAmount = ?, serviceCount = ?, dtUpdated = NOW()
         WHERE paymentId = ?`,
        [totalAmount, serviceCount, paymentRecord.paymentId]
      );
      
      paymentRecord.totalAmount = totalAmount;
      paymentRecord.serviceCount = serviceCount;
    }

    // Calculate days until payment (assuming payment is due 5 days after week ends)
    const paymentDueDate = new Date(weekEnd);
    paymentDueDate.setDate(paymentDueDate.getDate() + 5);
    const today = new Date();
    const daysUntilPayment = Math.ceil((paymentDueDate - today) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        totalAmount: parseFloat(paymentRecord.totalAmount) || 0,
        serviceCount: paymentRecord.serviceCount || 0,
        paymentStatus: paymentRecord.paymentStatus || 'pending',
        daysUntilPayment: daysUntilPayment > 0 ? daysUntilPayment : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly summary',
      error: error.message,
    });
  }
});

// @route   GET /api/history/payment-periods
// @desc    Get all payment periods (current + previous)
// @access  Private
router.get('/payment-periods', async (req, res) => {
  try {
    // Get Standalone DB user ID for payment record lookup
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const db = getDatabase();

    // Get all payment periods for this user
    const [periods] = await db.execute(
      `SELECT 
        paymentId,
        weekStartDate,
        weekEndDate,
        totalAmount,
        serviceCount,
        paymentStatus,
        paidDate
      FROM tbl_MechanicPayment
      WHERE userId = ?
      ORDER BY weekStartDate DESC
      LIMIT 20`,
      [userId]
    );

    // Format periods with month names
    const formattedPeriods = periods.map((period) => {
      const startDate = new Date(period.weekStartDate);
      const endDate = new Date(period.weekEndDate);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      
      const monthName = monthNames[startDate.getMonth()];
      // Compare week start dates (handle both Date objects and date strings)
      const periodWeekStart = period.weekStartDate instanceof Date 
        ? period.weekStartDate.toISOString().split('T')[0]
        : new Date(period.weekStartDate).toISOString().split('T')[0];
      const isCurrentWeek = getWeekBoundaries().weekStartStr === periodWeekStart;

      return {
        paymentId: period.paymentId,
        weekStartDate: period.weekStartDate,
        weekEndDate: period.weekEndDate,
        monthName,
        dateRange: `${startDate.getDate()}-${endDate.getDate()},${endDate.getFullYear()}`,
        totalAmount: parseFloat(period.totalAmount) || 0,
        serviceCount: period.serviceCount || 0,
        paymentStatus: period.paymentStatus || 'pending',
        paidDate: period.paidDate,
        isCurrent: isCurrentWeek,
      };
    });

    res.json({
      success: true,
      data: formattedPeriods,
    });
  } catch (error) {
    console.error('Error fetching payment periods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment periods',
      error: error.message,
    });
  }
});

// @route   GET /api/history/period/:weekStartDate/services
// @desc    Get services for a specific week
// @access  Private
router.get('/period/:weekStartDate/services', async (req, res) => {
  try {
    // Get Main DB user ID for service queries
    const mainDbUserId = await getMainDbUserIdFromToken(req);
    if (!mainDbUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or Main DB user ID not found',
      });
    }

    // Get Standalone DB user ID for payment record lookup
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { weekStartDate } = req.params;
    const db = getDatabase();
    const mainDb = getMainDatabase();

    // Get payment period to get week end date
    const [paymentRecords] = await db.execute(
      'SELECT weekEndDate FROM tbl_MechanicPayment WHERE userId = ? AND weekStartDate = ?',
      [userId, weekStartDate]
    );

    if (paymentRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment period not found',
      });
    }

    const weekEndDate = paymentRecords[0].weekEndDate;

    // Get services for this week using Main DB user ID
    const servicesQuery = `
      SELECT 
        am.maintId,
        am.assetId,
        am.contractId,
        am.dateImplemented,
        am.actualMaintCost,
        am.engineOilRefilled,
        am.chainTightened,
        am.chainSprocketChanged,
        am.otherMaintServices,
        am.maintCurrentReport,
        a.assetId,
        a.contractId
      FROM tbl_AssetMaintenance am
      INNER JOIN tbl_Asset a ON a.assetId = am.assetId
      WHERE am.personImplemented = ?
        AND am.dateImplemented IS NOT NULL
        AND DATE(am.dateImplemented) >= ?
        AND DATE(am.dateImplemented) <= ?
      ORDER BY am.dateImplemented DESC
    `;

    const [services] = await db.execute(servicesQuery, [mainDbUserId, weekStartDate, weekEndDate]);

    // Get contract and customer info from Main DB
    const serviceDetails = await Promise.all(
      services.map(async (service) => {
        try {
          // Get contract info
          const [contracts] = await mainDb.execute(
            'SELECT contractNo FROM tbl_Contract WHERE contractId = ?',
            [service.contractId]
          );

          // Get customer info
          const [customers] = await mainDb.execute(
            `SELECT customerFullName 
             FROM tbl_Customer 
             WHERE customerId IN (
               SELECT customerId FROM tbl_Contract WHERE contractId = ?
             )`,
            [service.contractId]
          );

          // Get user info for mechanic name (use Standalone DB user ID for name lookup)
          let mechanicName = 'Unknown';
          try {
            const [users] = await db.execute(
              'SELECT first_name, last_name FROM users WHERE id = ?',
              [userId]
            );
            if (users[0]) {
              const firstName = users[0].first_name || '';
              const lastName = users[0].last_name || '';
              mechanicName = `${firstName} ${lastName}`.trim() || 'Unknown';
            }
          } catch (userError) {
            console.error('Error fetching user:', userError);
          }

          const contractNo = contracts[0]?.contractNo || 'N/A';
          const customerName = customers[0]?.customerFullName || 'N/A';

          const serviceDate = new Date(service.dateImplemented);
          const serviceTypes = formatServiceTypes(service);

          return {
            maintId: service.maintId,
            serviceId: `${service.maintId}-WCSV1`, // Format: maintId-WCSV1
            date: serviceDate.toISOString().split('T')[0],
            dateFormatted: serviceDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
            serviceTypes,
            amount: parseFloat(service.actualMaintCost) || 0,
            contractNo,
            customerName,
            mechanicName,
            imagePath: service.maintCurrentReport,
          };
        } catch (error) {
          console.error(`Error fetching details for maintId ${service.maintId}:`, error);
          return {
            maintId: service.maintId,
            serviceId: `${service.maintId}-WCSV1`,
            date: new Date(service.dateImplemented).toISOString().split('T')[0],
            dateFormatted: new Date(service.dateImplemented).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
            serviceTypes: formatServiceTypes(service),
            amount: parseFloat(service.actualMaintCost) || 0,
            contractNo: 'N/A',
            customerName: 'N/A',
            mechanicName: 'Unknown',
            imagePath: service.maintCurrentReport,
          };
        }
      })
    );

    res.json({
      success: true,
      data: serviceDetails,
    });
  } catch (error) {
    console.error('Error fetching period services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch period services',
      error: error.message,
    });
  }
});

module.exports = router;

