# Mechanic V2 - Project Structure

## 📁 Project Overview

This is a React Native/Expo mobile application with a Node.js/Express backend for mechanic contract management.

## 🏗️ Project Structure

```
Mechanic_V2/
├── backend/                    # Node.js/Express Backend
│   ├── config/                 # Database configuration
│   ├── database/               # Database initialization & connection
│   │   ├── init.js            # Local MySQL database setup
│   │   └── main-db.js         # Main database connection via SSH
│   ├── models/                 # Data models
│   │   └── User.js            # User model for authentication
│   ├── routes/                 # API routes
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── contracts.js       # Contract search endpoints
│   │   └── health.js          # Health check endpoint
│   ├── scripts/                # Utility scripts
│   │   ├── check-table-columns.js
│   │   ├── test-ssh-connection.js
│   │   └── ...
│   ├── server.js              # Express server entry point
│   └── .env                    # Environment variables
│
└── mechanic_v2/                # React Native/Expo Frontend
    ├── app/                    # Expo Router file-based routing
    │   ├── _layout.tsx         # Root layout
    │   ├── index.tsx          # Root redirect (→ /login)
    │   ├── login.tsx           # Login screen
    │   ├── modal.tsx           # Modal screen
    │   └── (tabs)/             # Tab navigation group
    │       ├── _layout.tsx     # Tab layout configuration
    │       └── home.tsx        # Home screen (contract search)
    ├── services/               # API services
    │   ├── api.ts             # API client
    │   └── auth.ts             # Authentication service
    └── components/             # Reusable components
```

## 🔄 Routing Structure (Expo Router)

### File-Based Routing
- `app/index.tsx` → Redirects to `/login`
- `app/login.tsx` → Login screen
- `app/(tabs)/home.tsx` → Home screen (contract search) **[Renamed from index.tsx]**
- `app/modal.tsx` → Modal screen

### Tab Navigation
- **Home Tab**: `app/(tabs)/home.tsx`
  - Contract search functionality
  - Displays contract details, assets, and maintenance records

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/auth/me` - Get current user

### Contracts
- `GET /api/contracts/search?contractNo=XXX` - Search contract by number

### Health
- `GET /api/health` - Server health check

## 🗄️ Database Structure

### Local Database (MySQL)
- **Database**: `mechanic_v2`
- **Table**: `users` (for authentication)
- **Port**: 3307

### Main Database (Remote via SSH)
- **Database**: `r2o_db`
- **Tables**:
  - `tbl_Contract` - Contract information
  - `tbl_Asset` - Asset/vehicle information
  - `tbl_AssetMaintenance` - Maintenance records
- **Connection**: SSH tunnel to remote server

## 🔐 SSH Configuration

The backend connects to the main database via SSH tunnel:
- **SSH Host**: `123.253.22.20`
- **SSH User**: `junior`
- **SSH Key**: `C:/Users/HP/.ssh/id_rsa`
- **Key Passphrase**: (stored in `.env`)

## 📝 Recent Changes

### File Renaming
- ✅ Renamed `app/(tabs)/index.tsx` → `app/(tabs)/home.tsx`
- ✅ Tab layout already configured for "home" route

### Backend Fixes
- ✅ Fixed SQL column names (camelCase: `contractId`, `contractNo`, etc.)
- ✅ Removed non-existent columns (`CustomerFullName`, `PhoneNo1`)
- ✅ Updated to use `customerId` instead

### Frontend Fixes
- ✅ Updated to display `customerId` instead of `customerFullName` and `phoneNo1`

## 🚀 Running the Project

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd mechanic_v2
npm install
npx expo start
```

## 📱 Development Notes

- **Physical Device Testing**: Update IP in `services/api.ts` (currently `172.16.2.113`)
- **Database**: Local MySQL on port 3307, main DB via SSH tunnel
- **Authentication**: JWT tokens stored in AsyncStorage

