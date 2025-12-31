require('dotenv').config();
const { initMainDatabase, getMainDatabase } = require('../database/main-db');

async function checkCustomerTable() {
  try {
    console.log('🔍 Initializing database connection...\n');
    await initMainDatabase();
    
    const db = getMainDatabase();
    
    // Get all tables
    const [tables] = await db.execute('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    console.log('🔍 Looking for customer-related tables...\n');
    const customerTables = tableNames.filter(name => 
      name.toLowerCase().includes('customer') || 
      name.toLowerCase().includes('client') ||
      name.toLowerCase().includes('person')
    );
    
    if (customerTables.length > 0) {
      console.log('📋 Found customer-related tables:');
      customerTables.forEach(table => {
        console.log(`   - ${table}`);
      });
      
      // Check the first customer table
      const firstTable = customerTables[0];
      console.log(`\n📋 Columns in ${firstTable}:`);
      const [cols] = await db.execute(`SHOW COLUMNS FROM ${firstTable}`);
      cols.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
    } else {
      console.log('❌ No customer-related tables found');
      console.log('\n📋 All tables:');
      tableNames.slice(0, 20).forEach(table => {
        console.log(`   - ${table}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCustomerTable();

