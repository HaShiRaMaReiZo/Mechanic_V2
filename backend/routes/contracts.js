const express = require('express');
const { body, validationResult } = require('express-validator');
const { getMainDatabase } = require('../database/main-db');

const router = express.Router();

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

      const db = getMainDatabase();
      const searchValue = contractNo.trim();

      // Search contract with related data
      // Support partial matching on contractNo, strippedContractNo, and accStrippedContractNo
      // Using actual column names from database (camelCase)
      const query = `
        SELECT 
          c.contractId,
          c.contractNo,
          c.contractDate,
          c.customerId,
          cust.customerFullName,
          cust.phoneNo1,
          a.assetId,
          a.chassisNo,
          a.engineNo,
          a.plateNo,
          a.assetProductName AS productName,
          a.productColor,
          am.maintId,
          am.maintenanceCode,
          am.maintDueDate,
          am.chainSprocketChanged,
          am.chainTightened,
          am.engineOilRefilled,
          am.otherMaintServices,
          am.dateImplemented,
          am.mileage,
          am.actualMaintCost
        FROM tbl_Contract c
        INNER JOIN tbl_Asset a ON a.contractId = c.contractId
        LEFT JOIN tbl_Customer cust ON cust.customerId = c.customerId
        LEFT JOIN tbl_AssetMaintenance am ON am.assetId = a.assetId
        WHERE c.contractNo LIKE ? 
           OR c.strippedContractNo LIKE ?
           OR c.accStrippedContractNo LIKE ?
        ORDER BY am.maintDueDate DESC, am.dateImplemented DESC
      `;

      // Use % wildcards for partial matching
      const searchPattern = `%${searchValue}%`;
      const [results] = await db.execute(query, [searchPattern, searchPattern, searchPattern]);

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contract not found',
        });
      }

      // Group results by contract and asset
      const contractData = {
        contract: {
          contractId: results[0].contractId,
          contractNo: results[0].contractNo,
          contractDate: results[0].contractDate,
          customerId: results[0].customerId,
          customerFullName: results[0].customerFullName || null,
          phoneNo1: results[0].phoneNo1 || null,
        },
        assets: [],
      };

      // Group maintenance records by asset
      const assetMap = new Map();
      const allMaintenances = [];

      results.forEach((row) => {
        const assetId = row.assetId;

        if (!assetMap.has(assetId)) {
          assetMap.set(assetId, {
            assetId: row.assetId,
            chassisNo: row.chassisNo,
            engineNo: row.engineNo,
            plateNo: row.plateNo,
            productName: row.productName,
            productColor: row.productColor,
            maintenances: [],
          });
        }

        // Add maintenance record if it exists
        if (row.maintId) {
          const maintRecord = {
            maintId: row.maintId,
            maintenanceCode: row.maintenanceCode,
            maintDueDate: row.maintDueDate,
            chainSprocketChanged: row.chainSprocketChanged,
            chainTightened: row.chainTightened,
            engineOilRefilled: row.engineOilRefilled,
            otherMaintServices: row.otherMaintServices,
            dateImplemented: row.dateImplemented,
            mileage: row.mileage,
            actualMaintCost: row.actualMaintCost,
          };
          assetMap.get(assetId).maintenances.push(maintRecord);
          allMaintenances.push(maintRecord);
        }
      });

      contractData.assets = Array.from(assetMap.values());

      // Calculate maintenance status
      const maintenanceStatus = calculateMaintenanceStatus(allMaintenances);
      contractData.maintenanceStatus = maintenanceStatus;

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
    const db = getMainDatabase();

    const query = `
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
        a.plateNo,
        a.chassisNo
      FROM tbl_Contract c
      INNER JOIN tbl_Asset a ON a.contractId = c.contractId
      INNER JOIN tbl_AssetMaintenance am ON am.assetId = a.assetId
      WHERE c.contractNo = ?
      ORDER BY am.dateImplemented DESC, am.maintDueDate DESC
    `;

    const [results] = await db.execute(query, [contractNo]);

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

module.exports = router;

