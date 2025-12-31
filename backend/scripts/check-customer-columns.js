require('dotenv').config();
const { initMainDatabase, getMainDatabase } = require('../database/main-db');

async function checkCustomerColumns() {
  try {
    console.log('🔍 Initializing database connection...\n');
    await initMainDatabase();
    
    const db = getMainDatabase();
    
    console.log('📋 Columns in tbl_Customer:\n');
    const [cols] = await db.execute('SHOW COLUMNS FROM tbl_Customer');
    
    // Show columns related to name and phone
    console.log('📋 Name/Phone related columns:');
    cols.forEach(col => {
      const field = col.Field.toLowerCase();
      if (field.includes('name') || field.includes('phone') || field.includes('fullname') || field.includes('contact')) {
        console.log(`   - ${col.Field} (${col.Type})`);
      }
    });
    
    // Show first 30 columns
    console.log('\n📋 First 30 columns:');
    cols.slice(0, 30).forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    
    // Check tbl_CustomerPhone table
    console.log('\n📋 Columns in tbl_CustomerPhone:');
    const [phoneCols] = await db.execute('SHOW COLUMNS FROM tbl_CustomerPhone');
    phoneCols.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCustomerColumns();

