# Mechanic V2 - Complete Project Analysis

## 📋 Table of Contents
1. [State Management](#state-management)
2. [Folder Structure](#folder-structure)
3. [Code Flow & Workflow](#code-flow--workflow)
4. [Architecture Patterns](#architecture-patterns)
5. [Data Flow Diagrams](#data-flow-diagrams)

---

## 🗂️ State Management

### **Technology Stack**
- **Primary**: **Redux Toolkit** (`@reduxjs/toolkit`)
- **React Integration**: `react-redux` (v9.2.0)
- **Persistence**: `@react-native-async-storage/async-storage` (for auth tokens)

### **Redux Store Structure**

#### **Store Configuration** (`store/configureStore.ts`)
```typescript
{
  reducer: {
    auth: authReducer,        // Authentication state
    contracts: contractsReducer  // Contract search state
  }
}
```

#### **Auth Slice** (`features/auth/authSlice.ts`)
**State Shape:**
```typescript
{
  user: AuthUser | null,           // Current logged-in user
  token: string | null,            // JWT token
  isAuthenticated: boolean,        // Auth status
  isLoading: boolean,              // Loading state
  error: string | null          // Error messages
}
```

**Actions:**
- `clearError` - Clear error state

**Async Thunks:**
- `login(credentials)` - User login
  - Calls `apiService.login()`
  - Stores token & user in AsyncStorage
  - Updates Redux state
- `checkAuth()` - Check authentication on app start
  - Retrieves token from AsyncStorage
  - Verifies with backend
  - Updates state accordingly
- `logout()` - User logout
  - Clears AsyncStorage
  - Resets Redux state

#### **Contracts Slice** (`features/contracts/contractsSlice.ts`)
**State Shape:**
```typescript
{
  searchResults: ContractData | null,  // Search results
  isLoading: boolean,                   // Loading state
  error: string | null,                // Error messages
  searchHistory: string[]              // Last 10 searched contracts
}
```

**Actions:**
- `clearSearchResults` - Clear search results
- `clearError` - Clear error state

**Async Thunks:**
- `searchContract(contractNo)` - Search contract by number
  - Calls `apiService.searchContract()`
  - Updates state with results
  - Adds to search history (max 10 items)

### **State Management Pattern**
- **Feature-based slices**: Each feature has its own slice
- **Async thunks**: All API calls handled via `createAsyncThunk`
- **Typed hooks**: Custom hooks (`useAppDispatch`, `useAppSelector`) for type safety
- **Persistence**: Auth state persisted via AsyncStorage (not Redux Persist)

### **State Access Pattern**
```typescript
// In components
const dispatch = useAppDispatch();
const { user, isAuthenticated } = useAppSelector((state) => state.auth);
const { searchResults, isLoading } = useAppSelector((state) => state.contracts);
```

---

## 📁 Folder Structure

### **Overall Project Structure**
```
Mechanic_V2/
├── backend/                    # Node.js/Express Backend
│   ├── config/                 # Configuration files
│   │   └── database.js         # Local DB config
│   ├── database/               # Database connections
│   │   ├── init.js             # Local MySQL setup
│   │   └── main-db.js         # Remote DB via SSH
│   ├── models/                 # Data models
│   │   └── User.js            # User model
│   ├── routes/                 # API route handlers
│   │   ├── auth.js            # Authentication routes
│   │   ├── contracts.js       # Contract search routes
│   │   └── health.js          # Health check
│   ├── middleware/             # Express middleware
│   │   └── upload.js          # File upload handling
│   ├── scripts/                # Utility scripts
│   └── server.js              # Express server entry
│
└── mechanic_v2/                # React Native/Expo Frontend
    ├── app/                    # Expo Router (file-based routing)
    │   ├── _layout.tsx         # Root layout (Redux Provider)
    │   ├── index.tsx          # Auth check & routing
    │   ├── (auth)/             # Unauthenticated routes
    │   │   ├── _layout.tsx     # Auth stack layout
    │   │   └── login.tsx       # Login screen
    │   └── (tabs)/             # Authenticated routes
    │       ├── _layout.tsx     # Tab navigator
    │       ├── home.tsx        # Contract search
    │       ├── history.tsx     # History tab
    │       ├── setting.tsx     # Settings tab
    │       ├── maintenance-data.tsx  # Maintenance details
    │       └── services.tsx    # Services screen
    ├── store/                  # Redux store
    │   └── configureStore.ts   # Store configuration
    ├── features/               # Redux feature slices
    │   ├── auth/               # Auth feature
    │   │   └── authSlice.ts    # Auth state & logic
    │   └── contracts/          # Contracts feature
    │       └── contractsSlice.ts  # Contracts state & logic
    ├── services/               # API services
    │   └── api.ts             # HTTP client (ApiService)
    ├── common/                 # Shared utilities
    │   ├── components/         # Shared components
    │   │   └── StatusBanner.tsx
    │   └── hooks/             # Custom hooks
    │       ├── useAppDispatch.ts
    │       └── useAppSelector.ts
    ├── components/             # UI components
    │   ├── haptic-tab.tsx
    │   └── ui/                 # UI primitives
    ├── hooks/                  # React hooks
    ├── constants/              # Constants
    │   └── theme.ts
    └── assets/                 # Static assets
```

### **Folder Structure Patterns**

#### **Frontend (mechanic_v2/)**
1. **Feature-Based Organization**
   - `features/` - Redux slices organized by feature
   - Each feature is self-contained (state, actions, thunks)

2. **Route-Based Organization**
   - `app/` - Expo Router file-based routing
   - Route groups: `(auth)` and `(tabs)`
   - Screens are files in `app/` directory

3. **Service Layer**
   - `services/` - API communication layer
   - Singleton pattern (`apiService`)

4. **Shared Resources**
   - `common/` - Shared components and hooks
   - `components/` - Reusable UI components
   - `constants/` - App-wide constants

#### **Backend (backend/)**
1. **MVC-Like Pattern**
   - `routes/` - Controllers (route handlers)
   - `models/` - Data models
   - `database/` - Data access layer

2. **Separation of Concerns**
   - `config/` - Configuration
   - `middleware/` - Express middleware
   - `scripts/` - Utility scripts

---

## 🔄 Code Flow & Workflow

### **1. Application Startup Flow**

```
1. App Launches
   ↓
2. app/_layout.tsx (RootLayout)
   - Wraps app with Redux Provider
   - Sets up ThemeProvider
   - Configures Stack Navigator
   ↓
3. app/index.tsx
   - Dispatches checkAuth() thunk
   - Shows loading spinner
   ↓
4. checkAuth() thunk (authSlice.ts)
   - Reads token from AsyncStorage
   - Calls apiService.verifyToken()
   ↓
5. Backend: GET /api/auth/verify
   - Validates JWT token
   - Returns user data
   ↓
6. Redux state updated
   - isAuthenticated = true/false
   ↓
7. Navigation decision
   - If authenticated → /(tabs)/home
   - If not → /(auth)/login
```

### **2. Login Flow**

```
1. User enters credentials
   ↓
2. login.tsx: handleLogin()
   - Validates input
   - Dispatches login() thunk
   ↓
3. login() thunk (authSlice.ts)
   - Calls apiService.login(credentials)
   ↓
4. apiService.login() (services/api.ts)
   - POST /api/auth/login
   - Sends username & password
   ↓
5. Backend: POST /api/auth/login (routes/auth.js)
   - Validates input (express-validator)
   - Finds user in local MySQL
   - Compares password (bcrypt)
   - Generates JWT token
   - Returns token & user data
   ↓
6. Frontend receives response
   - Stores token in AsyncStorage
   - Stores user in AsyncStorage
   - Updates Redux state
   ↓
7. Navigation
   - useEffect watches isAuthenticated
   - Navigates to /(tabs)/home
```

### **3. Contract Search Flow**

```
1. User enters contract number
   ↓
2. home.tsx: handleSearch()
   - Validates input
   - Dispatches searchContract() thunk
   ↓
3. searchContract() thunk (contractsSlice.ts)
   - Calls apiService.searchContract(contractNo)
   ↓
4. apiService.searchContract() (services/api.ts)
   - GET /api/contracts/search?contractNo=XXX
   ↓
5. Backend: GET /api/contracts/search (routes/contracts.js)
   - Gets main database connection (SSH tunnel)
   - Queries tbl_Contract (LIKE pattern matching)
   - Queries tbl_Asset (JOIN with contract)
   - Queries tbl_AssetMaintenance (JOIN with asset)
   - Calculates maintenance status
   - Formats response
   ↓
6. Frontend receives response
   - Updates Redux state (searchResults)
   - Adds to search history
   ↓
7. Navigation
   - useEffect watches searchResults
   - Navigates to /(tabs)/maintenance-data
```

### **4. Database Connection Flow**

#### **Local Database (Auth)**
```
1. Server starts (server.js)
   ↓
2. initDatabase() (database/init.js)
   - Creates MySQL connection pool
   - Connects to localhost:3307
   - Database: mechanic_v2
   ↓
3. Connection ready
   - Used by User model
   - Used by auth routes
```

#### **Main Database (Contracts)**
```
1. Server starts (server.js)
   ↓
2. initMainDatabase() (database/main-db.js)
   - Creates SSH client
   - Connects to remote server (123.253.22.20)
   - Establishes SSH tunnel
   - Creates local port forward
   - Creates MySQL connection pool through tunnel
   ↓
3. Connection ready
   - Used by contracts routes
   - Queries remote database (r2o_db)
```

### **5. State Update Flow (Redux)**

```
Component Action
   ↓
dispatch(action/thunk)
   ↓
Redux Middleware
   ↓
Reducer (for sync actions)
   OR
Async Thunk (for async actions)
   ↓
API Call (if async)
   ↓
State Update
   ↓
Component Re-render (via useSelector)
```

---

## 🏗️ Architecture Patterns

### **1. Frontend Architecture**

#### **Pattern: Redux Toolkit + Expo Router**
- **State Management**: Redux Toolkit (centralized, predictable)
- **Routing**: Expo Router (file-based, declarative)
- **Service Layer**: Singleton API service
- **Type Safety**: TypeScript throughout

#### **Data Flow Pattern**
```
Component → Dispatch → Thunk → API Service → Backend → Database
                ↓
         Redux State Update
                ↓
         Component Re-render
```

### **2. Backend Architecture**

#### **Pattern: Express MVC-Like**
- **Routes**: Handle HTTP requests
- **Models**: Data access & business logic
- **Database**: Connection pooling (local + SSH tunnel)
- **Middleware**: CORS, JSON parsing, error handling

#### **Request Flow**
```
HTTP Request → Express Middleware → Route Handler → Model → Database
                                                          ↓
                                                    Response
```

### **3. Authentication Pattern**

#### **JWT-Based Auth**
- Token stored in AsyncStorage (persistent)
- Token sent in Authorization header
- Backend verifies token on protected routes
- Token expiration: 7 days (configurable)

#### **Auth State Management**
- Redux manages auth state (reactive)
- AsyncStorage persists token (survives app restart)
- `checkAuth()` runs on app start

### **4. Database Pattern**

#### **Dual Database System**
1. **Local MySQL** (port 3307)
   - Purpose: User authentication
   - Direct connection
   - Database: `mechanic_v2`

2. **Remote MySQL** (via SSH)
   - Purpose: Contract data
   - SSH tunnel connection
   - Database: `r2o_db`

---

## 📊 Data Flow Diagrams

### **Complete System Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Screens    │  │   Redux      │  │   Services   │     │
│  │  (Components)│◄─┤   Store      │◄─┤   (API)      │     │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘     │
│         │                                    │              │
└─────────┼────────────────────────────────────┼──────────────┘
          │                                    │
          │ HTTP Requests                      │
          │                                    │
          ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Express Backend Server                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Routes     │  │   Models     │  │  Middleware │     │
│  │  (Handlers)  │─►│  (Business)  │─►│  (Auth/CORS)│     │
│  └──────┬───────┘  └──────────────┘  └──────────────┘     │
└─────────┼──────────────────────────────────────────────────┘
          │
          ├──────────────────┬──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Local MySQL   │  │  SSH Tunnel│  │  Remote     │
│  (Auth DB)     │  │             │  │  MySQL      │
│  Port: 3307    │  │  Port: 22   │  │  (Contracts)│
└──────────────┘  └──────────────┘  └──────────────┘
```

### **Redux State Flow**

```
┌─────────────────────────────────────────────────────────┐
│                    Redux Store                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │   Auth Slice     │      │ Contracts Slice  │       │
│  │                  │      │                  │       │
│  │ - user           │      │ - searchResults  │       │
│  │ - token          │      │ - isLoading      │       │
│  │ - isAuthenticated│      │ - error          │       │
│  │ - isLoading      │      │ - searchHistory  │       │
│  └──────────────────┘      └──────────────────┘       │
└─────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
         │ useSelector                  │ useSelector
         │                              │
┌────────┴────────┐          ┌──────────┴──────────┐
│  Login Screen   │          │   Home Screen      │
│                 │          │                     │
│  dispatch(login)│          │ dispatch(search)   │
└─────────────────┘          └─────────────────────┘
```

### **Authentication Flow**

```
┌──────────┐
│   User   │
└────┬─────┘
     │ Enters credentials
     ▼
┌─────────────────┐
│  Login Screen   │
│  (login.tsx)    │
└────┬────────────┘
     │ dispatch(login())
     ▼
┌─────────────────┐
│  login() thunk  │
│  (authSlice)    │
└────┬────────────┘
     │ apiService.login()
     ▼
┌─────────────────┐
│  POST /auth/    │
│  login          │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Backend Auth   │
│  (routes/auth)  │
└────┬────────────┘
     │ Query local MySQL
     ▼
┌─────────────────┐
│  Local MySQL    │
│  (users table)  │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  JWT Token      │
│  Generated      │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Store in       │
│  AsyncStorage   │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Update Redux   │
│  State          │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Navigate to    │
│  /(tabs)/home   │
└─────────────────┘
```

### **Contract Search Flow**

```
┌──────────┐
│   User   │
└────┬─────┘
     │ Enters contract number
     ▼
┌─────────────────┐
│  Home Screen    │
│  (home.tsx)     │
└────┬────────────┘
     │ dispatch(searchContract())
     ▼
┌─────────────────┐
│ searchContract()│
│  thunk          │
└────┬────────────┘
     │ apiService.searchContract()
     ▼
┌─────────────────┐
│ GET /contracts/ │
│ search          │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Contracts Route│
│  (routes/       │
│   contracts.js) │
└────┬────────────┘
     │ getMainDatabase()
     ▼
┌─────────────────┐
│  SSH Tunnel     │
│  Connection     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Remote MySQL   │
│  (r2o_db)       │
│  - tbl_Contract │
│  - tbl_Asset    │
│  - tbl_Asset    │
│    Maintenance  │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Calculate      │
│  Maintenance    │
│  Status         │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Format         │
│  Response       │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Update Redux   │
│  State          │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Navigate to    │
│  maintenance-   │
│  data screen    │
└─────────────────┘
```

---

## 🔑 Key Technologies

### **Frontend**
- **React Native**: 0.81.5
- **Expo**: ~54.0.30
- **Expo Router**: ~6.0.21 (file-based routing)
- **Redux Toolkit**: 2.11.2 (state management)
- **TypeScript**: 5.9.2
- **AsyncStorage**: 2.2.0 (persistence)

### **Backend**
- **Node.js**: (latest)
- **Express**: 4.18.2
- **MySQL2**: 3.6.5 (database driver)
- **SSH2**: 1.17.0 (SSH tunnel)
- **JWT**: 9.0.2 (authentication)
- **bcryptjs**: 2.4.3 (password hashing)

### **Databases**
- **MySQL** (Local - Auth)
- **MySQL** (Remote - Contracts via SSH)

---

## 📝 Summary

### **State Management**
✅ **Redux Toolkit** with feature-based slices
✅ **Async thunks** for API calls
✅ **Typed hooks** for type safety
✅ **AsyncStorage** for token persistence

### **Folder Structure**
✅ **Feature-based** Redux organization
✅ **File-based** routing (Expo Router)
✅ **Service layer** pattern
✅ **Separation of concerns** (frontend/backend)

### **Code Flow**
✅ **Unidirectional** data flow (Redux)
✅ **Async thunks** handle side effects
✅ **Service layer** abstracts API calls
✅ **Route handlers** process requests

### **Workflow**
1. **App Start** → Check auth → Navigate
2. **Login** → API call → Store token → Update state → Navigate
3. **Search** → API call → Update state → Navigate
4. **Database** → Dual system (local + remote via SSH)

---

## 🎯 Architecture Strengths

1. ✅ **Centralized State**: Redux provides single source of truth
2. ✅ **Type Safety**: TypeScript throughout
3. ✅ **Separation**: Clear frontend/backend separation
4. ✅ **Modular**: Feature-based organization
5. ✅ **Scalable**: Easy to add new features
6. ✅ **Secure**: SSH tunnel for remote database
7. ✅ **Persistent**: Auth survives app restarts

---

## 📚 Additional Notes

- **No Redux Persist**: Auth persistence handled manually via AsyncStorage
- **No Context API**: Redux is the primary state management solution
- **Service Singleton**: `apiService` is a singleton instance
- **SSH Tunnel**: Remote database accessed via SSH port forwarding
- **Dual Database**: Separate databases for auth and business data

