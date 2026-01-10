# Mechanic V2 - Project Structure & Architecture Analysis

## 📋 Table of Contents
1. [State Management](#state-management)
2. [Project Structure](#project-structure)
3. [Architecture Patterns](#architecture-patterns)
4. [Navigation Structure](#navigation-structure)
5. [API Service Layer](#api-service-layer)
6. [Component Organization](#component-organization)
7. [Data Flow](#data-flow)

---

## 🗂️ State Management

### **Technology Stack**
- **Primary**: **Redux Toolkit** (`@reduxjs/toolkit` v2.11.2)
- **React Integration**: `react-redux` (v9.2.0)
- **Persistence**: `@react-native-async-storage/async-storage` (v2.2.0) - for auth tokens
- **Pattern**: Feature-based slices with async thunks

### **Redux Store Configuration**

**File**: `store/configureStore.ts`

```typescript
{
  reducer: {
    auth: authReducer,           // Authentication state
    contracts: contractsReducer,  // Contract search state
    history: historyReducer      // Payment history state
  }
}
```

**Store Features**:
- TypeScript typed (`RootState`, `AppDispatch`)
- Custom middleware configuration
- Serializable check configured for persistence actions

### **Redux Slices (Feature-Based Architecture)**

#### **1. Auth Slice** (`features/auth/authSlice.ts`)

**State Shape**:
```typescript
{
  user: AuthUser | null,          // { id: number, username: string }
  token: string | null,           // JWT token
  isAuthenticated: boolean,       // Auth status flag
  isLoading: boolean,              // Loading state
  error: string | null            // Error messages
}
```

**Async Thunks**:
- `login(credentials)` - Authenticates user, stores token in AsyncStorage
- `checkAuth()` - Verifies token on app startup
- `logout()` - Clears token and user data

**Sync Actions**:
- `clearError()` - Clears error state

**Persistence**:
- Token stored in AsyncStorage (`@auth_token`)
- User data stored in AsyncStorage (`@auth_user`)

---

#### **2. Contracts Slice** (`features/contracts/contractsSlice.ts`)

**State Shape**:
```typescript
{
  searchResults: ContractData | null,  // Search results
  isLoading: boolean,                  // Loading state
  error: string | null,                // Error messages
  searchHistory: string[]             // Last 10 searched contracts
}
```

**Data Structure**:
```typescript
interface ContractData {
  contract: {
    contractId: number;
    contractNo: string;
    contractDate: string | null;
    customerId: number | null;
    customerFullName: string | null;
    phoneNo1: string | null;
  };
  assets: ContractAsset[];
  maintenanceStatus?: MaintenanceStatus;
}
```

**Async Thunks**:
- `searchContract(contractNo)` - Searches contract by number

**Sync Actions**:
- `clearSearchResults()` - Clears search results
- `clearError()` - Clears error state

**Features**:
- Automatic search history (last 10 searches)
- History stored in Redux state (in-memory)

---

#### **3. History Slice** (`features/history/historySlice.ts`)

**State Shape**:
```typescript
{
  weeklySummary: WeeklySummary | null,           // Current week summary
  paymentPeriods: PaymentPeriod[],               // All payment periods
  periodServices: Record<string, ServiceDetail[]>, // Map of weekStartDate -> services
  isLoading: boolean,                             // Overall loading state
  isRefreshing: boolean,                          // Pull-to-refresh state
  loadingWeeklySummary: boolean,                 // Weekly summary loading
  loadingPaymentPeriods: boolean,                // Payment periods loading
  loadingPeriodDate: string | null,              // Which period is loading services
  error: string | null                           // Error messages
}
```

**Async Thunks**:
- `fetchWeeklySummary()` - Gets current week summary
- `fetchPaymentPeriods()` - Gets all payment periods
- `fetchPeriodServices(weekStartDate)` - Gets services for a specific period

**Sync Actions**:
- `clearError()` - Clears error state
- `refreshData()` - Sets refreshing flag

**Features**:
- Multi-period service caching (services stored per period)
- Separate loading states for different data sources
- Optimized to prevent unnecessary API calls

---

## 📁 Project Structure

```
mechanic_v2/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx              # Root layout (Redux Provider, Navigation)
│   ├── index.tsx                # Entry point (auth check & redirect)
│   ├── (auth)/                  # Auth group
│   │   ├── _layout.tsx          # Auth layout
│   │   └── login.tsx           # Login screen
│   └── (tabs)/                  # Main app group (tabs)
│       ├── _layout.tsx          # Tab navigation layout
│       ├── home.tsx             # Home/Search screen
│       ├── history.tsx          # History screen
│       ├── setting.tsx          # Settings screen
│       ├── maintenance-data.tsx # Maintenance data screen
│       └── services.tsx         # Services submission screen
│
├── features/                    # Redux feature slices (domain logic)
│   ├── auth/
│   │   └── authSlice.ts        # Authentication state & logic
│   ├── contracts/
│   │   └── contractsSlice.ts   # Contract search state & logic
│   └── history/
│       └── historySlice.ts      # Payment history state & logic
│
├── store/                       # Redux store configuration
│   └── configureStore.ts       # Store setup, root reducer, types
│
├── services/                     # API service layer
│   └── api.ts                  # Centralized API client (singleton)
│
├── components/                  # Reusable UI components
│   ├── AppBackground.tsx       # Background gradient component
│   ├── CustomTabBar.tsx       # Custom bottom tab bar
│   ├── CustomTabButton.tsx    # Tab button component
│   ├── CustomToggleSwitch.tsx # Custom toggle switch
│   ├── CustomLoadingIndicator.tsx # Loading spinner
│   └── ui/                     # UI primitives
│       ├── icon-symbol.tsx     # Icon component
│       └── icon-symbol.ios.tsx # iOS-specific icon
│
├── common/                      # Shared utilities
│   ├── components/
│   │   └── StatusBanner.tsx    # Status banner component
│   └── hooks/                  # Custom typed hooks
│       ├── useAppDispatch.ts  # Typed dispatch hook
│       └── useAppSelector.ts   # Typed selector hook
│
├── hooks/                       # App-level hooks
│   ├── use-color-scheme.ts    # Color scheme detection
│   └── use-theme-color.ts     # Theme color hook
│
├── constants/                   # App constants
│   └── theme.ts                # Colors, fonts, theme config
│
├── assets/                      # Static assets
│   ├── background/
│   │   └── gradient_background.png
│   ├── images/                 # App icons, logos
│   └── icons/                  # Icon assets
│
└── package.json                 # Dependencies & scripts
```

---

## 🏗️ Architecture Patterns

### **1. State Management Pattern: Redux Toolkit (Feature-Based)**

**Pattern**: Feature-based slices with async thunks

**Benefits**:
- Centralized state management
- Predictable state updates
- DevTools support
- Type-safe with TypeScript
- Async logic handled via thunks

**Structure**:
```
Feature Slice = {
  State Interface,
  Initial State,
  Sync Reducers,
  Async Thunks,
  Extra Reducers (for thunk handling)
}
```

---

### **2. Navigation Pattern: Expo Router (File-Based)**

**Pattern**: File-based routing with grouped routes

**Structure**:
- `(auth)` - Authentication group (login)
- `(tabs)` - Main app group (tab navigation)
- Nested routes for modal/stack navigation

**Features**:
- Type-safe navigation
- Deep linking support
- Automatic route generation
- Layout nesting

---

### **3. API Service Pattern: Singleton Service Layer**

**File**: `services/api.ts`

**Pattern**: Centralized API client with:
- Dynamic IP discovery
- Token management
- Error handling
- Request/response interceptors

**Features**:
- Auto-discovery of backend IP
- IP caching in AsyncStorage
- JWT token injection
- Centralized error handling

---

### **4. Component Pattern: Composition & Reusability**

**Structure**:
- **Layout Components**: `AppBackground`, `CustomTabBar`
- **UI Components**: `CustomToggleSwitch`, `CustomLoadingIndicator`
- **Feature Components**: Screen-specific components in `app/` directory

**Patterns Used**:
- Component composition
- Props-based configuration
- Styled components with StyleSheet
- Custom hooks for logic reuse

---

## 🧭 Navigation Structure

### **Navigation Hierarchy**

```
RootLayout (_layout.tsx)
  └── Stack Navigator
      ├── (auth) Group
      │   └── Login Screen
      │
      └── (tabs) Group
          └── Tab Navigator
              ├── Home (Search) Tab
              ├── History Tab
              ├── Setting Tab
              ├── maintenance-data (hidden from tabs)
              └── services (hidden from tabs)
```

### **Route Groups**

**`(auth)` Group**:
- Purpose: Authentication flow
- Layout: Simple stack
- Routes: `login.tsx`

**`(tabs)` Group**:
- Purpose: Main application
- Layout: Bottom tab navigation with custom tab bar
- Routes:
  - `home.tsx` - Contract search
  - `history.tsx` - Payment history
  - `setting.tsx` - Settings
  - `maintenance-data.tsx` - Maintenance details (hidden from tabs)
  - `services.tsx` - Service submission (hidden from tabs)

### **Custom Tab Bar**

**Component**: `CustomTabBar.tsx`

**Features**:
- Custom SVG path for curved cutout
- Floating active tab indicator (circle)
- Dynamic positioning based on active tab
- Conditional visibility (hidden on certain screens)
- Haptic feedback on tab press

---

## 🔌 API Service Layer

### **Service Architecture**

**File**: `services/api.ts`

**Class**: `ApiService` (Singleton pattern)

### **Key Features**

1. **Dynamic IP Discovery**:
   - Tries cached IP first
   - Scans common network ranges
   - Caches working IP in AsyncStorage

2. **Authentication**:
   - Token stored in AsyncStorage
   - Auto-injection in Authorization header
   - Token refresh/verification

3. **API Methods**:
   - `login(credentials)` - User authentication
   - `verifyToken(token)` - Token validation
   - `searchContract(contractNo)` - Contract search
   - `submitMaintenanceService(maintId, data)` - Service submission
   - `getWeeklySummary()` - Current week summary
   - `getPaymentPeriods()` - All payment periods
   - `getPeriodServices(weekStartDate)` - Services for period

4. **Error Handling**:
   - Network error detection
   - Response validation
   - Error message extraction

---

## 🧩 Component Organization

### **Component Categories**

#### **1. Layout Components**
- `AppBackground.tsx` - Background gradient with curved shape
- `CustomTabBar.tsx` - Custom bottom navigation bar

#### **2. UI Components**
- `CustomToggleSwitch.tsx` - Custom switch component
- `CustomLoadingIndicator.tsx` - Loading spinner
- `CustomTabButton.tsx` - Tab button component
- `StatusBanner.tsx` - Status message banner

#### **3. Screen Components** (in `app/` directory)
- `home.tsx` - Contract search interface
- `history.tsx` - Payment history with expandable periods
- `setting.tsx` - Settings screen
- `maintenance-data.tsx` - Maintenance details view
- `services.tsx` - Service submission form

### **Component Patterns**

**Styling**: StyleSheet API (React Native)
**Icons**: Expo Symbols (`IconSymbol` component)
**Fonts**: Custom font loading (Bakbak One via expo-font)
**Theming**: Constants-based (`constants/theme.ts`)

---

## 🔄 Data Flow

### **1. Authentication Flow**

```
User Input (Login Screen)
  ↓
dispatch(login(credentials))
  ↓
authSlice.login thunk
  ↓
apiService.login()
  ↓
Backend API (/api/auth/login)
  ↓
Response (token + user)
  ↓
AsyncStorage.setItem (persist token)
  ↓
Redux State Update (authSlice)
  ↓
Component Re-render (navigate to home)
```

### **2. Contract Search Flow**

```
User Input (Home Screen)
  ↓
dispatch(searchContract(contractNo))
  ↓
contractsSlice.searchContract thunk
  ↓
apiService.searchContract()
  ↓
Backend API (/api/contracts/search)
  ↓
Response (contract data)
  ↓
Redux State Update (contractsSlice)
  ↓
Component Re-render (display results)
```

### **3. Service Submission Flow**

```
User Input (Services Screen)
  ↓
Form Validation
  ↓
dispatch(submitMaintenanceService(maintId, data))
  ↓
apiService.submitMaintenanceService()
  ↓
Backend API (POST /api/contracts/:maintId/submit-service)
  ↓
Response (success/error)
  ↓
Alert + Navigation
```

### **4. History Data Flow**

```
Screen Focus (History Screen)
  ↓
useFocusEffect hook
  ↓
dispatch(fetchWeeklySummary())
dispatch(fetchPaymentPeriods())
  ↓
Both thunks execute in parallel
  ↓
API calls to backend
  ↓
Redux State Update (historySlice)
  ↓
Component Re-render (display data)
```

### **5. Period Expansion Flow**

```
User Taps Chevron (History Screen)
  ↓
togglePeriod(weekStartDate)
  ↓
Check if services already cached
  ↓
If not cached: dispatch(fetchPeriodServices(weekStartDate))
  ↓
apiService.getPeriodServices()
  ↓
Backend API (/api/history/period/:weekStartDate/services)
  ↓
Response (services array)
  ↓
Redux State Update (periodServices map)
  ↓
Component Re-render (display services)
```

---

## 🎯 Key Architectural Decisions

### **1. Why Redux Toolkit?**
- **Centralized State**: Complex app state needs centralization
- **Async Logic**: Thunks handle API calls elegantly
- **DevTools**: Excellent debugging experience
- **TypeScript**: Full type safety
- **Scalability**: Easy to add new features

### **2. Why Expo Router?**
- **File-Based**: Intuitive route organization
- **Type Safety**: Type-safe navigation
- **Deep Linking**: Built-in support
- **Layout Nesting**: Flexible navigation structure

### **3. Why Feature-Based Slices?**
- **Separation of Concerns**: Each feature is self-contained
- **Maintainability**: Easy to find and modify code
- **Scalability**: Easy to add new features
- **Testing**: Isolated feature testing

### **4. Why Singleton API Service?**
- **Centralized Configuration**: One place for API setup
- **IP Discovery**: Handles dynamic network environments
- **Token Management**: Centralized auth handling
- **Error Handling**: Consistent error management

---

## 📊 State Management Summary

### **State Structure**

```typescript
RootState = {
  auth: {
    user: AuthUser | null,
    token: string | null,
    isAuthenticated: boolean,
    isLoading: boolean,
    error: string | null
  },
  contracts: {
    searchResults: ContractData | null,
    isLoading: boolean,
    error: string | null,
    searchHistory: string[]
  },
  history: {
    weeklySummary: WeeklySummary | null,
    paymentPeriods: PaymentPeriod[],
    periodServices: Record<string, ServiceDetail[]>,
    isLoading: boolean,
    isRefreshing: boolean,
    loadingWeeklySummary: boolean,
    loadingPaymentPeriods: boolean,
    loadingPeriodDate: string | null,
    error: string | null
  }
}
```

### **Typed Hooks**

- `useAppDispatch()` - Typed dispatch hook
- `useAppSelector()` - Typed selector hook

**Usage**:
```typescript
const dispatch = useAppDispatch();
const { user, isAuthenticated } = useAppSelector(state => state.auth);
```

---

## 🔐 Persistence Strategy

### **AsyncStorage Usage**

**Auth Data**:
- `@auth_token` - JWT token
- `@auth_user` - User object (JSON stringified)

**API Configuration**:
- `@api_server_ip` - Cached backend IP address

**Note**: Redux state is NOT persisted. Only auth tokens and API IP are persisted.

---

## 🎨 Styling Approach

### **StyleSheet API**
- All styles use React Native's `StyleSheet.create()`
- Styles defined at component level
- No global CSS or styled-components

### **Theme Constants**
- Colors defined in `constants/theme.ts`
- Platform-specific font configurations
- Reusable color palette

### **Custom Fonts**
- Bakbak One font loaded via `expo-font`
- Applied to specific text elements (service types)
- Font loading handled in root layout

---

## 🚀 Performance Optimizations

1. **Service Caching**: Period services cached in Redux state
2. **Conditional Fetching**: Only fetch if data not already loaded
3. **Parallel Loading**: Multiple API calls in parallel where possible
4. **Memoization**: React hooks for expensive computations
5. **Lazy Loading**: Fonts loaded on demand

---

## 📝 Summary

**State Management**: Redux Toolkit with feature-based slices
**Navigation**: Expo Router with file-based routing
**Architecture**: Layered architecture (Components → Services → API)
**Pattern**: Feature-based organization with centralized services
**Type Safety**: Full TypeScript coverage
**Persistence**: AsyncStorage for auth tokens only
**Styling**: StyleSheet API with theme constants

This architecture provides:
- ✅ Scalable structure
- ✅ Type safety
- ✅ Maintainable codebase
- ✅ Clear separation of concerns
- ✅ Easy testing
- ✅ Good developer experience

