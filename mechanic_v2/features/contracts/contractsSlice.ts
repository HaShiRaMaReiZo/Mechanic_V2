import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';

export interface ContractAsset {
  assetId: number;
  chassisNo: string | null;
  engineNo: string | null;
  plateNo: string | null;
  productName: string | null;
  productColor: string | null;
  maintenances: Maintenance[];
}

export interface Maintenance {
  maintId: number;
  maintenanceCode: string | null;
  maintDueDate: string | null;
  chainSprocketChanged: number | null;
  chainTightened: number | null;
  engineOilRefilled: number | null;
  otherMaintServices: string | null;
  dateImplemented: string | null;
  mileage: number | null;
  actualMaintCost: number | null;
}

export interface MaintenanceStatus {
  status: 'DUE' | 'NOT_YET_DUE' | 'OVER_DUE' | 'ALREADY_IMPLEMENTED';
  message: string;
  maintDueDate: string | null;
  daysFromDue: number;
  maintenanceCode: string | null;
  isCalculated?: boolean; // Indicates if the date was calculated (not from DB)
}

export interface ContractData {
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

interface ContractsState {
  searchResults: ContractData | null;
  isLoading: boolean;
  error: string | null;
  searchHistory: string[];
}

const initialState: ContractsState = {
  searchResults: null,
  isLoading: false,
  error: null,
  searchHistory: [],
};

// Async thunk for searching contracts
export const searchContract = createAsyncThunk(
  'contracts/search',
  async (contractNo: string, { rejectWithValue }) => {
    try {
      const result = await apiService.searchContract(contractNo.trim());
      
      if (result.success && result.data) {
        return result.data;
      }
      
      return rejectWithValue(result.message || 'Contract not found');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

const contractsSlice = createSlice({
  name: 'contracts',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchContract.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchContract.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload;
        state.error = null;
        // Add to history
        if (action.payload?.contract?.contractNo) {
          const contractNo = action.payload.contract.contractNo;
          if (!state.searchHistory.includes(contractNo)) {
            state.searchHistory.unshift(contractNo);
            if (state.searchHistory.length > 10) {
              state.searchHistory = state.searchHistory.slice(0, 10);
            }
          }
        }
      })
      .addCase(searchContract.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.searchResults = null;
      });
  },
});

export const { clearSearchResults, clearError } = contractsSlice.actions;
export default contractsSlice.reducer;

