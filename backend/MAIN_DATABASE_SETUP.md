# Main Database Configuration

## Setup Instructions

The backend needs to connect to your **main database** to search contracts. 

### Step 1: Update .env File

Add these variables to your `backend/.env` file:

```env
# Main Database Configuration (for contract search)
MAIN_DB_HOST=127.0.0.1
MAIN_DB_PORT=3307
MAIN_DB_USER=root
MAIN_DB_PASSWORD=
MAIN_DB_NAME=your_main_database_name
```

**Important**: Replace `your_main_database_name` with the actual name of your main database!

### Step 2: Find Your Main Database Name

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Look at the left sidebar - you'll see a list of databases
3. Find the database that contains `tbl_Contract`, `tbl_Asset`, `tbl_AssetMaintenance` tables
4. Copy that database name

### Step 3: Update .env

```env
MAIN_DB_NAME=the_actual_database_name_here
```

### Step 4: Restart Backend Server

After updating `.env`, restart your backend server:

```bash
cd backend
npm run dev
```

You should see:
```
✅ Local database initialized
✅ Main database initialized
```

If you see an error about main database, check:
- Database name is correct
- Database exists in phpMyAdmin
- Connection credentials are correct

### Step 5: Test Contract Search

Once configured, the contract search API will be available at:
- `GET /api/contracts/search?contractNo=YOUR_CONTRACT_NO`

## Troubleshooting

### Error: "Main database not initialized"
- Check that `MAIN_DB_NAME` is set correctly in `.env`
- Verify the database exists in phpMyAdmin
- Check connection credentials (host, port, user, password)

### Error: "Table doesn't exist"
- Verify table names: `tbl_Contract`, `tbl_Asset`, `tbl_AssetMaintenance`
- Check if table names use different casing (e.g., `TBL_CONTRACT` vs `tbl_Contract`)
- Update column names in `backend/routes/contracts.js` if needed

### Column Name Mismatches

If you get SQL errors about column names, check your actual database schema and update `backend/routes/contracts.js`:

```sql
-- Run this in phpMyAdmin to see actual column names
SHOW COLUMNS FROM tbl_Contract;
SHOW COLUMNS FROM tbl_Asset;
SHOW COLUMNS FROM tbl_AssetMaintenance;
```

Then update the SQL query in `backend/routes/contracts.js` to match your actual column names.

