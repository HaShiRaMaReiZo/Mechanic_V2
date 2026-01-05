require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admin-web',
};

async function checkTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Get ALL tables
    const [allTables] = await connection.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ?
       ORDER BY table_name`,
      [dbConfig.database]
    );

    console.log(`📋 All tables in '${dbConfig.database}' database:\n`);
    
    if (allTables.length === 0) {
      console.log('   ⚠️  No tables found!');
    } else {
      for (const table of allTables) {
        const tableName = table.table_name;
        console.log(`   📊 ${tableName}`);
        
        // Get column info
        const [columns] = await connection.query(
          `SELECT COLUMN_NAME, DATA_TYPE 
           FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
           ORDER BY ORDINAL_POSITION
           LIMIT 10`,
          [dbConfig.database, tableName]
        );
        
        if (columns.length > 0) {
          console.log(`      Columns: ${columns.map(c => c.COLUMN_NAME).join(', ')}${columns.length >= 10 ? '...' : ''}`);
        }
        
        // Get row count
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        console.log(`      Rows: ${count[0].count}\n`);
      }
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkTables();

