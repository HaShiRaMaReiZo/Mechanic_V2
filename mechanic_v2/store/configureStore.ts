import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import contractsReducer from '../features/contracts/contractsSlice';
import historyReducer from '../features/history/historySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contracts: contractsReducer,
    history: historyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

