import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';

interface ReportsState {
  dashboardStats: any | null;
  salesSummary:   any | null;
  purchaseSummary: any | null;
  duesSummary:    any | null;
  stockReport:    any | null;
  ledgerEntries:  any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ReportsState = {
  dashboardStats:  null,
  salesSummary:    null,
  purchaseSummary: null,
  duesSummary:     null,
  stockReport:     null,
  ledgerEntries:   [],
  isLoading:       false,
  error:           null,
};

export const fetchDashboardStats = createAsyncThunk(
  'reports/dashboardStats',
  async (params?: { from?: string; to?: string }) => {
    const res = await apiService.getDashboardStats(params?.from, params?.to);
    return res.data || null;
  }
);

export const fetchSalesSummary = createAsyncThunk(
  'reports/salesSummary',
  async ({ from, to }: { from: string; to: string }) => {
    const res = await apiService.getSalesSummary(from, to);
    return res.data || null;
  }
);

export const fetchPurchasesSummary = createAsyncThunk(
  'reports/purchasesSummary',
  async ({ from, to }: { from: string; to: string }) => {
    const res = await apiService.getPurchasesSummary(from, to);
    return res.data || null;
  }
);

export const fetchDuesSummary = createAsyncThunk('reports/duesSummary', async () => {
  const res = await apiService.getDuesSummary();
  return res.data || null;
});

export const fetchLedger = createAsyncThunk(
  'reports/ledger',
  async (params?: { from?: string; to?: string; partyId?: string; types?: string[] }) => {
    return apiService.getUnifiedLedger(params?.from, params?.to, params?.partyId, params?.types);
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReports: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(fetchDashboardStats.pending,    state => { state.isLoading = true; })
      .addCase(fetchDashboardStats.fulfilled,  (state, action) => {
        state.isLoading      = false;
        state.dashboardStats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected,   (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message || null;
      })
      .addCase(fetchSalesSummary.fulfilled,    (state, action) => { state.salesSummary    = action.payload; })
      .addCase(fetchPurchasesSummary.fulfilled,(state, action) => { state.purchaseSummary = action.payload; })
      .addCase(fetchDuesSummary.fulfilled,     (state, action) => { state.duesSummary     = action.payload; })
      .addCase(fetchLedger.fulfilled,          (state, action) => { state.ledgerEntries   = action.payload; });
  },
});

export const { clearReports } = reportsSlice.actions;
export default reportsSlice.reducer;
