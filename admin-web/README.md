# Admin Dashboard

Admin web dashboard for reviewing and managing maintenance service submissions.

## Features

- **Service Review**: View, approve, reject, edit, and delete maintenance services
- **Weekly Summary**: View weekly service summaries and payment status
- **Payment Management**: Manage mechanic payment records and status
- **Dashboard Overview**: Statistics and quick actions

## Setup

### 1. Database Setup

1. Create `admin-web` database in MySQL
2. Run the SQL script to create users table:
   ```bash
   mysql -u root -p admin-web < scripts/init-database.sql
   ```
3. Import users from `systemUser.sql`:
   - First, import `systemUser.sql` into a temporary table in phpMyAdmin
   - Then run the INSERT query from `scripts/init-database.sql` to copy users to the `users` table
   - Update at least one user to admin role:
     ```sql
     UPDATE users SET role = 'admin' WHERE username = 'your_username';
     ```

### 2. Environment Configuration

Create `.env.local` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=admin-web

# JWT Secret (change in production)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
admin-web/
├── app/
│   ├── (dashboard)/          # Protected routes with sidebar
│   │   ├── dashboard/        # Dashboard overview
│   │   ├── services/         # Services review
│   │   ├── weekly-summary/   # Weekly summary
│   │   └── payments/         # Payment management
│   ├── api/                  # Next.js API routes
│   │   ├── auth/            # Authentication endpoints
│   │   └── admin/            # Admin endpoints
│   ├── login/                # Login page
│   └── layout.tsx           # Root layout
├── lib/
│   ├── db.ts                # Database connection
│   ├── api.ts               # API client
│   └── auth-middleware.ts   # Auth middleware
└── scripts/
    └── init-database.sql    # Database initialization script
```

## Authentication

- Login with admin credentials (role must be 'admin' in users table)
- JWT token stored in localStorage
- Protected routes require authentication
- Auto-redirect to login if not authenticated

## Database

- Uses its own `admin-web` database
- Connects directly to MySQL (not through backend API)
- Users table stores admin credentials
- All maintenance data comes from `mechanic_v2` database (shared with backend)

## Notes

- Admin-web has its own database for user authentication
- Maintenance service data is read from the `mechanic_v2` database (same as backend)
- Images are served from backend `/uploads` route
- Admin role required for all operations
