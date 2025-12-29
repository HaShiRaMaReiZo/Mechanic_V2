/**
 * This script helps set up MySQL for the application
 * Run this if you're having connection issues
 */

console.log(`
🔧 MySQL Setup Helper
=====================

If you're getting "Access denied" errors, here are your options:

Option 1: Find your MySQL password
-----------------------------------
1. Open phpMyAdmin in browser
2. Check what credentials you use to login
3. Or check: C:\\xampp\\phpMyAdmin\\config.inc.php
4. Look for $cfg['Servers'][$i]['password'] = '...';

Option 2: Reset MySQL root password (if you have access)
----------------------------------------------------------
1. Stop MySQL service
2. Start MySQL with --skip-grant-tables
3. Run: UPDATE mysql.user SET password=PASSWORD('newpass') WHERE User='root';
4. Restart MySQL normally

Option 3: Create a new MySQL user (Recommended)
------------------------------------------------
1. Login to phpMyAdmin
2. Go to "User accounts" tab
3. Click "Add user account"
4. Username: mechanic_app
5. Host: localhost
6. Password: (leave empty or set a simple one)
7. Check "Grant all privileges"
8. Click "Go"

Then update your .env file:
DB_USER=mechanic_app
DB_PASSWORD=(your password or empty)

Option 4: Use XAMPP Control Panel
-----------------------------------
1. Open XAMPP Control Panel
2. Click "Shell" button
3. Run: mysql -u root
   (This might work if XAMPP has special setup)

Option 5: Check if MySQL is using socket authentication
-------------------------------------------------------
Some XAMPP setups use socket files instead of passwords.
Try updating .env with:
DB_HOST=127.0.0.1
(or check your phpMyAdmin config for the exact host)

After updating .env, try the import again:
node scripts/import-users-csv.js "C:\\Users\\HP\\OneDrive\\Desktop\\Users.csv"
`);

