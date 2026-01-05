# Redux State Management Setup

## 📁 Folder Structure

Following the example structure, Redux is organized as:

```
mechanic_v2/
├── store/                    # Redux store configuration
│   └── configureStore.ts     # Store setup with reducers
│
├── features/                 # Redux feature modules (slices)
│   ├── auth/                 # Authentication feature
│   │   └── authSlice.ts      # Auth state + reducers + thunks
│   └── contracts/            # Contracts feature
│       └── contractsSlice.ts # Contracts state + reducers + thunks
│
├── common/                   # Shared utilities
│   └── hooks/                # Custom hooks
│       ├── useAppDispatch.ts # Typed dispatch hook
│       └── useAppSelector.ts # Typed selector hook
│
└── app/                      # Expo Router screens (unchanged)
```

## 🔄 Redux Store Structure

### **Store Configuration** (`store/configureStore.ts`)
- Combines all reducers
- Configures middleware
- Exports typed `RootState` and `AppDispatch`

### **Auth Slice** (`features/auth/authSlice.ts`)
- **State**: `user`, `token`, `isAuthenticated`, `isLoading`, `error`
- **Actions**: `clearError`
- **Thunks**:
  - `login` - User login
  - `checkAuth` - Check authentication on app start
  - `logout` - User logout

### **Contracts Slice** (`features/contracts/contractsSlice.ts`)
- **State**: `searchResults`, `isLoading`, `error`, `searchHistory`
- **Actions**: `clearSearchResults`, `clearError`, `addToHistory`, `clearHistory`
- **Thunks**:
  - `searchContract` - Search contract by number

## 🎯 Usage in Components

### **Example: Using Auth State**

```typescript
import { useAppDispatch, useAppSelector } from '@/common/hooks/useAppSelector';
import { login, logout } from '@/features/auth/authSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  const handleLogin = () => {
    dispatch(login({ username: 'user', password: 'pass' }));
  };

  return (
    // Component JSX
  );
}
```

### **Example: Using Contracts State**

```typescript
import { useAppDispatch, useAppSelector } from '@/common/hooks/useAppSelector';
import { searchContract } from '@/features/contracts/contractsSlice';

function SearchComponent() {
  const dispatch = useAppDispatch();
  const { searchResults, isLoading, error } = useAppSelector((state) => state.contracts);

  const handleSearch = (contractNo: string) => {
    dispatch(searchContract(contractNo));
  };

  return (
    // Component JSX
  );
}
```

## ✅ Benefits

1. **Centralized State**: All state in one place
2. **Reactive Updates**: Components automatically update when state changes
3. **Type Safety**: Full TypeScript support
4. **DevTools**: Redux DevTools support
5. **Predictable**: Clear data flow
6. **Scalable**: Easy to add new features

## 🔧 Integration Points

- **Root Layout**: Redux Provider wraps entire app
- **Auth Flow**: Login/logout managed by Redux
- **Contract Search**: Search state managed by Redux
- **Navigation**: Auth state drives navigation

## 📝 Next Steps

- Add more features (history, settings, etc.)
- Add persistence (redux-persist) if needed
- Add middleware for logging/analytics
- Add selectors for computed state

