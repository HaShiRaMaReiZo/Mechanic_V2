# 🔍 COMPREHENSIVE PROJECT ANALYSIS - Mechanic V2

**Date:** January 5, 2026  
**Analysis Duration:** Complete deep-dive analysis  
**Project Type:** Full-Stack Maintenance Management System

---

## 📊 EXECUTIVE SUMMARY

**Mechanic V2** is a comprehensive maintenance management system consisting of three interconnected applications:

1. **Mobile App (React Native/Expo)** - For mechanics to search contracts, view maintenance data, and submit service reports
2. **Backend API (Node.js/Express)** - RESTful API with dual database architecture
3. **Admin Web Dashboard (Next.js)** - For administrators to review services, manage payments, and view analytics

### Key Technologies
- **Frontend Mobile**: React Native 0.81.5, Expo SDK 54, Redux Toolkit 2.11.2, TypeScript 5.9.2
- **Backend**: Node.js, Express 4.18.2, MySQL2 3.6.5, SSH2 1.17.0, JWT 9.0.2
- **Admin Web**: Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3, Tailwind CSS 4
- **Databases**: MySQL (Local + Remote via SSH tunnel)

---

## 🏗️ PROJECT ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATIONS                         │
├─────────────────────────────────┬───────────────────────────────┤
│   React Native Mobile App       │   Next.js Admin Web Dashboard │
│   (Mechanics)                    │   (Administrators)            │
│   - Contract Search              │   - Service Review            │
│   - Maintenance Submission       │   - Payment Management        │
│   - Service History              │   - Analytics Dashboard       │
└─────────────────┬───────────────┴───────────────┬───────────────┘
                  │                               │
                  │     HTTP/REST API             │
                  │                               │
         ┌────────┴───────────────────────────────┴──────────┐
         │           Express.js Backend API                  │
         │   - Authentication (JWT)                          │
         │   - Contract Search                               │
         │   - Maintenance Management                        │
         │   - Payment Tracking                              │
         │   - File Upload (Images)                          │
         └─────┬──────────────────────────┬─────────────────┘
               │                          │
      ┌────────┴────────┐        ┌────────┴────────────┐
      │  Local MySQL    │        │  SSH Tunnel         │
      │  (Standalone)   │        │  ↓                  │
      │  - users        │        │  Remote MySQL       │
      │  - tbl_Asset    │        │  (Main Database)    │
      │  - tbl_Asset    │        │  - tbl_Contract     │
      │    Maintenance  │        │  - tbl_Customer     │
      │  - tbl_Mechanic │        │  - tbl_User         │
      │    Payment      │        │                     │
      └─────────────────┘        └─────────────────────┘
```

---

## 📱 MOBILE APP (mechanic_v2)

### Technology Stack
- **Framework**: React Native 0.81.5 with Expo SDK 54
- **Navigation**: Expo Router 6.0.21 (file-based routing)
- **State Management**: Redux Toolkit 2.11.2
- **Language**: TypeScript 5.9.2
- **UI Libraries**: 
  - Expo Linear Gradient
  - Lucide React Native (icons)
  - Expo Image Picker
  - React Native Safe Area Context

### State Management Architecture

#### Redux Store Configuration

**File**: `mechanic_v2/store/configureStore.ts`

```typescript
{
  reducer: {
    auth: authReducer,        // Authentication state
    contracts: contractsReducer,  // Contract search state
    history: historyReducer   // Payment history state
  }
}
```

#### 1. Auth Slice (`features/auth/authSlice.ts`)

**State Shape**:
```typescript
{
  user: AuthUser | null,
  token: string | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null
}
```

**Async Thunks**:
- `login(credentials)` - Authenticates user, stores token in AsyncStorage
- `checkAuth()` - Verifies token on app startup
- `logout()` - Clears token and user data

**Flow**:
1. User enters credentials
2. Dispatch `login()` thunk
3. Call API endpoint `POST /api/auth/login`
4. Store token in AsyncStorage
5. Update Redux state
6. Navigate to home screen

#### 2. Contracts Slice (`features/contracts/contractsSlice.ts`)

**State Shape**:
```typescript
{
  searchResults: ContractData | null,
  isLoading: boolean,
  error: string | null,
  searchHistory: string[]  // Last 10 searches
}
```

**Async Thunks**:
- `searchContract(contractNo)` - Searches contract by number

**Data Structure**:
```typescript
interface ContractData {
  contract: {
    contractId: number;
    contractNo: string;
    contractDate: string;
    customerId: number;
    customerFullName: string;
    phoneNo1: string;
  };
  assets: ContractAsset[];
  maintenanceStatus: MaintenanceStatus;
}
```

#### 3. History Slice (`features/history/historySlice.ts`)

**State Shape**:
```typescript
{
  weeklySummary: WeeklySummary | null,
  paymentPeriods: PaymentPeriod[],
  selectedPeriodServices: ServiceDetail[],
  selectedPeriodDate: string | null,
  isLoading: boolean,
  isRefreshing: boolean,
  error: string | null
}
```

**Async Thunks**:
- `fetchWeeklySummary()` - Gets current week earnings
- `fetchPaymentPeriods()` - Gets all payment periods
- `fetchPeriodServices(weekStartDate)` - Gets services for specific period

### Routing Structure (Expo Router)

**File-Based Routing**:
```
app/
├── _layout.tsx          # Root layout (Redux Provider)
├── index.tsx            # Auth check & redirect
├── (auth)/              # Unauthenticated routes
│   ├── _layout.tsx      # Auth stack layout
│   └── login.tsx        # Login screen
└── (tabs)/              # Authenticated routes (Tab Navigator)
    ├── _layout.tsx      # Tab navigation config
    ├── home.tsx         # Contract search
    ├── history.tsx      # Payment history
    ├── setting.tsx      # Settings
    ├── maintenance-data.tsx  # Maintenance details (hidden from tabs)
    └── services.tsx     # Service submission form (hidden from tabs)
```

**Navigation Flow**:
1. App launches → `index.tsx`
2. Check authentication (`checkAuth()` thunk)
3. If authenticated → `/(tabs)/home`
4. If not authenticated → `/(auth)/login`

### Key Features

#### 1. Contract Search (`home.tsx`)
- Input: Contract number
- API: `GET /api/contracts/search?contractNo=XXX`
- Output: Contract info, asset details, maintenance status
- Navigation: Redirects to `maintenance-data` screen on success

#### 2. Maintenance Data View (`maintenance-data.tsx`)
- Displays contract information
- Shows asset/vehicle details
- Displays maintenance status (DUE, NOT_YET_DUE, OVER_DUE, ALREADY_IMPLEMENTED)
- Shows condition (previous maintenance services)
- Continue button visible only if status is "DUE"

#### 3. Service Submission (`services.tsx`)
- **Service Options** (toggles with amounts):
  - Engine Oil
  - Chain Sprocket
  - Chain Tightening
  - Service Fee
- **Required Fields**:
  - Mileage (km)
  - Total Amount (MMK)
- **Optional**: Photo from camera
- API: `POST /api/contracts/:maintId/submit-service`
- Uses FormData for multipart upload

#### 4. Payment History (`history.tsx`)
- Shows current week summary (earnings, service count)
- Lists all payment periods (weekly)
- Expandable payment cards showing services
- Pull-to-refresh functionality
- Status indicators (Pending/Paid)

### API Service Layer

**File**: `mechanic_v2/services/api.ts`

**Features**:
- **Dynamic Server Discovery**: Automatically finds server IP on local network
- **IP Caching**: Caches working IP in AsyncStorage
- **Singleton Pattern**: Single ApiService instance
- **Methods**:
  - `login(credentials)`
  - `verifyToken(token)`
  - `searchContract(contractNo)`
  - `submitMaintenanceService(maintId, serviceData)`
  - `getWeeklySummary()`
  - `getPaymentPeriods()`
  - `getPeriodServices(weekStartDate)`

**Server Discovery Algorithm**:
1. Try cached IP first
2. Scan common IP ranges (192.168.x.x, 172.16.x.x, 10.0.2.2)
3. Test `/api/health/ip` endpoint
4. Cache working IP for future use

---

## 🖥️ BACKEND API (backend)

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express 4.18.2
- **Databases**: 
  - MySQL2 3.6.5 (local connection)
  - SSH2 1.17.0 (remote tunnel)
- **Authentication**: JWT 9.0.2
- **Password Hashing**: bcryptjs 2.4.3
- **File Upload**: Multer 2.0.2
- **Validation**: express-validator 7.0.1

### Server Configuration

**File**: `backend/server.js`

**Initialization**:
1. Loads environment variables (dotenv)
2. Initializes local database (non-blocking)
3. Initializes main database via SSH (delayed 2 seconds, non-blocking)
4. Sets up middleware (CORS, JSON parsing, URL encoding)
5. Serves static files from `uploads/` directory
6. Registers routes
7. Error handling and 404 middleware

**Routes**:
- `/api/auth` - Authentication endpoints
- `/api/health` - Health check and server IP
- `/api/contracts` - Contract search and maintenance
- `/api/history` - Payment history
- `/api/admin` - Admin dashboard endpoints

### Database Architecture

#### Dual Database System

**1. Standalone Database (Local MySQL)**

**File**: `backend/database/init.js`

- **Connection**: Direct MySQL (localhost:3307)
- **Database**: `mechanic_v2`
- **Purpose**: Operational data (auth, local maintenance records, payments)
- **Access**: READ/WRITE

**Tables**:
```sql
users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE,
  password VARCHAR(255),  -- bcrypt hashed
  email VARCHAR(100),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  role ENUM('user', 'admin', 'mechanic'),
  is_active TINYINT(1),
  phone VARCHAR(20),
  address TEXT,
  last_login DATETIME,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

tbl_Asset (
  assetId INT PRIMARY KEY,
  contractId INT,
  chassisNo VARCHAR(255),
  engineNo VARCHAR(255),
  plateNo VARCHAR(255),
  assetProductName VARCHAR(255),
  productColor VARCHAR(255)
)

tbl_AssetMaintenance (
  maintId INT PRIMARY KEY,
  assetId INT,
  contractId INT,
  maintDueDate DATE,
  maintenanceCode VARCHAR(255),
  dateImplemented DATETIME,  -- NULL = not completed
  mileage INT,
  actualMaintCost DECIMAL(10,2),
  engineOilRefilled TINYINT(1),
  engineOilCost DECIMAL(10,2),
  chainTightened TINYINT(1),
  chainTightenedCost DECIMAL(10,2),
  chainSprocketChanged TINYINT(1),
  chainSprocketChangedCost DECIMAL(10,2),
  otherMaintServices TEXT,
  otherMaintServicesCost DECIMAL(10,2),
  maintCurrentReport TEXT,  -- Image path
  personImplemented INT,  -- Main DB userId
  dtUpdated DATETIME,
  reviewStatus ENUM('pending', 'approved', 'rejected'),
  reviewedBy INT,
  reviewedAt DATETIME,
  reviewNotes TEXT
)

tbl_MechanicPayment (
  paymentId INT PRIMARY KEY AUTO_INCREMENT,
  userId INT,  -- Standalone DB user ID
  weekStartDate DATE,
  weekEndDate DATE,
  totalAmount DECIMAL(10,2),
  serviceCount INT,
  paymentStatus ENUM('pending', 'paid'),
  paidDate DATETIME,
  paidBy INT,
  remarks TEXT,
  UNIQUE KEY unique_user_week (userId, weekStartDate)
)
```

**2. Main Database (Remote MySQL via SSH)**

**File**: `backend/database/main-db.js`

- **Connection**: SSH tunnel to 123.253.22.20
- **SSH Port**: 22
- **MySQL Port**: 3306 (remote) → Dynamic local port
- **Database**: `r2o_db`
- **Purpose**: Source of truth for contracts and customers
- **Access**: READ ONLY

**SSH Configuration**:
- **Host**: 123.253.22.20
- **User**: root (configurable)
- **Auth**: Password or SSH key with passphrase
- **Tunnel**: Creates local port forwarding

**Tables** (Read-only):
```sql
tbl_Contract (
  contractId INT,
  contractNo VARCHAR(255),
  strippedContractNo VARCHAR(255),
  accStrippedContractNo VARCHAR(255),
  contractDate DATE,
  customerId INT
)

tbl_Customer (
  customerId INT,
  customerFullName VARCHAR(255),
  phoneNo1 VARCHAR(50)
)

tbl_User (
  userId INT,
  userName VARCHAR(255)
)
```

### Database Usage Pattern

#### Contract Search Flow

```javascript
// Step 1: Query Main DB (Remote) for contract
const mainDb = getMainDatabase();
const [contractResults] = await mainDb.execute(`
  SELECT c.*, cust.customerFullName, cust.phoneNo1
  FROM tbl_Contract c
  LEFT JOIN tbl_Customer cust ON cust.customerId = c.customerId
  WHERE c.contractNo LIKE ? OR c.strippedContractNo LIKE ?
`, [searchPattern, searchPattern]);

// Step 2: Query Standalone DB (Local) for assets
const localDb = getDatabase();
const [assetResults] = await localDb.execute(`
  SELECT * FROM tbl_Asset WHERE contractId = ?
`, [contractId]);

// Step 3: Query Standalone DB (Local) for maintenance
const [maintResults] = await localDb.execute(`
  SELECT * FROM tbl_AssetMaintenance WHERE assetId IN (...)
`, assetIds);

// Step 4: Calculate maintenance status
const maintenanceStatus = calculateMaintenanceStatus(maintResults);

// Return combined data
return { contract, assets, maintenanceStatus };
```

#### Maintenance Status Calculation

**File**: `backend/routes/contracts.js` (Line 74-175)

**Algorithm**:
1. Get all maintenance records for contract
2. Sort by `maintDueDate` DESC (most recent first)
3. Check if most recent is completed (`dateImplemented` is set)
4. If completed, calculate next due date (+3 months)
5. Calculate days difference from today
6. Return status:
   - **OVER_DUE**: Days < 0 (past due date)
   - **DUE**: Days 0-7 (within 7 days)
   - **NOT_YET_DUE**: Days > 7 (more than 7 days away)
   - **ALREADY_IMPLEMENTED**: No upcoming maintenance

### API Endpoints

#### Authentication Routes (`/api/auth`)

**1. POST /api/auth/login**
- **Purpose**: User login
- **Body**: `{ username, password }`
- **Validation**: express-validator (min 3 chars username, min 6 chars password)
- **Flow**:
  1. Validate input
  2. Find user in Standalone DB
  3. Compare password (bcrypt)
  4. Look up Main DB userId by username
  5. Generate JWT with both IDs
  6. Update last_login
  7. Return token and user data

**2. GET /api/auth/verify**
- **Purpose**: Verify JWT token
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: User data if valid

**3. GET /api/auth/me**
- **Purpose**: Get current user details
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: Complete user profile

#### Contract Routes (`/api/contracts`)

**1. GET /api/contracts/search**
- **Query**: `contractNo=XXX`
- **Purpose**: Search contract and maintenance status
- **Database Flow**:
  1. Query Main DB for contract + customer (JOIN)
  2. Query Standalone DB for assets
  3. Query Standalone DB for maintenance records
  4. Calculate maintenance status
  5. Return combined data

**2. GET /api/contracts/:contractNo/maintenances**
- **Purpose**: Get maintenance history for a contract
- **Returns**: List of all maintenance records

**3. POST /api/contracts/:maintId/submit-service**
- **Purpose**: Submit maintenance service completion
- **Middleware**: `upload.single('image')` - Multer file upload
- **Body** (FormData):
  - `engineOil`: JSON string `{ enabled, amount }`
  - `chainSprocket`: JSON string
  - `chainTightening`: JSON string
  - `serviceFee`: JSON string
  - `mileage`: Number
  - `totalAmount`: Number
  - `image`: File (optional)
- **Flow**:
  1. Parse FormData
  2. Validate required fields (mileage, totalAmount)
  3. Check maintenance record exists (Standalone DB)
  4. If not in Standalone DB, check Main DB and copy
  5. Check if already implemented (`dateImplemented` is set)
  6. Get Main DB userId from JWT token
  7. Update maintenance record in Standalone DB
  8. Set `dateImplemented = NOW()`
  9. Save service details, costs, mileage, image path
  10. Return success response

**Image Storage**:
- **Directory**: `backend/uploads/maintenance/`
- **Filename**: `maint-{maintId}-{timestamp}.{ext}`
- **Limits**: 5MB max, JPEG/JPG/PNG only

#### History Routes (`/api/history`)

**1. GET /api/history/weekly-summary**
- **Purpose**: Get current week earnings summary
- **Auth**: Required (JWT)
- **Returns**: 
  - Week start/end dates
  - Total amount
  - Service count
  - Payment status
  - Days until payment
- **Flow**:
  1. Get Main DB userId from token
  2. Calculate week boundaries (Monday-Sunday)
  3. Query services for current week
  4. Calculate totals
  5. Get/create payment record
  6. Remove duplicate payment records (data cleanup)
  7. Return summary

**Week Boundary Calculation**:
```javascript
// Monday = week start, Sunday = week end
const day = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
const daysToMonday = day === 0 ? 6 : day - 1;
const monday = new Date(d);
monday.setDate(d.getDate() - daysToMonday);
const sunday = new Date(monday);
sunday.setDate(monday.getDate() + 6);
```

**2. GET /api/history/payment-periods**
- **Purpose**: Get all payment periods (current + previous)
- **Auth**: Required
- **Returns**: List of payment periods with formatted dates

**3. GET /api/history/period/:weekStartDate/services**
- **Purpose**: Get services for specific payment period
- **Auth**: Required
- **Returns**: Detailed service list with contract/customer info
- **Flow**:
  1. Find payment record by weekStartDate
  2. If not found, try multiple strategies (overlap detection, closest match)
  3. Query Standalone DB for services
  4. For each service, query Main DB for contract/customer info
  5. Format and return service details

#### Admin Routes (`/api/admin`)

**Middleware**: `adminAuth` - Checks JWT token and user role = 'admin'

**1. GET /api/admin/stats**
- **Purpose**: Dashboard statistics
- **Returns**:
  - Pending reviews count
  - Week services count & total
  - All-time services count & total
  - Pending payments count

**2. GET /api/admin/services**
- **Purpose**: List all services with filters
- **Query Params**:
  - `status`: pending/approved/rejected
  - `userId`: Filter by mechanic
  - `startDate`, `endDate`: Date range
  - `search`: Search by maintId or maintenanceCode
  - `page`, `limit`: Pagination
- **Returns**: Paginated service list

**3. GET /api/admin/services/:maintId**
- **Purpose**: Get single service details

**4. POST /api/admin/services/:maintId/approve**
- **Purpose**: Approve service
- **Updates**: Sets `reviewStatus='approved'`, `reviewedBy`, `reviewedAt`

**5. POST /api/admin/services/:maintId/reject**
- **Purpose**: Reject service with notes
- **Body**: `{ reviewNotes }`
- **Updates**: Sets `reviewStatus='rejected'`, notes, reviewer, timestamp

**6. PUT /api/admin/services/:maintId**
- **Purpose**: Edit service data
- **Body**: Partial service data

**7. DELETE /api/admin/services/:maintId**
- **Purpose**: Soft delete service
- **Updates**: Sets `dtDeleted`, `personDeleted`

**8. GET /api/admin/weekly-summary**
- **Purpose**: Get weekly summaries (all users or filtered)

**9. GET /api/admin/payments**
- **Purpose**: List payment records with filters

**10. PUT /api/admin/payments/:paymentId/status**
- **Purpose**: Update payment status (pending → paid)
- **Body**: `{ paymentStatus, paidDate, remarks }`

**11. GET /api/admin/users**
- **Purpose**: List all mechanics

#### Health Routes (`/api/health`)

**1. GET /api/health**
- **Purpose**: Health check
- **Returns**: Server status, database status

**2. GET /api/health/ip**
- **Purpose**: Get server IP for client configuration
- **Returns**: Server IP, port, base URL

### Models

#### User Model (`backend/models/User.js`)

**Class**: `User`

**Properties**:
- id, username, password (hashed), email
- firstName, lastName, role, isActive
- phone, address, lastLogin, createdAt, updatedAt

**Static Methods**:
- `findByUsername(username)` - Lookup user
- `findById(id)` - Get user by ID
- `create(userData)` - Create new user (hashes password)

**Instance Methods**:
- `comparePassword(candidatePassword)` - Verify password (bcrypt)
- `updateLastLogin()` - Update last_login timestamp
- `update(updates)` - Update user fields
- `delete()` - Delete user

### Middleware

#### 1. Admin Auth (`middleware/adminAuth.js`)
- **Purpose**: Protect admin routes
- **Flow**:
  1. Extract JWT from Authorization header
  2. Verify token
  3. Lookup user in database
  4. Check if active
  5. Check if role = 'admin'
  6. Attach user to `req.user`

#### 2. Upload (`middleware/upload.js`)
- **Purpose**: Handle file uploads
- **Library**: Multer
- **Storage**: Disk storage in `uploads/maintenance/`
- **Filename**: `maint-{maintId}-{timestamp}.{ext}`
- **Validation**: Only JPEG/JPG/PNG, max 5MB

### User ID Management

**Dual User ID System**:

1. **Standalone DB User ID** (`users.id`):
   - Used for authentication
   - Stored in JWT as `userId`
   - Used for payment tracking (`tbl_MechanicPayment.userId`)

2. **Main DB User ID** (`tbl_User.userId`):
   - Used for service tracking
   - Stored in JWT as `mainDbUserId` (optional)
   - Used in `tbl_AssetMaintenance.personImplemented`
   - Looked up by matching `username` between databases

**Token Structure**:
```javascript
{
  userId: 123,          // Standalone DB user.id
  mainDbUserId: 2545,   // Main DB tbl_User.userId (if found)
  iat: ...,
  exp: ...
}
```

**Helper Functions**:
```javascript
// Get Standalone DB user ID
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = jwt.verify(token, SECRET);
  return decoded.userId;
};

// Get Main DB user ID (with fallback lookup)
const getMainDbUserIdFromToken = async (req) => {
  const decoded = jwt.verify(token, SECRET);
  
  if (decoded.mainDbUserId) {
    return decoded.mainDbUserId;
  }
  
  // Fallback: lookup by username
  const [users] = await standaloneDb.execute(
    'SELECT username FROM users WHERE id = ?', 
    [decoded.userId]
  );
  
  const [mainUsers] = await mainDb.execute(
    'SELECT userId FROM tbl_User WHERE userName = ?',
    [users[0].username]
  );
  
  return mainUsers[0]?.userId || null;
};
```

---

## 🌐 ADMIN WEB DASHBOARD (admin-web)

### Technology Stack
- **Framework**: Next.js 16.1.1
- **UI**: React 19.2.3, Tailwind CSS 4
- **Language**: TypeScript 5.9.3
- **HTTP Client**: Axios 1.13.2
- **State**: React Query (@tanstack/react-query 5.90.16)
- **Auth**: JWT (jsonwebtoken 9.0.3)

### Application Structure

```
admin-web/
├── app/
│   ├── api/              # Next.js API routes (proxy to backend)
│   │   ├── auth/login/route.ts
│   │   └── admin/       # Admin endpoints
│   ├── (dashboard)/     # Dashboard layout group
│   │   ├── layout.tsx   # Sidebar navigation
│   │   ├── dashboard/page.tsx
│   │   ├── services/page.tsx
│   │   ├── services/[maintId]/page.tsx
│   │   ├── weekly-summary/page.tsx
│   │   └── payments/page.tsx
│   ├── login/page.tsx   # Login page
│   ├── globals.css
│   └── layout.tsx       # Root layout
├── lib/
│   ├── api.ts          # API client (Axios)
│   ├── auth.ts         # Auth utilities
│   ├── auth-middleware.ts  # Next.js middleware for auth
│   └── db.ts           # Direct MySQL connection
├── middleware.ts       # Route protection
└── components/         # Reusable components
```

### Features

#### 1. Dashboard (`/dashboard`)
- **Statistics Cards**:
  - Pending reviews
  - Services this week
  - Week total amount
  - Pending payments
  - All services count
  - All-time total
- **Quick Actions**:
  - Review pending services
  - Process payments
  - View weekly summary

#### 2. Services Management (`/services`)
- **List View**:
  - Filterable by status (pending/approved/rejected)
  - Searchable by maintId or maintenanceCode
  - Date range filter
  - Pagination
- **Detail View** (`/services/[maintId]`):
  - Full service information
  - Service breakdown (oil, chain, sprocket, etc.)
  - Image display
  - Approve/Reject buttons
  - Edit functionality
  - Delete (soft delete)

#### 3. Weekly Summary (`/weekly-summary`)
- Shows summaries by user and week
- Service count and total amount
- Filterable by date and user

#### 4. Payments (`/payments`)
- **List View**:
  - All payment periods
  - Filterable by status (pending/paid)
  - Filterable by mechanic
  - Pagination
- **Actions**:
  - Mark as paid
  - Add payment date
  - Add remarks

### API Client (`lib/api.ts`)

**Configuration**:
- Base URL: `/api` (Next.js API routes)
- Axios interceptors:
  - Request: Add JWT from localStorage
  - Response: Handle 401 (redirect to login)

**Auth API**:
```typescript
authAPI.login(username, password)
authAPI.logout()
authAPI.isAuthenticated()
```

**Admin API**:
```typescript
adminAPI.getStats()
adminAPI.getServices(filters)
adminAPI.getService(maintId)
adminAPI.approveService(maintId)
adminAPI.rejectService(maintId, notes)
adminAPI.updateService(maintId, data)
adminAPI.deleteService(maintId)
adminAPI.getWeeklySummary(weekStartDate, userId)
adminAPI.getPayments(filters)
adminAPI.updatePaymentStatus(paymentId, data)
adminAPI.getUsers()
```

### Authentication Flow

**Login** (`/login`):
1. User enters credentials
2. POST to `/api/auth/login` (Next.js route)
3. Next.js route proxies to backend
4. Backend validates and returns JWT
5. Store token in localStorage
6. Store token in cookie (for middleware)
7. Redirect to `/dashboard`

**Route Protection** (`middleware.ts`):
```typescript
// Protects /dashboard/* routes
export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verify token
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### Next.js API Routes

**Purpose**: Proxy requests to backend API

**Example** (`app/api/admin/services/route.ts`):
```typescript
export async function GET(request: Request) {
  const token = request.headers.get('Authorization');
  
  // Forward request to backend
  const response = await fetch(`${BACKEND_URL}/api/admin/services`, {
    headers: {
      'Authorization': token,
    },
  });
  
  return Response.json(await response.json());
}
```

**Benefits**:
- Hides backend URL from client
- Can add server-side logic/caching
- Better CORS handling

### Database Scripts (`admin-web/scripts/`)

**1. setup-database.js**
- Creates Standalone DB tables
- Creates initial admin user

**2. create-import-table.js**
- Creates temporary import table for user data

**3. import-from-file.js**
- Imports user data from CSV

**4. import-users.js**
- Imports users into database

**5. create-admin.js**
- Interactive script to create admin user

**6. check-tables.js**
- Verifies database structure

---

## 🔄 COMPLETE WORKFLOW EXAMPLES

### Workflow 1: Mechanic Submits Service

**Step-by-Step Flow**:

1. **Login**:
   - Mechanic opens mobile app
   - Enters credentials
   - App dispatches `login()` thunk
   - Backend validates → Returns JWT
   - Token stored in AsyncStorage
   - Navigate to home screen

2. **Search Contract**:
   - Mechanic enters contract number (e.g., "632044-WCSV1")
   - App dispatches `searchContract()` thunk
   - Backend queries:
     - Main DB: Contract + Customer info
     - Standalone DB: Assets + Maintenance records
   - Backend calculates maintenance status
   - Returns combined data
   - Navigate to maintenance-data screen

3. **View Maintenance Data**:
   - Display contract info (customer name, phone, dates)
   - Display asset info (product, engine, chassis, plate)
   - Display previous maintenance condition
   - Display maintenance status banner
   - If status = "DUE", show Continue button

4. **Fill Service Form**:
   - Mechanic clicks Continue → Navigate to services screen
   - Fill service options:
     - Toggle Engine Oil (enter amount)
     - Toggle Chain Sprocket (enter amount)
     - Toggle Chain Tightening (enter amount)
     - Toggle Service Fee (enter amount)
   - Enter required fields:
     - Mileage: 5000 km
     - Total Amount: 50000 MMK
   - Take photo with camera
   - Click Confirm button

5. **Submit Service**:
   - App validates form (mileage, total amount required)
   - Find maintId from search results
   - Prepare FormData:
     - Service toggles + amounts as JSON
     - Mileage, total amount
     - Image file
   - POST to `/api/contracts/:maintId/submit-service`

6. **Backend Processing**:
   - Multer saves image to `uploads/maintenance/`
   - Parse FormData
   - Validate required fields
   - Check maintenance record exists in Standalone DB
   - If not found, check Main DB and copy record
   - Check if already implemented (prevent duplicate)
   - Get Main DB userId from JWT token
   - UPDATE tbl_AssetMaintenance:
     - Set `dateImplemented = NOW()`
     - Set service flags and costs
     - Set mileage, total cost
     - Set image path
     - Set `personImplemented` = Main DB userId
   - Return success response

7. **Frontend Response**:
   - Show success alert
   - Navigate back to maintenance-data screen
   - Service is now marked as completed

8. **Payment Tracking**:
   - Backend automatically creates/updates payment record
   - Adds service to current week's payment period
   - Updates total amount and service count

9. **Next Search**:
   - If mechanic searches same contract again:
   - Status will show "ALREADY_IMPLEMENTED"
   - Or shows next due date (+3 months)
   - Continue button hidden

### Workflow 2: Admin Reviews Service

1. **Admin Login**:
   - Admin opens web dashboard (admin-web)
   - Enters credentials at `/login`
   - POST to `/api/auth/login`
   - Backend validates credentials
   - Returns JWT
   - Store token in localStorage + cookie
   - Redirect to `/dashboard`

2. **View Dashboard**:
   - Dashboard loads statistics:
     - Pending reviews: 5
     - Services this week: 12
     - Week total: 150,000 MMK
     - Pending payments: 3
   - Click "Review Pending Services"

3. **Services List**:
   - Navigate to `/services?status=pending`
   - GET `/api/admin/services?status=pending`
   - Backend queries Standalone DB
   - Returns paginated list of pending services

4. **Review Service**:
   - Click on service → Navigate to `/services/[maintId]`
   - GET `/api/admin/services/:maintId`
   - Display full service details:
     - Contract number
     - Customer name
     - Mechanic name
     - Service date
     - Service breakdown
     - Costs
     - Mileage
     - Image
   - Admin reviews service quality

5. **Approve/Reject**:
   - If service is good:
     - Click "Approve"
     - POST `/api/admin/services/:maintId/approve`
     - Backend updates `reviewStatus='approved'`
   - If service has issues:
     - Click "Reject"
     - Enter notes: "Image unclear, need better photo"
     - POST `/api/admin/services/:maintId/reject`
     - Backend updates `reviewStatus='rejected'` + notes

6. **Process Payment**:
   - Navigate to `/payments?status=pending`
   - GET `/api/admin/payments?status=pending`
   - List of pending payment periods
   - Click on payment period
   - Review services in that period
   - Click "Mark as Paid"
   - Enter paid date
   - Add remarks (optional)
   - PUT `/api/admin/payments/:paymentId/status`
   - Backend updates `paymentStatus='paid'`, `paidDate`, `paidBy`

### Workflow 3: Mechanic Views Payment History

1. **Open History Tab**:
   - Mechanic opens app
   - Navigates to History tab
   - App dispatches thunks:
     - `fetchWeeklySummary()`
     - `fetchPaymentPeriods()`

2. **View Current Week**:
   - Display transparent card:
     - "This Week (Dec 29 - 4)"
     - "150,000 MMK"
     - "12 services completed for this months"
     - "Payment in 5 days"

3. **View Payment Periods**:
   - List of payment period cards:
     - Current period highlighted
     - Previous periods listed below
   - Each card shows:
     - Month + date range
     - Service count
     - Total amount
     - Status (Pending/Paid badge)

4. **Expand Period**:
   - Mechanic taps on payment card
   - Toggle expansion
   - Dispatch `fetchPeriodServices(weekStartDate)`
   - Backend queries:
     - Find payment record
     - Query services for that week
     - For each service, get contract/customer info from Main DB
   - Display service list:
     - Service date
     - Service types (Engine oil, Chain Tightening, etc.)
     - Amount
     - Customer name
     - Service ID

5. **Pull to Refresh**:
   - Mechanic pulls down
   - Refresh all data
   - Re-fetch summaries and periods

---

## 🗄️ DATABASE MAPPING

### Table Relationships

```
Main Database (Remote - READ ONLY):
┌─────────────────┐
│  tbl_Contract   │──┐
│  - contractId   │  │
│  - contractNo   │  │
│  - customerId   │──┼──┐
└─────────────────┘  │  │
                     │  │
┌─────────────────┐  │  │
│  tbl_Customer   │──┘  │
│  - customerId   │     │
│  - name, phone  │     │
└─────────────────┘     │
                        │
┌─────────────────┐     │
│  tbl_User       │     │
│  - userId       │     │
│  - userName     │     │
└─────────────────┘     │
                        │
                        │ contractId (link)
                        │
Standalone Database (Local - READ/WRITE):
                        │
┌─────────────────┐     │
│  tbl_Asset      │◄────┘
│  - assetId      │
│  - contractId   │──┐
└─────────────────┘  │
                     │ assetId
┌──────────────────┐ │
│  tbl_Asset       │◄┘
│  Maintenance     │
│  - maintId       │
│  - assetId       │
│  - contractId    │
│  - maintDueDate  │
│  - dateImplemented│
│  - personImplemented│ (Main DB userId)
└──────────────────┘

┌─────────────────┐
│  users          │
│  - id           │ (Standalone DB user ID)
│  - username     │ (matches tbl_User.userName)
└─────────────────┘
        │
        │ userId (Standalone)
        │
┌──────────────────┐
│  tbl_Mechanic    │
│  Payment         │
│  - paymentId     │
│  - userId        │ (Standalone DB user ID)
│  - weekStartDate │
│  - totalAmount   │
│  - paymentStatus │
└──────────────────┘
```

### Data Sync Strategy

**Assets and Maintenance**:
1. Initially populated from Main DB
2. Script: `backend/scripts/copy-assets-maintenances.js`
3. Copied to Standalone DB for local operations
4. Updates stay in Standalone DB (don't sync back)

**Why?**
- Performance: Local queries are faster
- Independence: Can work offline
- Safety: Don't modify production Main DB
- Flexibility: Can update maintenance records locally

---

## 🔐 SECURITY IMPLEMENTATION

### Authentication

**JWT Configuration**:
- **Secret**: From environment variable `JWT_SECRET`
- **Expiration**: 7 days (configurable)
- **Payload**: `{ userId, mainDbUserId, iat, exp }`
- **Algorithm**: HS256 (default)

**Password Security**:
- **Hashing**: bcryptjs (10 rounds)
- **Storage**: Never store plaintext
- **Comparison**: Use bcrypt.compare()

### Route Protection

**Mobile App**:
- Check `isAuthenticated` from Redux state
- Redirect to login if false
- Token stored in AsyncStorage
- Sent in Authorization header

**Admin Dashboard**:
- Next.js middleware checks cookie
- Redirect to /login if no token
- Verify JWT signature
- Check user role = 'admin'

### File Upload Security

**Multer Configuration**:
- **File Type Validation**: Only JPEG/JPG/PNG
- **File Size Limit**: 5MB max
- **Filename Sanitization**: Generated server-side
- **Storage**: Controlled directory `uploads/maintenance/`
- **Cleanup**: Delete file if validation fails

### Database Security

**Standalone DB**:
- Direct connection (localhost)
- Credentials in .env
- Connection pooling

**Main DB**:
- SSH tunnel (encrypted connection)
- SSH key authentication
- Passphrase protected
- No direct MySQL port exposure

### API Security

**CORS**:
- Enabled for all origins (development)
- Should restrict in production

**Input Validation**:
- express-validator for auth routes
- Manual validation for other routes
- SQL injection prevention (parameterized queries)

**Error Handling**:
- Generic error messages to client
- Detailed logs on server
- No stack traces in production

---

## 📊 KEY ALGORITHMS

### 1. Maintenance Status Calculation

**File**: `backend/routes/contracts.js`

**Input**: Array of maintenance records

**Algorithm**:
```javascript
function calculateMaintenanceStatus(maintenances) {
  // 1. Filter and sort by maintDueDate DESC
  const sorted = maintenances
    .filter(m => m.maintDueDate)
    .sort((a, b) => new Date(b.maintDueDate) - new Date(a.maintDueDate));
  
  if (sorted.length === 0) {
    return { status: 'ALREADY_IMPLEMENTED' };
  }
  
  const mostRecent = sorted[0];
  let relevantDate = mostRecent.maintDueDate;
  let isCalculated = false;
  
  // 2. If most recent is completed, calculate next due date
  if (mostRecent.dateImplemented) {
    relevantDate = addThreeMonths(mostRecent.maintDueDate);
    isCalculated = true;
  }
  
  // 3. Calculate days difference from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(relevantDate);
  dueDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  
  // 4. Determine status
  if (daysDiff < 0) {
    return { status: 'OVER_DUE', daysFromDue: daysDiff };
  } else if (daysDiff <= 7) {
    return { status: 'DUE', daysFromDue: daysDiff };
  } else {
    return { status: 'NOT_YET_DUE', daysFromDue: daysDiff };
  }
}

function addThreeMonths(dateString) {
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().split('T')[0];
}
```

**Status Meanings**:
- **DUE**: Within 7 days of due date (can submit service)
- **NOT_YET_DUE**: More than 7 days away (too early)
- **OVER_DUE**: Past due date (can still submit)
- **ALREADY_IMPLEMENTED**: Recently completed (wait 3 months)

### 2. Week Boundary Calculation

**File**: `backend/routes/history.js`

**Purpose**: Calculate Monday-Sunday week for payment periods

**Algorithm**:
```javascript
function getWeekBoundaries(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0); // Avoid timezone issues
  
  const day = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // Calculate days to subtract to get to Monday
  const daysToMonday = day === 0 ? 6 : day - 1;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    weekStart: monday,
    weekEnd: sunday,
    weekStartStr: formatLocalDate(monday),
    weekEndStr: formatLocalDate(sunday),
  };
}
```

**Example**:
- Input: 2026-01-03 (Friday)
- Output: 
  - weekStart: 2025-12-29 (Monday)
  - weekEnd: 2026-01-04 (Sunday)

### 3. Server IP Discovery (Mobile App)

**File**: `mechanic_v2/services/api.ts`

**Purpose**: Automatically find backend server on local network

**Algorithm**:
```javascript
async function discoverServerIP() {
  // 1. Try cached IP first
  const cachedIP = await AsyncStorage.getItem(API_IP_CACHE_KEY);
  if (cachedIP && await testIP(cachedIP)) {
    return cachedIP;
  }
  
  // 2. Generate common IPs to try
  const commonIPs = [
    '10.0.2.2',       // Android emulator
    'localhost',      // iOS simulator
    '127.0.0.1',
    // 192.168.x.y ranges
    ...generateRange('192.168.0', 100, 150, 10),
    ...generateRange('192.168.1', 100, 150, 10),
    // 172.16.x.y ranges
    ...generateRange('172.16.0', 100, 200, 20),
    // ... more ranges
  ];
  
  // 3. Test each IP
  for (const ip of commonIPs) {
    try {
      const response = await fetch(
        `http://${ip}:${API_PORT}/api/health/ip`,
        { timeout: 2000 }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.ip) {
          // 4. Cache working IP
          await AsyncStorage.setItem(API_IP_CACHE_KEY, data.ip);
          return data.ip;
        }
      }
    } catch (error) {
      continue; // Try next IP
    }
  }
  
  // 5. Fallback
  return null;
}
```

**Benefits**:
- No manual IP configuration needed
- Works on different networks
- Caches successful IP for speed

---

## 🧪 IMPORTANT SCRIPTS

### Backend Scripts

**1. find-available-maintenance.js**
- **Purpose**: Find all contracts due for maintenance
- **Usage**: `node backend/scripts/find-available-maintenance.js`
- **Output**: 
  - List of DUE contracts (within 7 days)
  - Status breakdown
  - Contract details (number, customer, phone, due date)

**2. copy-assets-maintenances.js**
- **Purpose**: Sync assets and maintenance from Main DB to Standalone DB
- **Usage**: `node backend/scripts/copy-assets-maintenances.js`
- **Flow**:
  1. Connect to Main DB via SSH
  2. Query all assets
  3. Insert into Standalone DB
  4. Query all maintenance records
  5. Insert into Standalone DB
  6. Handle duplicates (ON DUPLICATE KEY UPDATE)

**3. hash-passwords.js**
- **Purpose**: Hash plain passwords in database
- **Usage**: `node backend/scripts/hash-passwords.js`
- **Note**: One-time setup script

**4. reimport-users.js**
- **Purpose**: Re-import users from source
- **Usage**: `node backend/scripts/reimport-users.js`

### Admin Web Scripts

**1. setup-database.js**
- **Purpose**: Initialize Standalone DB tables
- **Usage**: `cd admin-web && npm run setup-db`

**2. create-admin.js**
- **Purpose**: Create admin user interactively
- **Usage**: `cd admin-web && npm run create-admin`
- **Interactive**: Prompts for username, password, email, name

**3. check-tables.js**
- **Purpose**: Verify database structure
- **Usage**: `cd admin-web && npm run check-tables`

---

## 📝 ENVIRONMENT CONFIGURATION

### Backend (.env)

```env
# Server
PORT=3000
HOST=0.0.0.0

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d

# Standalone Database (Local)
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=
DB_NAME=mechanic_v2

# Main Database (Remote via SSH)
MAIN_SSH_HOST=123.253.22.20
MAIN_SSH_PORT=22
MAIN_SSH_USER=root
MAIN_SSH_PASSWORD=your-ssh-password
# OR
MAIN_SSH_KEY_PATH=C:/Users/HP/.ssh/id_rsa
MAIN_SSH_KEY_PASSPHRASE=your-passphrase

MAIN_DB_REMOTE_HOST=127.0.0.1
MAIN_DB_REMOTE_PORT=3306
MAIN_DB_USER=r2o_admin
MAIN_DB_PASSWORD=your-db-password
MAIN_DB_NAME=r2o_db
```

### Admin Web (.env.local)

```env
# Backend API URL
BACKEND_URL=http://localhost:3000

# JWT Secret (must match backend)
JWT_SECRET=your-secret-key-change-in-production

# Database (for direct queries if needed)
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=
DB_NAME=mechanic_v2
```

---

## 🚀 DEPLOYMENT GUIDE

### Prerequisites
1. MySQL 8.0+ (local instance on port 3307)
2. SSH access to remote server (123.253.22.20)
3. Node.js 18+ and npm
4. Expo CLI (for mobile development)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm start  # or npm run dev for development
```

**Port**: 3000 (default)

### Mobile App Setup

```bash
cd mechanic_v2
npm install
npx expo start
```

**Options**:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code for physical device

**Note**: For physical device, ensure phone and computer are on same WiFi network

### Admin Web Setup

```bash
cd admin-web
npm install
cp .env.local.example .env.local
# Edit .env.local
npm run setup-db  # Initialize database
npm run create-admin  # Create admin user
npm run dev  # Development
# or
npm run build && npm start  # Production
```

**Port**: 3001 (default Next.js dev server)

### Database Setup

**1. Create Standalone Database**:
```sql
CREATE DATABASE mechanic_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**2. Run Backend** (auto-creates tables):
```bash
cd backend
npm start
```

**3. Sync Assets & Maintenance**:
```bash
node backend/scripts/copy-assets-maintenances.js
```

**4. Create Users**:
```bash
cd admin-web
npm run create-admin
```

### Production Deployment

**Backend**:
- Use PM2 or similar process manager
- Set NODE_ENV=production
- Configure production database
- Use proper JWT secret
- Set up CORS for production domains

**Admin Web**:
- Build: `npm run build`
- Deploy to Vercel, Netlify, or custom server
- Configure environment variables

**Mobile App**:
- Build APK/AAB: `eas build --platform android`
- Build IPA: `eas build --platform ios`
- Update API base URL for production

---

## 🐛 KNOWN ISSUES & LIMITATIONS

### Current Issues

1. **User ID Mismatch**:
   - Two separate user ID systems (Standalone vs Main DB)
   - Complex mapping logic required
   - Can cause confusion in code

2. **No Real-time Sync**:
   - Assets/maintenance not automatically synced from Main DB
   - Must run sync script manually
   - Risk of stale data

3. **Hardcoded Values**:
   - Some user IDs were hardcoded (now uses token)
   - IP addresses in some places

4. **No Token Refresh**:
   - JWT expires after 7 days
   - No automatic refresh mechanism
   - Users must login again

5. **Limited Error Handling**:
   - Basic error messages
   - No retry mechanisms
   - No offline support

6. **File Upload**:
   - Single image per service
   - No compression
   - No cloud storage (local only)

7. **Payment Period Overlap**:
   - Had duplicate payment records bug
   - Fixed with cleanup logic
   - Could recur if week calculation changes

### Limitations

1. **Scalability**:
   - SSH tunnel for every request
   - No caching layer
   - Direct database queries

2. **Security**:
   - CORS wide open (development)
   - No rate limiting
   - No request validation middleware

3. **Features**:
   - No push notifications
   - No real-time updates
   - No offline mode
   - No data export

4. **Admin Dashboard**:
   - Basic UI
   - Limited analytics
   - No charts/graphs
   - No bulk operations

---

## 🔄 FUTURE IMPROVEMENTS

### Short-term (1-3 months)

1. **Authentication**:
   - [ ] Add token refresh mechanism
   - [ ] Implement session management
   - [ ] Add "Remember me" functionality

2. **Data Sync**:
   - [ ] Automated sync from Main DB (cron job)
   - [ ] Sync status indicator
   - [ ] Manual sync button

3. **User Experience**:
   - [ ] Loading skeletons
   - [ ] Better error messages
   - [ ] Retry failed requests
   - [ ] Optimistic UI updates

4. **Admin Dashboard**:
   - [ ] Add charts/graphs
   - [ ] Export to Excel/PDF
   - [ ] Bulk approve/reject
   - [ ] Advanced filters

### Mid-term (3-6 months)

1. **Performance**:
   - [ ] Add Redis caching
   - [ ] Database query optimization
   - [ ] Image compression
   - [ ] CDN for images

2. **Features**:
   - [ ] Push notifications (FCM)
   - [ ] Real-time updates (WebSocket)
   - [ ] Offline mode (SQLite + sync)
   - [ ] Multi-language support

3. **Security**:
   - [ ] Rate limiting
   - [ ] Request validation middleware
   - [ ] CORS whitelist
   - [ ] Audit logs

4. **Testing**:
   - [ ] Unit tests (Jest)
   - [ ] Integration tests
   - [ ] E2E tests (Cypress)

### Long-term (6+ months)

1. **Architecture**:
   - [ ] Microservices architecture
   - [ ] Event-driven updates
   - [ ] GraphQL API
   - [ ] Message queue (RabbitMQ/Redis)

2. **Analytics**:
   - [ ] Business intelligence dashboard
   - [ ] Predictive maintenance
   - [ ] Performance metrics
   - [ ] Cost analysis

3. **Mobile App**:
   - [ ] Native modules
   - [ ] Background sync
   - [ ] Biometric authentication
   - [ ] Dark mode

4. **Integration**:
   - [ ] Payment gateway integration
   - [ ] SMS notifications
   - [ ] Email notifications
   - [ ] Third-party APIs

---

## 📚 CODE STYLE & CONVENTIONS

### TypeScript/JavaScript

**Naming**:
- **Variables**: camelCase (`contractNo`, `isLoading`)
- **Functions**: camelCase (`calculateMaintenanceStatus`)
- **Classes**: PascalCase (`ApiService`, `User`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Components**: PascalCase (`LoginScreen`, `StatusBanner`)

**Async/Await**:
```javascript
// Preferred
const result = await apiService.searchContract(contractNo);

// Not preferred
apiService.searchContract(contractNo).then(result => { ... });
```

**Error Handling**:
```javascript
try {
  const result = await operation();
  return result;
} catch (error) {
  console.error('Operation error:', error);
  return { success: false, message: error.message };
}
```

### Redux Toolkit

**Slice Structure**:
```typescript
const slice = createSlice({
  name: 'feature',
  initialState,
  reducers: {
    // Synchronous actions
  },
  extraReducers: (builder) => {
    // Async thunk handlers
    builder
      .addCase(thunk.pending, (state) => { ... })
      .addCase(thunk.fulfilled, (state, action) => { ... })
      .addCase(thunk.rejected, (state, action) => { ... });
  },
});
```

**Async Thunks**:
```typescript
export const actionName = createAsyncThunk(
  'feature/actionName',
  async (params, { rejectWithValue }) => {
    try {
      const result = await apiCall(params);
      if (!result.success) {
        return rejectWithValue(result.message);
      }
      return result.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);
```

### Database Queries

**Parameterized Queries** (Prevent SQL Injection):
```javascript
// Good
const [results] = await db.execute(
  'SELECT * FROM users WHERE username = ?',
  [username]
);

// Bad - SQL Injection risk
const [results] = await db.execute(
  `SELECT * FROM users WHERE username = '${username}'`
);
```

---

## 🎯 SUMMARY

### Project Highlights

✅ **Complete Full-Stack Solution**: Mobile app, backend API, admin dashboard  
✅ **Modern Tech Stack**: React Native, Express.js, Next.js, TypeScript  
✅ **State Management**: Redux Toolkit with async thunks  
✅ **Dual Database**: Local + remote via SSH tunnel  
✅ **Authentication**: JWT-based with AsyncStorage persistence  
✅ **File Upload**: Image upload with validation  
✅ **Payment Tracking**: Weekly payment periods  
✅ **Admin Features**: Service review, payment management, analytics  
✅ **Server Discovery**: Automatic IP detection for mobile app  

### Architecture Strengths

1. ✅ **Separation of Concerns**: Clear frontend/backend/admin separation
2. ✅ **Type Safety**: TypeScript throughout
3. ✅ **Modular Structure**: Feature-based organization
4. ✅ **Scalable Redux**: Centralized state management
5. ✅ **Secure Database**: SSH tunnel for remote access
6. ✅ **Persistent Auth**: Survives app restarts
7. ✅ **File-Based Routing**: Intuitive Expo Router structure

### Key Workflows

1. **Mechanic Submits Service**: Login → Search → View → Submit → Track
2. **Admin Reviews Service**: Login → Dashboard → Services → Review → Approve/Reject
3. **Payment Management**: Track weekly → Review services → Mark paid
4. **Status Calculation**: Based on due dates, 3-month intervals, 7-day window

### Technical Debt

⚠️ **User ID Complexity**: Dual user ID system needs simplification  
⚠️ **Manual Sync**: Assets/maintenance not auto-synced  
⚠️ **No Token Refresh**: Users must re-login after expiration  
⚠️ **Basic Error Handling**: Needs improvement for production  
⚠️ **No Caching**: Every request hits database  

### Recommendation

The project is well-structured and functional for its purpose. Key areas for improvement:
1. Implement caching layer (Redis)
2. Add token refresh mechanism
3. Automate data synchronization
4. Improve error handling and user feedback
5. Add comprehensive testing
6. Implement real-time updates

---

**End of Comprehensive Analysis**

*This document provides a complete understanding of the Mechanic V2 project, covering architecture, code flow, state management, database design, and all major features. Use this as a reference for development, onboarding, and future enhancements.*

