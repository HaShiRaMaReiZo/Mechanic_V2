require('dotenv').config();
const { initMainDatabase, getMainDatabase } = require('../database/main-db');

/**
 * Add 3 months to a date string
 */
function addThreeMonths(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate maintenance status (same logic as in routes/contracts.js)
 */
function calculateMaintenanceStatus(maintenances) {
  if (!maintenances || maintenances.length === 0) {
    return {
      status: 'ALREADY_IMPLEMENTED',
      maintDueDate: null,
      daysFromDue: 0,
    };
  }

  const sorted = maintenances
    .filter(m => m.maintDueDate)
    .sort((a, b) => new Date(b.maintDueDate) - new Date(a.maintDueDate));
  
  if (sorted.length === 0) {
    return {
      status: 'ALREADY_IMPLEMENTED',
      maintDueDate: null,
      daysFromDue: 0,
    };
  }

  const mostRecent = sorted[0];
  let relevantDate = mostRecent.maintDueDate;

  if (mostRecent.dateImplemented) {
    relevantDate = addThreeMonths(mostRecent.maintDueDate);
  }

  if (!relevantDate) {
    return {
      status: 'ALREADY_IMPLEMENTED',
      maintDueDate: null,
      daysFromDue: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(relevantDate);
  dueDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) {
    return { status: 'OVER_DUE', maintDueDate: relevantDate, daysFromDue: daysDiff };
  } else if (daysDiff <= 7) {
    return { status: 'DUE', maintDueDate: relevantDate, daysFromDue: daysDiff };
  } else {
    return { status: 'NOT_YET_DUE', maintDueDate: relevantDate, daysFromDue: daysDiff };
  }
}

async function findAvailableMaintenance() {
  try {
    console.log('🔍 Finding contracts available for maintenance service...\n');
    console.log('📡 Initializing database connection...\n');
    
    await initMainDatabase();
    const db = getMainDatabase();

    // Get all contracts with maintenance records
    const query = `
      SELECT 
        c.contractId,
        c.contractNo,
        c.contractDate,
        cust.customerFullName,
        cust.phoneNo1,
        a.assetId,
        am.maintId,
        am.maintenanceCode,
        am.maintDueDate,
        am.dateImplemented
      FROM tbl_Contract c
      INNER JOIN tbl_Asset a ON a.contractId = c.contractId
      LEFT JOIN tbl_Customer cust ON cust.customerId = c.customerId
      LEFT JOIN tbl_AssetMaintenance am ON am.assetId = a.assetId
      WHERE am.maintId IS NOT NULL
      ORDER BY c.contractNo, am.maintDueDate DESC
    `;

    const [results] = await db.execute(query);

    if (results.length === 0) {
      console.log('❌ No maintenance records found.');
      process.exit(0);
    }

    // Group by contract
    const contractMap = new Map();

    results.forEach((row) => {
      const contractId = row.contractId;
      
      if (!contractMap.has(contractId)) {
        contractMap.set(contractId, {
          contractId: row.contractId,
          contractNo: row.contractNo,
          contractDate: row.contractDate,
          customerFullName: row.customerFullName || 'N/A',
          phoneNo1: row.phoneNo1 || 'N/A',
          maintenances: [],
        });
      }

      if (row.maintId) {
        contractMap.get(contractId).maintenances.push({
          maintId: row.maintId,
          maintenanceCode: row.maintenanceCode,
          maintDueDate: row.maintDueDate,
          dateImplemented: row.dateImplemented,
        });
      }
    });

    // Calculate status for each contract
    const availableContracts = [];
    const unavailableContracts = [];

    contractMap.forEach((contract) => {
      const status = calculateMaintenanceStatus(contract.maintenances);
      
      const contractInfo = {
        contractNo: contract.contractNo,
        customerName: contract.customerFullName,
        phoneNo1: contract.phoneNo1,
        status: status.status,
        maintDueDate: status.maintDueDate,
        daysFromDue: status.daysFromDue,
      };

      if (status.status === 'ALREADY_IMPLEMENTED') {
        unavailableContracts.push(contractInfo);
      } else {
        availableContracts.push(contractInfo);
      }
    });

    // Filter only DUE contracts
    const dueContracts = availableContracts.filter(c => c.status === 'DUE');

    // Display results
    console.log('='.repeat(80));
    console.log('✅ CONTRACTS DUE FOR MAINTENANCE (Within 7 days)');
    console.log('='.repeat(80));
    console.log(`Total: ${dueContracts.length} contract(s)\n`);

    if (dueContracts.length > 0) {
      // Sort by days from due (ascending - most urgent first)
      dueContracts.sort((a, b) => a.daysFromDue - b.daysFromDue);

      dueContracts.forEach((contract, index) => {
        console.log(`${index + 1}. Contract: ${contract.contractNo}`);
        console.log(`   Customer: ${contract.customerName}`);
        console.log(`   Phone: ${contract.phoneNo1}`);
        console.log(`   Due Date: ${contract.maintDueDate || 'N/A'}`);
        console.log(`   Days: ${contract.daysFromDue > 0 ? `+${contract.daysFromDue}` : contract.daysFromDue} ${contract.daysFromDue === 0 ? '(Today)' : contract.daysFromDue < 0 ? '(Overdue)' : '(Days remaining)'}`);
        console.log('');
      });
    } else {
      console.log('No contracts are currently due for maintenance.\n');
    }

    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`DUE Contracts: ${dueContracts.length}`);
    
    // Count by status for reference
    const statusCount = {
      DUE: availableContracts.filter(c => c.status === 'DUE').length,
      OVER_DUE: availableContracts.filter(c => c.status === 'OVER_DUE').length,
      NOT_YET_DUE: availableContracts.filter(c => c.status === 'NOT_YET_DUE').length,
      ALREADY_IMPLEMENTED: unavailableContracts.length,
    };

    console.log('\nAll Status Breakdown (for reference):');
    console.log(`  DUE: ${statusCount.DUE}`);
    console.log(`  OVER_DUE: ${statusCount.OVER_DUE}`);
    console.log(`  NOT_YET_DUE: ${statusCount.NOT_YET_DUE}`);
    console.log(`  ALREADY_IMPLEMENTED: ${statusCount.ALREADY_IMPLEMENTED}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findAvailableMaintenance();

