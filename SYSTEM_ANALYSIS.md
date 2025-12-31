# System Analysis - Mechanic V2

## 📊 Project Overview

**Mechanic V2** is a React Native mobile application with a Node.js/Express backend for contract management and maintenance tracking. The system connects to a remote database via SSH tunnel for contract data retrieval.

---

## 🏗️ Architecture Overview

### **Architecture Pattern**: Service-Oriented Architecture (SOA)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   React Native  │  HTTP   │  Express API    │  SSH    │  Remote MySQL   │
│   (Frontend)    │ ──────> │   (Backend)     │ ──────> │  (Main DB)      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                      │
                                      │ MySQL
                                      ▼
                              ┌─────────────────┐
                              │  Local MySQL    │
                              │  (Auth DB)      │
                              └─────────────────┘
```

---

## 📁 Project Structure

### **Frontend** (`mechanic_v2/`)
```
mechanic_v2/
├── app/                    # Expo Router (file-based routing)
│   ├── _layout.tsx         # Root Stack navigator
│   ├── index.tsx           # Auth check & routing
│   ├── (auth)/             # Unauthenticated routes
│   │   ├── _layout.tsx     # Auth Stack
│   │   └── login.tsx       # Login screen
│   └── (tabs)/             # Authenticated routes
│       ├── _layout.tsx     # Tabs navigator
│       ├── home.tsx        # Contract search
│       ├── history.tsx     # History (empty)
│       └── setting.tsx     # Settings (empty)
├── services/               # API & Auth services
│   ├── api.ts             # HTTP client
│   └── auth.ts             # Auth service (AsyncStorage)
├── components/             # Reusable UI components
└── hooks/                  # Custom React hooks
```

### **Backend** (`backend/`)
```
backend/
├── server.js              # Express server entry
├── config/                 # Configuration
│   └── database.js        # Local DB config
├── database/               # Database connections
│   ├── init.js            # Local MySQL init
│   └── main-db.js         # Remote DB via SSH
├── models/                 # Data models
│   └── User.js            # User model
├── routes/                 # API routes
│   ├── auth.js            # Authentication
│   ├── contracts.js       # Contract search
│   └── health.js          # Health check
├── middleware/             # Express middleware
│   └── auth.js            # JWT auth (unused)
└── scripts/                # Utility scripts
```

---

## 🔄 State Management

### **Current Approach**: No Global State Management

#### **1. Local Component State**
- **Technology**: React `useState` hook
- **Usage**: Each component manages its own state
- **Example**: `home.tsx` uses `useState` for search input and results

#### **2. Persistent Storage**
- **Technology**: AsyncStorage
- **Usage**: 
  - Auth token storage
  - User data storage
- **Service**: `authService` handles AsyncStorage operations

#### **3. Service Layer Pattern**
- **Technology**: Singleton service classes
- **Services**:
  - `apiService` - HTTP API client
  - `authService` - Authentication & token management

### **State Management Flow**

```
Component (useState)
    ↓
Service Layer (apiService/authService)
    ↓
AsyncStorage (persistent)
    ↓
Backend API
    ↓
Database
```

### **Limitations**
- ❌ No shared/reactive state across components
- ❌ No global state management
- ❌ Auth state requires manual checks (not reactive)
- ❌ No state synchronization between screens
- ❌ Each component independently fetches/manages data

---

## 🔐 Authentication System

### **Flow**
```
1. User enters credentials
   ↓
2. Frontend: authService.login()
   ↓
3. Backend: POST /api/auth/login
   ↓
4. Backend: Verify credentials in local MySQL
   ↓
5. Backend: Generate JWT token
   ↓
6. Frontend: Store token in AsyncStorage
   ↓
7. Frontend: Navigate to /(tabs)/home
```

### **Token Management**
- **Storage**: AsyncStorage (`@auth_token`, `@auth_user`)
- **Verification**: Backend endpoint `/api/auth/verify`
- **Persistence**: Token persists across app restarts
- **Validation**: Checked on app startup (`app/index.tsx`)

### **Security**
- ✅ JWT tokens
- ✅ Password hashing (bcrypt)
- ✅ Token verification endpoint
- ⚠️ No token refresh mechanism
- ⚠️ No automatic token expiration handling

---

## 🗄️ Database Architecture

### **Dual Database System**

#### **1. Local Database (MySQL)**
- **Purpose**: User authentication
- **Database**: `mechanic_v2`
- **Table**: `users`
- **Connection**: Direct MySQL (port 3307)
- **Location**: Localhost

#### **2. Main Database (Remote MySQL)**
- **Purpose**: Contract & asset data
- **Database**: `r2o_db`
- **Tables**: 
  - `tbl_Contract`
  - `tbl_Asset`
  - `tbl_AssetMaintenance`
- **Connection**: SSH tunnel
- **Location**: Remote server (123.253.22.20)

### **SSH Tunnel Configuration**
- **SSH Host**: 123.253.22.20
- **SSH User**: junior
- **SSH Auth**: Private key with passphrase
- **MySQL Host**: 127.0.0.1 (via tunnel)
- **MySQL Port**: 33061 (remote) → local port (dynamic)

---

## 🔌 API Structure

### **Endpoints**

#### **Authentication** (`/api/auth`)
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/auth/me` - Get current user (unused)

#### **Contracts** (`/api/contracts`)
- `GET /api/contracts/search?contractNo=XXX` - Search contract
  - Supports partial matching
  - Searches: `contractNo`, `strippedContractNo`, `accStrippedContractNo`

#### **Health** (`/api/health`)
- `GET /api/health` - Server health check

### **API Response Format**
```json
{
  "success": true/false,
  "message": "string",
  "data": {}
}
```

---

## 📱 Frontend Architecture

### **Routing System**
- **Framework**: Expo Router (file-based routing)
- **Pattern**: Route groups `(auth)` and `(tabs)`
- **Navigation**: Stack + Tabs navigators

### **Data Flow**
```
User Action
    ↓
Component Handler
    ↓
Service Call (apiService/authService)
    ↓
HTTP Request
    ↓
Backend API
    ↓
Database Query
    ↓
Response
    ↓
Component State Update
```

### **Component Structure**
- **Screens**: Full-page components (`home.tsx`, `login.tsx`)
- **Components**: Reusable UI elements
- **Services**: Business logic layer
- **Hooks**: Custom React hooks

---

## 🔧 Backend Architecture

### **Server Structure**
- **Framework**: Express.js
- **Pattern**: MVC-like (Routes → Models → Database)
- **Middleware**: CORS, JSON parser, error handling

### **Database Connection Management**
- **Local DB**: Connection pool (auto-initialized)
- **Main DB**: SSH tunnel + connection pool (lazy initialization)
- **Error Handling**: Non-blocking initialization (server starts even if DB fails)

### **Route Organization**
- **Modular**: Separate route files
- **Validation**: express-validator (in auth routes)
- **Error Handling**: Try-catch with proper status codes

---

## 📊 Data Flow Diagram

```
┌──────────────┐
│   User       │
└──────┬───────┘
       │
       ▼
┌──────────────┐     useState     ┌──────────────┐
│  Component   │ ◄────────────── │ Local State  │
└──────┬───────┘                  └──────────────┘
       │
       │ Service Call
       ▼
┌──────────────┐
│  apiService  │
└──────┬───────┘
       │ HTTP Request
       ▼
┌──────────────┐
│  Express API │
└──────┬───────┘
       │
       ├──► Local MySQL (Auth)
       │
       └──► SSH Tunnel ──► Remote MySQL (Contracts)
```

---

## ✅ Strengths

1. **Clean Separation**: Frontend/Backend separation
2. **Service Layer**: Good abstraction with service classes
3. **Type Safety**: TypeScript in frontend
4. **Modular Routes**: Well-organized backend routes
5. **Error Handling**: Comprehensive error handling
6. **SSH Security**: Secure remote database access
7. **File-based Routing**: Expo Router simplifies navigation
8. **Persistent Auth**: Token persistence across restarts

---

## ⚠️ Weaknesses & Limitations

1. **No Global State Management**
   - Each component manages own state
   - No shared state between screens
   - Auth state not reactive

2. **No State Management Library**
   - No Redux, Zustand, or Context API
   - Difficult to share data across components
   - No centralized state management

3. **Limited Caching**
   - No API response caching
   - Every search hits the database
   - No offline support

4. **No Real-time Updates**
   - No WebSocket/SSE
   - No push notifications
   - Manual refresh required

5. **Authentication Limitations**
   - No token refresh mechanism
   - No automatic logout on token expiry
   - No session management

6. **Error Handling**
   - Basic error handling
   - No error boundary in React
   - Limited error recovery

7. **No Data Validation**
   - Frontend validation only
   - No comprehensive input validation
   - No schema validation

---

## 🎯 Recommendations

### **Short-term Improvements**

1. **Add State Management**
   - Implement Context API for auth state
   - Or add Zustand for global state
   - Make auth state reactive

2. **Improve Error Handling**
   - Add React Error Boundaries
   - Better error messages
   - Retry mechanisms

3. **Add Caching**
   - Cache search results
   - Cache user data
   - Implement offline support

### **Long-term Improvements**

1. **State Management Library**
   - Consider Zustand or Redux Toolkit
   - Centralized state management
   - Better data flow

2. **API Improvements**
   - Add pagination
   - Add filtering/sorting
   - Add batch operations

3. **Performance**
   - Add request debouncing
   - Implement virtual lists
   - Optimize images

4. **Security**
   - Add token refresh
   - Implement session management
   - Add rate limiting

---

## 📈 System Metrics

### **Technology Stack**

**Frontend:**
- React Native 0.81.5
- Expo SDK 54
- TypeScript 5.9.2
- Expo Router 6.0.21

**Backend:**
- Node.js
- Express 4.18.2
- MySQL2 3.6.5
- SSH2 1.17.0
- JWT 9.0.2

**Databases:**
- MySQL (Local - Auth)
- MySQL (Remote - Contracts)

---

## 🔄 Current Data Flow Example

### **Contract Search Flow**

```
1. User enters contract number
   ↓
2. home.tsx: handleSearch() called
   ↓
3. apiService.searchContract(contractNo)
   ↓
4. HTTP GET /api/contracts/search?contractNo=632044
   ↓
5. Backend: contracts.js route handler
   ↓
6. getMainDatabase() - Get SSH tunnel connection
   ↓
7. SQL Query with LIKE pattern matching
   ↓
8. Remote MySQL: Query tbl_Contract, tbl_Asset, tbl_AssetMaintenance
   ↓
9. Backend: Format response
   ↓
10. Frontend: setContractData(result.data)
   ↓
11. Component re-renders with results
```

---

## 📝 Summary

**Current System**: Service-oriented architecture with local state management, service layer pattern, and dual database system (local + remote via SSH).

**State Management**: Component-level state with AsyncStorage for persistence. No global state management.

**Architecture**: Clean separation of concerns, modular structure, but lacks centralized state management.

**Recommendation**: Add state management (Context API or Zustand) for better data sharing and reactive updates across the application.

