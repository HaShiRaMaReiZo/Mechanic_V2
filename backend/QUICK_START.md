# 🚀 Quick Start - Import Your Users CSV

## Step 1: Create MySQL Database in phpMyAdmin

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Click **"New"** → Database name: `mechanic_v2` → **Create**

## Step 2: Create .env File

Create a file named `.env` in the `backend` folder with this content:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=mechanic_v2

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Default password for imported users
DEFAULT_PASSWORD=Mechanic123
```

**Replace `your_mysql_password_here` with your actual MySQL password!**

## Step 3: Install Dependencies (if not done)

```bash
cd backend
npm install
```

## Step 4: Import Users

Run this command:

```bash
node scripts/import-users-csv.js "C:\Users\HP\OneDrive\Desktop\Users.csv"
```

The script will:
- ✅ Read your CSV file
- ✅ Filter only "mechanic" users
- ✅ Hash all passwords
- ✅ Import to MySQL database
- ✅ Show import summary

## Step 5: Start the Server

```bash
npm run dev
```

Server will run on `http://localhost:3000`

## Step 6: Test Login

Users can login with:
- **Username**: Their `userName` from CSV (e.g., `r2omechanic001`)
- **Password**: `Mechanic123` (or whatever you set in DEFAULT_PASSWORD)

---

## Troubleshooting

### Error: "Access denied for user"
- Check your MySQL password in `.env` file
- Make sure MySQL is running

### Error: "Database doesn't exist"
- Create the database in phpMyAdmin first (Step 1)

### Error: "Cannot find module"
- Run `npm install` first

