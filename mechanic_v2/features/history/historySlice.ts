import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalAmount: number;
  serviceCount: number;
  paymentStatus: 'pending' | 'paid';
  daysUntilPayment: number;
}

export interface PaymentPeriod {
  paymentId: number;
  weekStartDate: string;
  weekEndDate: string;
  monthName: string;
  dateRange: string;
  totalAmount: number;
  serviceCount: number;
  paymentStatus: 'pending' | 'paid';
  paidDate: string | null;
  isCurrent: boolean;
}

export interface ServiceDetail {
  maintId: number;
  serviceId: string;
  date: string;
  dateFormatted: string;
  serviceTypes: string;
  amount: number;
  contractNo: string;
  customerName: string;
  mechanicName: string;
  imagePath: string | null;
}

interface HistoryState {
  weeklySummary: WeeklySummary | null;
  paymentPeriods: PaymentPeriod[];
  periodServices: Record<string, ServiceDetail[]>; // Map of weekStartDate -> services array
  isLoading: boolean;
  isRefreshing: boolean;
  loadingWeeklySummary: boolean; // Track weekly summary loading separately
  loadingPaymentPeriods: boolean; // Track payment periods loading separately
  loadingPeriodDate: string | null; // Track which period is currently loading
  error: string | null;
}

const initialState: HistoryState = {
  weeklySummary: null,
  paymentPeriods: [],
  periodServices: {}, // Map to store services for multiple periods
  isLoading: false,
  isRefreshing: false,
  loadingWeeklySummary: false,
  loadingPaymentPeriods: false,
  loadingPeriodDate: null,
  error: null,
};

// Async thunks
export const fetchWeeklySummary = createAsyncThunk(
  'history/fetchWeeklySummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getWeeklySummary();
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return rejectWithValue(response.message || 'Failed to fetch weekly summary');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const fetchPaymentPeriods = createAsyncThunk(
  'history/fetchPaymentPeriods',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getPaymentPeriods();
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return rejectWithValue(response.message || 'Failed to fetch payment periods');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const fetchPeriodServices = createAsyncThunk(
  'history/fetchPeriodServices',
  async (weekStartDate: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getPeriodServices(weekStartDate);
      
      if (response.success && response.data) {
        return {
          weekStartDate,
          services: response.data,
        };
      }
      
      return rejectWithValue(response.message || 'Failed to fetch period services');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedPeriod: (state, action: PayloadAction<string>) => {
      // Remove services for a specific period
      if (action.payload) {
        delete state.periodServices[action.payload];
      }
    },
    refreshData: (state) => {
      state.isRefreshing = true;
    },
  },
  extraReducers: (builder) => {
    // Fetch Weekly Summary
    builder
      .addCase(fetchWeeklySummary.pending, (state) => {
        state.loadingWeeklySummary = true;
        state.isLoading = true; // Overall loading is true if any is loading
        state.error = null;
      })
      .addCase(fetchWeeklySummary.fulfilled, (state, action) => {
        state.loadingWeeklySummary = false;
        state.weeklySummary = action.payload;
        // Only set isLoading to false if both are done loading
        state.isLoading = state.loadingWeeklySummary || state.loadingPaymentPeriods;
        state.error = null;
      })
      .addCase(fetchWeeklySummary.rejected, (state, action) => {
        state.loadingWeeklySummary = false;
        // Only set isLoading to false if both are done loading
        state.isLoading = state.loadingWeeklySummary || state.loadingPaymentPeriods;
        state.error = action.payload as string;
      });

    // Fetch Payment Periods
    builder
      .addCase(fetchPaymentPeriods.pending, (state) => {
        state.loadingPaymentPeriods = true;
        if (!state.isRefreshing) {
          state.isLoading = true; // Overall loading is true if any is loading
        }
        state.error = null;
      })
      .addCase(fetchPaymentPeriods.fulfilled, (state, action) => {
        state.loadingPaymentPeriods = false;
        state.isRefreshing = false;
        state.paymentPeriods = action.payload;
        // Only set isLoading to false if both are done loading
        state.isLoading = state.loadingWeeklySummary || state.loadingPaymentPeriods;
        state.error = null;
      })
      .addCase(fetchPaymentPeriods.rejected, (state, action) => {
        state.loadingPaymentPeriods = false;
        state.isRefreshing = false;
        // Only set isLoading to false if both are done loading
        state.isLoading = state.loadingWeeklySummary || state.loadingPaymentPeriods;
        state.error = action.payload as string;
      });

    // Fetch Period Services
    builder
      .addCase(fetchPeriodServices.pending, (state, action) => {
        state.loadingPeriodDate = action.meta.arg; // Track which period is loading
        state.error = null;
      })
      .addCase(fetchPeriodServices.fulfilled, (state, action) => {
        // Store services for this period in the map
        state.periodServices[action.payload.weekStartDate] = action.payload.services;
        state.loadingPeriodDate = null; // Clear loading state
        state.error = null;
      })
      .addCase(fetchPeriodServices.rejected, (state, action) => {
        state.loadingPeriodDate = null; // Clear loading state on error
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedPeriod, refreshData } = historySlice.actions;
export default historySlice.reducer;

