require('dotenv').config();
const { initMainDatabase, getMainDatabase } = require('../database/main-db');

/**
 * Check actual column names in the database tables
 */

async function checkColumns() {
  try {
    console.log('🔍 Initializing database connection...\n');
    await initMainDatabase();
    
    console.log('🔍 Checking table columns...\n');
    
    const db = getMainDatabase();
    
    // Check tbl_Contract columns
    console.log('📋 tbl_Contract columns:');
    const [contractCols] = await db.execute('SHOW COLUMNS FROM tbl_Contract');
    contractCols.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    
    console.log('\n📋 tbl_Asset columns:');
    const [assetCols] = await db.execute('SHOW COLUMNS FROM tbl_Asset');
    assetCols.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    
    console.log('\n📋 tbl_AssetMaintenance columns:');
    const [maintCols] = await db.execute('SHOW COLUMNS FROM tbl_AssetMaintenance');
    maintCols.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    
    console.log('\n✅ Done! Use these column names in your SQL queries.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkColumns();

