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
  selectedPeriodServices: ServiceDetail[];
  selectedPeriodDate: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

const initialState: HistoryState = {
  weeklySummary: null,
  paymentPeriods: [],
  selectedPeriodServices: [],
  selectedPeriodDate: null,
  isLoading: false,
  isRefreshing: false,
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
    clearSelectedPeriod: (state) => {
      state.selectedPeriodServices = [];
      state.selectedPeriodDate = null;
    },
    refreshData: (state) => {
      state.isRefreshing = true;
    },
  },
  extraReducers: (builder) => {
    // Fetch Weekly Summary
    builder
      .addCase(fetchWeeklySummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWeeklySummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.weeklySummary = action.payload;
        state.error = null;
      })
      .addCase(fetchWeeklySummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Payment Periods
    builder
      .addCase(fetchPaymentPeriods.pending, (state) => {
        if (!state.isRefreshing) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchPaymentPeriods.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.paymentPeriods = action.payload;
        state.error = null;
      })
      .addCase(fetchPaymentPeriods.rejected, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.error = action.payload as string;
      });

    // Fetch Period Services
    builder
      .addCase(fetchPeriodServices.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchPeriodServices.fulfilled, (state, action) => {
        state.selectedPeriodServices = action.payload.services;
        state.selectedPeriodDate = action.payload.weekStartDate;
        state.error = null;
      })
      .addCase(fetchPeriodServices.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedPeriod, refreshData } = historySlice.actions;
export default historySlice.reducer;

