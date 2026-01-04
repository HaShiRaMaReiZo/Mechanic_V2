# Mechanic V2 Backend

Node.js/Express backend API with MySQL database for the Mechanic V2 application.

## Features

- ✅ MySQL database (via phpMyAdmin)
- ✅ JWT-based authentication
- ✅ User management
- ✅ Password hashing with bcrypt
- ✅ RESTful API endpoints

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** in `.env`:
   - `DB_HOST`: MySQL host (default: localhost)
   - `DB_USER`: MySQL username (default: root)
   - `DB_PASSWORD`: MySQL password
   - `DB_NAME`: Database name (default: mechanic_v2)
   - `PORT`: Server port (default: 3000)
   - `JWT_SECRET`: Secret key for JWT tokens (change this!)
   - `JWT_EXPIRE`: Token expiration time (default: 7d)
   - `DEFAULT_PASSWORD`: Default password for imported users

4. **Create MySQL database:**
   - Open phpMyAdmin (`http://localhost/phpmyadmin`)
   - Create new database: `mechanic_v2`
   - The table will be created automatically when you start the server

5. **Start the server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

## Import Users from Main Database

See **[IMPORT_GUIDE.md](./IMPORT_GUIDE.md)** for detailed instructions.

### Quick Import Steps:

1. **Export users from your main MySQL database:**
   - Use the SQL script in `scripts/export-users-from-mysql.sql`
   - Export as CSV format

2. **Import users to MySQL:**
   ```bash
   node scripts/import-from-csv-to-mysql.js path/to/users.csv
   ```

   The script will:
   - Read usernames from CSV
   - Hash passwords with bcrypt
   - Insert users into MySQL database
   - Use default password from `.env` (DEFAULT_PASSWORD)

3. **If you imported via phpMyAdmin directly, hash passwords:**
   ```bash
   node scripts/hash-passwords.js
   ```

## Copy Assets and Maintenance Data from Main DB

After setting up the database tables, you need to copy existing asset and maintenance data from the Main DB to the Standalone DB:

```bash
node scripts/copy-assets-maintenances.js
```

This script will:
- Connect to Main DB (via SSH) and Standalone DB (localhost)
- Copy all assets from `tbl_Asset` in Main DB to Standalone DB
- Copy all maintenance records from `tbl_AssetMaintenance` in Main DB to Standalone DB
- Handle duplicates (updates existing records if they already exist)
- Show progress and summary

**Important Notes:**
- Run this script **once** after initial setup
- The script uses `ON DUPLICATE KEY UPDATE`, so it's safe to run multiple times
- New maintenance records created through the app will be stored in Standalone DB
- Contract and Customer data remains in Main DB (read-only)

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login user
  ```json
  {
    "username": "user123",
    "password": "password123"
  }
  ```

- `GET /api/auth/verify` - Verify JWT token
  - Headers: `Authorization: Bearer <token>`

- `GET /api/auth/me` - Get current user
  - Headers: `Authorization: Bearer <token>`

### Health Check

- `GET /api/health` - Server health status

## Database Schema

### Users Table

```sql
CREATE TABLE users (
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

## Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── database/
│   └── init.js              # MySQL initialization
├── middleware/
│   └── auth.js              # Authentication middleware
├── models/
│   └── User.js              # User model
├── routes/
│   ├── auth.js              # Authentication routes
│   └── health.js            # Health check route
├── scripts/
│   ├── export-users-from-mysql.sql      # MySQL export script
│   ├── import-to-mysql.sql              # MySQL import SQL
│   ├── import-from-csv-to-mysql.js      # CSV import script
│   └── hash-passwords.js                # Password hashing script
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── README.md
├── IMPORT_GUIDE.md           # Detailed import instructions
└── server.js                 # Main server file
```

## Development

- The server runs on `http://localhost:3000` by default
- API base URL: `http://localhost:3000/api`
- Database: MySQL (accessible via phpMyAdmin)

## Notes

- Make sure MySQL is running before starting the server
- Database table is created automatically on first run
- All passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire after 7 days by default
- Default password for imported users: `Mechanic123` (change in `.env`)

## Troubleshooting

### MySQL Connection Issues

- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `.env` file
- Ensure database `mechanic_v2` exists in phpMyAdmin
- Check MySQL user has proper permissions

### Import Issues

- See [IMPORT_GUIDE.md](./IMPORT_GUIDE.md) for detailed troubleshooting
- Make sure CSV format is correct
- Run password hashing script after manual imports
