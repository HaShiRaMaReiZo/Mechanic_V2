# Admin Web Database Setup Guide

## Step 1: Create Database and Tables

Run the setup script to create the database and users table:

```bash
npm run setup-db
```

This will:
- Create the `admin-web` database (if it doesn't exist)
- Create the `users` table
- Check for existing users

## Step 2: Import Users from systemUser.sql

### Option A: Using phpMyAdmin (Recommended)

1. Open phpMyAdmin
2. Select the `admin-web` database
3. Click "Import" tab
4. Choose `systemUser.sql` file
5. Click "Go" to import
6. This will create a table (usually named `untitled_name` or similar)

### Option B: Using MySQL Command Line

```bash
mysql -u root -p admin-web < C:\Users\HP\OneDrive\Desktop\systemUser.sql
```

## Step 3: Import Users to users Table

After importing systemUser.sql, run:

```bash
npm run import-users
```

This script will:
- Read users from the imported table
- Copy them to the `users` table
- Hash passwords properly
- Set role to 'user' by default

## Step 4: Create Admin User

You need at least one admin user to login. Choose one of these options:

### Option A: Update Existing User to Admin

```bash
npm run create-admin <username> <password>
```

Example:
```bash
npm run create-admin ttvu1 password123
```

### Option B: Create New Admin User

```bash
npm run create-admin admin admin123
```

### Option C: Update via SQL

In phpMyAdmin, run:
```sql
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

## Step 5: Verify Setup

Check that you have admin users:
```sql
SELECT id, username, role FROM users WHERE role = 'admin' AND is_active = 1;
```

## Step 6: Start the Application

```bash
npm run dev
```

Then login at http://localhost:3000/login with your admin credentials.

---

## Troubleshooting

### "Table untitled_name not found"
- Make sure you imported systemUser.sql first
- Check the table name in phpMyAdmin (it might be different)
- Update the table name in `scripts/import-users.js` if needed

### "No admin users found"
- Run: `npm run create-admin <username> <password>`
- Or update an existing user: `UPDATE users SET role = 'admin' WHERE username = 'your_username';`

### "Database connection error"
- Check your `.env.local` file
- Make sure MySQL is running
- Verify database credentials

