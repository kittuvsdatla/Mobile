import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';
import type { StockItem } from '@/types';

interface StockState {
  items: StockItem[];
  lowStockAlerts: StockItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: StockState = {
  items:          [],
  lowStockAlerts: [],
  isLoading:      false,
  error:          null,
};

export const fetchStock = createAsyncThunk('stock/fetchAll', async () => {
  const res = await apiService.getStock();
  return res.data || [];
});

export const fetchLowAlerts = createAsyncThunk('stock/fetchLowAlerts', async () => {
  const res = await apiService.getLowStockAlerts();
  return res.data || [];
});

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchStock.pending,   state => { state.isLoading = true; })
      .addCase(fetchStock.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items     = action.payload;
      })
      .addCase(fetchStock.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message || null;
      })
      .addCase(fetchLowAlerts.fulfilled, (state, action) => {
        state.lowStockAlerts = action.payload;
      });
  },
});

export default stockSlice.reducer;
