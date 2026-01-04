const express = require('express');
const { body, validationResult } = require('express-validator');
const { getMainDatabase } = require('../database/main-db');
const { getDatabase } = require('../database/init');
const upload = require('../middleware/upload');
const path = require('path');
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

/**
 * Add 3 months to a date string
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Date string 3 months later in YYYY-MM-DD format
 */
function addThreeMonths(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

/**
 * Calculate maintenance status based on maintenance records
 * @param {Array} maintenances - Array of maintenance records
 * @returns {Object} Status object with status, message, dates, etc.
 */
function calculateMaintenanceStatus(maintenances) {
  // Handle edge case: no maintenance records
  if (!maintenances || maintenances.length === 0) {
    return {
      status: 'ALREADY_IMPLEMENTED',
      message: 'This contract is already applied maintenance',
      maintDueDate: null,
      daysFromDue: 0,
      maintenanceCode: null,
      isCalculated: false,
    };
  }

  // Sort all maintenances by maintDueDate DESC to get most recent first
  const sorted = maintenances
    .filter(m => m.maintDueDate) // Only include records with a due date
    .sort((a, b) => new Date(b.maintDueDate) - new Date(a.maintDueDate));
  
  if (sorted.length === 0) {
    return {
      status: 'ALREADY_IMPLEMENTED',
      message: 'This contract is already applied maintenance',
      maintDueDate: null,
      daysFromDue: 0,
      maintenanceCode: null,
      isCalculated: false,
    };
  }

  // Get the most recent maintenance record
  const mostRecent = sorted[0];
  let relevantDate = mostRecent.maintDueDate;
  let maintenanceCode = mostRecent.maintenanceCode;
  let isCalculated = false;

  // If the most recent maintenance is completed (has dateImplemented)
  if (mostRecent.dateImplemented) {
    // Calculate the next maintenance date (3 months after the most recent completed maintenance)
    relevantDate = addThreeMonths(mostRecent.maintDueDate);
    maintenanceCode = null; // No maintenance code for calculated dates
    isCalculated = true;
  }

  // If no relevant date could be determined
  if (!relevantDate) {
    return {
      status: 'ALREADY_IMPLEMENTED',
      message: 'This contract is already applied maintenance',
      maintDueDate: null,
      daysFromDue: 0,
      maintenanceCode: null,
      isCalculated: false,
    };
  }

  // Calculate days difference from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(relevantDate);
  dueDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  
  // Determine status based on days difference
  if (daysDiff < 0) {
    // Overdue
    return {
      status: 'OVER_DUE',
      message: "Warning! This contract can't be maintain anymore.",
      maintDueDate: relevantDate,
      daysFromDue: daysDiff,
      maintenanceCode: maintenanceCode,
      isCalculated: isCalculated,
    };
  } else if (daysDiff <= 7) {
    // Due (within 7 days)
    return {
      status: 'DUE',
      message: `Successful. This asset is due for maintenance session on ${formatDate(relevantDate)}`,
      maintDueDate: relevantDate,
      daysFromDue: daysDiff,
      maintenanceCode: maintenanceCode,
      isCalculated: isCalculated,
    };
  } else {
    // Not yet due (more than 7 days away)
    return {
      status: 'NOT_YET_DUE',
      message: `Warning! This contract is ${daysDiff} days from the due date. Maintenance allowed only 7 days before due date`,
      maintDueDate: relevantDate,
      daysFromDue: daysDiff,
      maintenanceCode: maintenanceCode,
      isCalculated: isCalculated,
    };
  }
}

// @route   GET /api/contracts/search
// @desc    Search contract by contract number
// @access  Private (should add auth middleware later)
router.get('/search', async (req, res) => {
    try {
      const { contractNo } = req.query;

      if (!contractNo || contractNo.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Contract number is required',
        });
      }

      const mainDb = getMainDatabase();
      const localDb = getDatabase();
      const searchValue = contractNo.trim();

      // Step 1: Search contract and customer from Main DB
      const contractQuery = `
        SELECT 
          c.contractId,
          c.contractNo,
          c.contractDate,
          c.customerId,
          cust.customerFullName,
          cust.phoneNo1
        FROM tbl_Contract c
        LEFT JOIN tbl_Customer cust ON cust.customerId = c.customerId
        WHERE c.contractNo LIKE ? 
           OR c.strippedContractNo LIKE ?
           OR c.accStrippedContractNo LIKE ?
        LIMIT 1
      `;

      // Use % wildcards for partial matching
      const searchPattern = `%${searchValue}%`;
      const [contractResults] = await mainDb.execute(contractQuery, [searchPattern, searchPattern, searchPattern]);

      if (contractResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contract not found',
        });
      }

      const contractRow = contractResults[0];
      const contractId = contractRow.contractId;

      // Step 2: Get assets from Standalone DB
      const assetQuery = `
        SELECT 
          assetId,
          contractId,
          chassisNo,
          engineNo,
          plateNo,
          assetProductName AS productName,
          productColor
        FROM tbl_Asset
        WHERE contractId = ?
      `;
      const [assetResults] = await localDb.execute(assetQuery, [contractId]);

      if (assetResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No assets found for this contract',
        });
      }

      // Step 3: Get maintenances from Standalone DB for all assets
      const assetIds = assetResults.map(a => a.assetId);
      const placeholders = assetIds.map(() => '?').join(',');
      const maintQuery = `
        SELECT 
          maintId,
          assetId,
          maintenanceCode,
          maintDueDate,
          chainSprocketChanged,
          chainTightened,
          engineOilRefilled,
          otherMaintServices,
          dateImplemented,
          mileage,
          actualMaintCost
        FROM tbl_AssetMaintenance
        WHERE assetId IN (${placeholders})
        ORDER BY maintDueDate DESC, dateImplemented DESC
      `;
      let [maintResults] = await localDb.execute(maintQuery, assetIds);

      // If no maintenance records in Standalone DB, try to get from Main DB
      // This handles cases where data hasn't been synced yet
      if (maintResults.length === 0) {
        console.log(`⚠️  No maintenance records in Standalone DB for contract ${contractNo}, checking Main DB...`);
        const mainMaintQuery = `
          SELECT 
            maintId,
            assetId,
            maintenanceCode,
            maintDueDate,
            chainSprocketChanged,
            chainTightened,
            engineOilRefilled,
            otherMaintServices,
            dateImplemented,
            mileage,
            actualMaintCost
          FROM tbl_AssetMaintenance
          WHERE assetId IN (${placeholders})
          ORDER BY maintDueDate DESC, dateImplemented DESC
        `;
        try {
          [maintResults] = await mainDb.execute(mainMaintQuery, assetIds);
          if (maintResults.length > 0) {
            console.log(`✅ Found ${maintResults.length} maintenance record(s) in Main DB`);
          }
        } catch (error) {
          console.error('Error querying Main DB for maintenance records:', error.message);
          // Continue with empty results
        }
      }

      // Step 4: Group results by asset
      const contractData = {
        contract: {
          contractId: contractRow.contractId,
          contractNo: contractRow.contractNo,
          contractDate: contractRow.contractDate,
          customerId: contractRow.customerId,
          customerFullName: contractRow.customerFullName || null,
          phoneNo1: contractRow.phoneNo1 || null,
        },
        assets: [],
      };

      const assetMap = new Map();
      const allMaintenances = [];

      // Initialize asset map
      assetResults.forEach((asset) => {
        assetMap.set(asset.assetId, {
          assetId: asset.assetId,
          chassisNo: asset.chassisNo,
          engineNo: asset.engineNo,
          plateNo: asset.plateNo,
          productName: asset.productName,
          productColor: asset.productColor,
          maintenances: [],
        });
      });

      // Add maintenance records to assets
      maintResults.forEach((maint) => {
        if (assetMap.has(maint.assetId)) {
          const maintRecord = {
            maintId: maint.maintId,
            maintenanceCode: maint.maintenanceCode,
            maintDueDate: maint.maintDueDate,
            chainSprocketChanged: maint.chainSprocketChanged,
            chainTightened: maint.chainTightened,
            engineOilRefilled: maint.engineOilRefilled,
            otherMaintServices: maint.otherMaintServices,
            dateImplemented: maint.dateImplemented,
            mileage: maint.mileage,
            actualMaintCost: maint.actualMaintCost,
          };
          assetMap.get(maint.assetId).maintenances.push(maintRecord);
          allMaintenances.push(maintRecord);
        }
      });

      contractData.assets = Array.from(assetMap.values());

      // Step 5: Calculate maintenance status
      const maintenanceStatus = calculateMaintenanceStatus(allMaintenances);
      contractData.maintenanceStatus = maintenanceStatus;

      // Debug logging
      console.log(`📊 Contract ${contractNo}: Status = ${maintenanceStatus.status}, Maintenances = ${allMaintenances.length}`);
      if (allMaintenances.length > 0) {
        const recent = allMaintenances[0];
        console.log(`   Most recent: maintDueDate=${recent.maintDueDate}, dateImplemented=${recent.dateImplemented || 'null'}`);
      }

      res.json({
        success: true,
        data: contractData,
      });
    } catch (error) {
      console.error('Contract search error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching contract',
        error: error.message,
      });
    }
  }
);

// @route   GET /api/contracts/:contractNo/maintenances
// @desc    Get maintenance history for a contract
// @access  Private
router.get('/:contractNo/maintenances', async (req, res) => {
  try {
    const { contractNo } = req.params;
    const mainDb = getMainDatabase();
    const localDb = getDatabase();

    // First, get contractId from Main DB
    const contractQuery = 'SELECT contractId FROM tbl_Contract WHERE contractNo = ? LIMIT 1';
    const [contractResults] = await mainDb.execute(contractQuery, [contractNo]);

    if (contractResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found',
      });
    }

    const contractId = contractResults[0].contractId;

    // Get assets from Standalone DB
    const assetQuery = 'SELECT assetId, plateNo, chassisNo FROM tbl_Asset WHERE contractId = ?';
    const [assetResults] = await localDb.execute(assetQuery, [contractId]);

    if (assetResults.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const assetIds = assetResults.map(a => a.assetId);
    const placeholders = assetIds.map(() => '?').join(',');
    const assetMap = new Map(assetResults.map(a => [a.assetId, a]));

    // Get maintenances from Standalone DB
    const maintQuery = `
      SELECT 
        am.maintId,
        am.maintenanceCode,
        am.maintDueDate,
        am.dateImplemented,
        am.mileage,
        am.actualMaintCost,
        am.chainSprocketChanged,
        am.chainTightened,
        am.engineOilRefilled,
        am.otherMaintServices,
        am.assetId
      FROM tbl_AssetMaintenance am
      WHERE am.assetId IN (${placeholders})
      ORDER BY am.dateImplemented DESC, am.maintDueDate DESC
    `;
    const [maintResults] = await localDb.execute(maintQuery, assetIds);

    // Combine with asset data
    const results = maintResults.map(maint => ({
      ...maint,
      plateNo: assetMap.get(maint.assetId)?.plateNo || null,
      chassisNo: assetMap.get(maint.assetId)?.chassisNo || null,
    }));

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Get maintenances error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching maintenance history',
      error: error.message,
    });
  }
});

// @route   POST /api/contracts/:maintId/submit-service
// @desc    Submit maintenance service data and update maintenance record
// @access  Private (should add auth middleware later)
router.post('/:maintId/submit-service', upload.single('image'), async (req, res) => {
  try {
    const { maintId } = req.params;
    console.log(`🔍 Submit service request for maintId: ${maintId}`);
    const db = getDatabase(); // Use Standalone DB instead of Main DB

    // Parse form data
    const engineOil = req.body.engineOil ? JSON.parse(req.body.engineOil) : { enabled: false, amount: '' };
    const chainSprocket = req.body.chainSprocket ? JSON.parse(req.body.chainSprocket) : { enabled: false, amount: '' };
    const chainTightening = req.body.chainTightening ? JSON.parse(req.body.chainTightening) : { enabled: false, amount: '' };
    const serviceFee = req.body.serviceFee ? JSON.parse(req.body.serviceFee) : { enabled: false, amount: '' };
    const mileage = req.body.mileage;
    const totalAmount = req.body.totalAmount;

    // Validate required fields
    if (!mileage || !totalAmount) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Mileage and total amount are required',
      });
    }

    // Check if maintenance record exists in Standalone DB
    const checkQuery = 'SELECT maintId, dateImplemented FROM tbl_AssetMaintenance WHERE maintId = ?';
    let [checkResults] = await db.execute(checkQuery, [maintId]);

    // If not found in Standalone DB, check Main DB and copy if exists
    if (checkResults.length === 0) {
      console.log(`⚠️  Maintenance record ${maintId} not found in Standalone DB, checking Main DB...`);
      const mainDb = getMainDatabase();
      
      try {
        // Check Main DB
        const mainCheckQuery = 'SELECT * FROM tbl_AssetMaintenance WHERE maintId = ?';
        const [mainCheckResults] = await mainDb.execute(mainCheckQuery, [maintId]);
        
        if (mainCheckResults.length > 0) {
          console.log(`✅ Found maintenance record ${maintId} in Main DB, copying to Standalone DB...`);
          const maintRecord = mainCheckResults[0];
          
          // Copy maintenance record from Main DB to Standalone DB
          const copyQuery = `
            INSERT INTO tbl_AssetMaintenance (
              maintId, assetId, contractId, maintDueDate, unscheduled, maintenanceCode,
              mileage, estimatedMaintCost, actualMaintCost, skipped, dateImplemented,
              engineOilRefilled, engineOilCost, chainTightened, chainTightenedCost,
              chainSprocketChanged, chainSprocketChangedCost, otherMaintServices,
              otherMaintServicesCost, commissionBeneficiary, personImplemented,
              dtConfirmedImplemented, personConfirmedImplemented, maintLastRemark,
              maintCurrentReport, dtSmsSent, dtCreated, personCreated, dtUpdated,
              personUpdated, dtDeleted, personDeleted, deletedByParent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              assetId = VALUES(assetId),
              contractId = VALUES(contractId),
              maintDueDate = VALUES(maintDueDate),
              maintenanceCode = VALUES(maintenanceCode)
          `;
          
          await db.execute(copyQuery, [
            maintRecord.maintId,
            maintRecord.assetId,
            maintRecord.contractId,
            maintRecord.maintDueDate,
            maintRecord.unscheduled || 0,
            maintRecord.maintenanceCode,
            maintRecord.mileage,
            maintRecord.estimatedMaintCost,
            maintRecord.actualMaintCost,
            maintRecord.skipped || 0,
            maintRecord.dateImplemented,
            maintRecord.engineOilRefilled || 0,
            maintRecord.engineOilCost,
            maintRecord.chainTightened || 0,
            maintRecord.chainTightenedCost,
            maintRecord.chainSprocketChanged || 0,
            maintRecord.chainSprocketChangedCost,
            maintRecord.otherMaintServices,
            maintRecord.otherMaintServicesCost,
            maintRecord.commissionBeneficiary,
            maintRecord.personImplemented,
            maintRecord.dtConfirmedImplemented,
            maintRecord.personConfirmedImplemented,
            maintRecord.maintLastRemark,
            maintRecord.maintCurrentReport,
            maintRecord.dtSmsSent,
            maintRecord.dtCreated,
            maintRecord.personCreated,
            maintRecord.dtUpdated,
            maintRecord.personUpdated,
            maintRecord.dtDeleted,
            maintRecord.personDeleted,
            maintRecord.deletedByParent || 0,
          ]);
          
          console.log(`✅ Copied maintenance record ${maintId} to Standalone DB`);
          
          // Re-query Standalone DB
          [checkResults] = await db.execute(checkQuery, [maintId]);
        }
      } catch (error) {
        console.error('Error checking/copying from Main DB:', error.message);
      }
    }

    // If still not found after checking both databases
    if (checkResults.length === 0) {
      // Clean up uploaded file if maintenance not found
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found in either database',
      });
    }

    // Check if already implemented
    if (checkResults[0].dateImplemented) {
      // Clean up uploaded file if already implemented
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'This maintenance has already been implemented',
      });
    }

    // Prepare image path
    let imagePath = null;
    if (req.file) {
      // Store relative path
      imagePath = `uploads/maintenance/${req.file.filename}`;
    }

    // Prepare other services description
    let otherMaintServices = null;
    let otherMaintServicesCost = null;
    if (serviceFee.enabled && serviceFee.amount) {
      otherMaintServices = 'Service Fee';
      otherMaintServicesCost = parseFloat(serviceFee.amount) || null;
    }

    // Get Main DB user ID from token (for personImplemented)
    const mainDbUserId = await getMainDbUserIdFromToken(req);
    if (!mainDbUserId) {
      // Clean up uploaded file if auth fails
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication required or Main DB user ID not found',
      });
    }

    // Update maintenance record
    const updateQuery = `
      UPDATE tbl_AssetMaintenance
      SET 
        dateImplemented = NOW(),
        engineOilRefilled = ?,
        engineOilCost = ?,
        chainTightened = ?,
        chainTightenedCost = ?,
        chainSprocketChanged = ?,
        chainSprocketChangedCost = ?,
        otherMaintServices = ?,
        otherMaintServicesCost = ?,
        mileage = ?,
        actualMaintCost = ?,
        maintCurrentReport = ?,
        personImplemented = ?,
        dtUpdated = NOW(),
        personUpdated = ?
      WHERE maintId = ?
    `;

    const updateValues = [
      engineOil.enabled ? 1 : 0,
      engineOil.enabled && engineOil.amount ? parseFloat(engineOil.amount) : null,
      chainTightening.enabled ? 1 : 0,
      chainTightening.enabled && chainTightening.amount ? parseFloat(chainTightening.amount) : null,
      chainSprocket.enabled ? 1 : 0,
      chainSprocket.enabled && chainSprocket.amount ? parseFloat(chainSprocket.amount) : null,
      otherMaintServices,
      otherMaintServicesCost,
      parseFloat(mileage) || null,
      parseFloat(totalAmount) || null,
      imagePath,
      mainDbUserId, // Use Main DB user ID for personImplemented
      mainDbUserId, // Use Main DB user ID for personUpdated
      maintId,
    ];

    await db.execute(updateQuery, updateValues);

    // Get updated record
    const [updatedResults] = await db.execute(
      'SELECT maintId, dateImplemented, maintCurrentReport FROM tbl_AssetMaintenance WHERE maintId = ?',
      [maintId]
    );

    res.json({
      success: true,
      message: 'Maintenance service submitted successfully',
      data: {
        maintId: parseInt(maintId),
        dateImplemented: updatedResults[0].dateImplemented,
        imagePath: updatedResults[0].maintCurrentReport,
      },
    });
  } catch (error) {
    console.error('Submit maintenance service error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting maintenance service',
      error: error.message,
    });
  }
});

module.exports = router;

