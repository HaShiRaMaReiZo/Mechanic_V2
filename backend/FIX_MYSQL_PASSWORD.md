# 🔧 Fix MySQL Password Issue

## The Problem
MySQL is rejecting connections because it requires a password, but we don't know what it is.

## Quick Solutions

### Solution 1: Check phpMyAdmin Login (Easiest)
1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. **Do you enter a password when logging in?**
   - If YES → That's your password! Update `.env` file with it
   - If NO → Continue to Solution 2

### Solution 2: Create Database Manually in phpMyAdmin
1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Click **"New"** in left sidebar
3. Database name: `mechanic_v2`
4. Collation: `utf8mb4_unicode_ci`
5. Click **"Create"**
6. Then try the import again

### Solution 3: Create New MySQL User (Recommended)
1. In phpMyAdmin, click **"User accounts"** tab
2. Click **"Add user account"**
3. Fill in:
   - **User name**: `mechanic_app`
   - **Host name**: `localhost`
   - **Password**: Leave empty OR set a simple password
4. Under **"Database for user account"**:
   - Select **"Grant all privileges on database 'mechanic_v2'"**
5. Click **"Go"** at bottom
6. Update your `.env` file:
   ```
   DB_USER=mechanic_app
   DB_PASSWORD=(empty or your password)
   ```

### Solution 4: Find Root Password
1. Open: `C:\xampp\phpMyAdmin\config.inc.php`
2. Look for line: `$cfg['Servers'][$i]['password'] = '...';`
3. Copy the password value
4. Update `.env` file with it

### Solution 5: Reset MySQL Root Password
If you have admin access:

1. Open XAMPP Control Panel
2. Stop MySQL
3. Open Command Prompt as Administrator
4. Navigate to: `cd C:\xampp\mysql\bin`
5. Run: `mysqld --skip-grant-tables`
6. Open new Command Prompt:
   ```
   cd C:\xampp\mysql\bin
   mysql -u root
   ```
7. In MySQL, run:
   ```sql
   USE mysql;
   UPDATE user SET password='' WHERE User='root';
   FLUSH PRIVILEGES;
   EXIT;
   ```
8. Restart MySQL from XAMPP Control Panel

## After Fixing Password

Update your `.env` file in `backend` folder:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=mechanic_v2
```

Then run the import:
```bash
node scripts/import-users-csv.js "C:\Users\HP\OneDrive\Desktop\Users.csv"
```

## Test Connection

Run this to test:
```bash
node scripts/test-mysql-connection.js
```

