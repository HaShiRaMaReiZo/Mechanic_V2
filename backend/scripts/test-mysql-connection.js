require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * Test MySQL connection with different password options
 */

async function testConnection() {
  console.log('🔍 Testing MySQL connection...\n');
  console.log('='.repeat(50));

  const passwordsToTry = [
    '',           // Empty
    'root',       // Common default
    'password',   // Common default
    '',           // Will try with no password field
  ];

  for (const password of passwordsToTry) {
    try {
      console.log(`\n🔐 Trying password: ${password === '' ? '(empty)' : password}`);
      
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: password,
      });

      console.log('✅ SUCCESS! Connected to MySQL');
      console.log(`   Use this in your .env file:`);
      console.log(`   DB_PASSWORD=${password === '' ? '' : password}`);
      
      await connection.end();
      return password;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('❌ Could not connect with any common passwords');
  console.log('\n📋 Next steps:');
  console.log('1. Check phpMyAdmin config file for password');
  console.log('2. Try connecting via command line: mysql -u root -p');
  console.log('3. Or reset MySQL root password');
  console.log('\n💡 Tip: Look for config.inc.php in:');
  console.log('   - C:\\xampp\\phpMyAdmin\\');
  console.log('   - C:\\wamp\\apps\\phpmyadmin\\');
  console.log('   - C:\\laragon\\etc\\apps\\phpmyadmin\\');
  
  return null;
}

testConnection().catch(console.error);

