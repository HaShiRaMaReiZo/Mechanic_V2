# 📥 Import Guide: How to Import Users to MySQL via phpMyAdmin

This guide will help you import mechanic user data from your main system database to the local MySQL database.

## Step 1: Export Data from Main System

1. Connect to your main MySQL database
2. Run the export query from `scripts/export-users-from-mysql.sql`
3. Export the results as **CSV** format

### Quick Export Query:
```sql
SELECT 
  SUBSTRING_INDEX(email, '@', 1) AS username,
  email,
  'Mechanic123' AS default_password,
  NOW() AS created_at,
  NOW() AS updated_at
FROM tbl_User
WHERE userType = 'mechanic';
```

Save this as `users.csv`

## Step 2: Create Database in phpMyAdmin

1. Open **phpMyAdmin** (usually at `http://localhost/phpmyadmin`)
2. Click **"New"** in the left sidebar to create a new database
3. Database name: `mechanic_v2`
4. Collation: `utf8mb4_unicode_ci`
5. Click **"Create"**

## Step 3: Create Users Table

### Option A: Using phpMyAdmin SQL Tab

1. Select the `mechanic_v2` database
2. Click on the **"SQL"** tab
3. Copy and paste this SQL:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  role ENUM('user', 'admin', 'mechanic') DEFAULT 'user',
  is_active TINYINT(1) DEFAULT 1,
  phone VARCHAR(20),
  address TEXT,
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

4. Click **"Go"**

### Option B: Let Backend Create It

The backend will automatically create the table when you start the server for the first time!

## Step 4: Import Users

### Method 1: Using Node.js Script (Recommended)

1. Make sure your CSV file has this format:
   ```
   username,email,first_name,last_name,role
   john,john@example.com,John,Doe,mechanic
   jane,jane@example.com,Jane,Smith,mechanic
   ```

2. Run the import script:
   ```bash
   cd backend
   node scripts/import-from-csv-to-mysql.js path/to/users.csv
   ```

   The script will:
   - Read the CSV file
   - Hash all passwords with bcrypt
   - Insert users into MySQL
   - Use default password from `.env` (DEFAULT_PASSWORD)

### Method 2: Using phpMyAdmin Import

1. Select the `mechanic_v2` database
2. Click on the **"users"** table
3. Click **"Import"** tab
4. Choose your CSV file
5. Set these options:
   - Format: **CSV**
   - Columns separated with: **,**
   - Columns enclosed with: **"** (if your CSV uses quotes)
   - Columns escaped with: **\**
   - Column names: Check **"Use first line as column names"** if your CSV has headers
6. Click **"Go"**

   ⚠️ **Important**: After importing via phpMyAdmin, you need to hash the passwords!

7. Run the password hashing script:
   ```bash
   cd backend
   node scripts/hash-passwords.js
   ```

## Step 5: Configure Backend

1. Copy `.env.example` to `.env`:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` and set your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=mechanic_v2
   JWT_SECRET=your-super-secret-key-change-this
   DEFAULT_PASSWORD=Mechanic123
   ```

## Step 6: Install Dependencies and Start Server

```bash
cd backend
npm install
npm run dev
```

The server will start on `http://localhost:3000`

## Step 7: Test the API

### Test Health Endpoint:
```bash
curl http://localhost:3000/api/health
```

### Test Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"Mechanic123"}'
```

## Troubleshooting

### Error: "Access denied for user"
- Check your MySQL username and password in `.env`
- Make sure MySQL is running
- Verify user has permissions to access `mechanic_v2` database

### Error: "Database doesn't exist"
- Create the database in phpMyAdmin first
- Or update `DB_NAME` in `.env` to match your database name

### Passwords not working after import
- Make sure you ran `node scripts/hash-passwords.js` after importing
- Check that passwords are hashed (should start with `$2a$`)

### CSV Import Issues
- Make sure CSV uses comma (`,`) as separator
- Check that usernames don't have spaces
- Verify CSV encoding is UTF-8

## Quick Reference

```bash
# Start backend server
cd backend
npm run dev

# Import users from CSV
node scripts/import-from-csv-to-mysql.js users.csv

# Hash all passwords (if imported via phpMyAdmin)
node scripts/hash-passwords.js
```

## Default Login Credentials

After importing, users can login with:
- **Username**: Their username from the CSV
- **Password**: The value set in `DEFAULT_PASSWORD` (default: `Mechanic123`)

Make sure to tell users to change their password after first login!

