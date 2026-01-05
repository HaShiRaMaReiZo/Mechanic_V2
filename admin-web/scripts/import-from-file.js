require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admin-web',
};

async function importFromFile() {
  let connection;
  
  try {
    const sqlFilePath = process.argv[2] || 'C:\\Users\\HP\\OneDrive\\Desktop\\systemUser.sql';
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ SQL file not found: ${sqlFilePath}`);
      process.exit(1);
    }

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    console.log(`📖 Reading SQL file: ${sqlFilePath}`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split by semicolons to get individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements\n`);

    let executed = 0;
    let errors = 0;

    for (const statement of statements) {
      try {
        if (statement.trim().length > 0) {
          await connection.query(statement);
          executed++;
          if (executed % 100 === 0) {
            console.log(`   Executed ${executed} statements...`);
          }
        }
      } catch (error) {
        // Skip errors for statements that might fail (like CREATE TABLE IF EXISTS)
        if (!error.message.includes("doesn't exist") && !error.message.includes('already exists')) {
          console.error(`   ⚠️  Error: ${error.message.substring(0, 100)}`);
          errors++;
        }
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Executed: ${executed} statements`);
    if (errors > 0) {
      console.log(`   Errors: ${errors}`);
    }

    // Check row count
    const [count] = await connection.query('SELECT COUNT(*) as count FROM `untitled_name`');
    console.log(`\n📊 Rows in untitled_name: ${count[0].count}`);

    if (count[0].count > 0) {
      console.log('\n✅ Now you can run: npm run import-users');
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

importFromFile();

