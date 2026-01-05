import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '@/services/api';

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

export interface AuthUser {
  id: number;
  username: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.login(credentials);
      
      if (response.success && response.data) {
        // Store token and user data
        await AsyncStorage.setItem(TOKEN_KEY, response.data.token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        
        return {
          token: response.data.token,
          user: response.data.user,
        };
      }
      
      return rejectWithValue(response.message || 'Login failed');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        return { isAuthenticated: false };
      }

      const userJson = await AsyncStorage.getItem(USER_KEY);
      const user = userJson ? JSON.parse(userJson) : null;

      // Verify token with backend
      const response = await apiService.verifyToken(token);
      
      if (response.success) {
        return {
          token,
          user,
          isAuthenticated: true,
        };
      }

      // Token invalid, clear storage
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      
      return { isAuthenticated: false };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Auth check failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Check Auth
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.isAuthenticated) {
          state.token = action.payload.token || null;
          state.user = action.payload.user || null;
          state.isAuthenticated = true;
        } else {
          state.token = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

