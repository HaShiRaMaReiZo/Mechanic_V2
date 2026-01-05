require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admin-web',
};

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.log('Usage: node scripts/create-admin.js <username> <password>');
    console.log('Example: node scripts/create-admin.js admin password123');
    process.exit(1);
  }

  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id, username FROM users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      // Update existing user to admin
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.execute(
        'UPDATE users SET password = ?, role = "admin", is_active = 1 WHERE username = ?',
        [hashedPassword, username]
      );
      console.log(`✅ Updated user "${username}" to admin role`);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.execute(
        `INSERT INTO users (username, password, role, is_active) 
         VALUES (?, ?, 'admin', 1)`,
        [username, hashedPassword]
      );
      console.log(`✅ Created admin user "${username}"`);
    }

    await connection.end();
    console.log('\n✅ Done! You can now login with:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

createAdmin();

