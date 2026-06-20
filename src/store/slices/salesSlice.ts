import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';
import type { Sale, CreateSaleRequest } from '@/types';

interface SalesState {
  items: Sale[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SalesState = { items: [], isLoading: false, error: null };

export const fetchSales = createAsyncThunk(
  'sales/fetchAll',
  async (params: { from?: string; to?: string } | undefined) => {
    const res = await apiService.getSales(params?.from, params?.to);
    return res.data || [];
  }
);

export const createSale = createAsyncThunk(
  'sales/create',
  async (data: CreateSaleRequest, { rejectWithValue }) => {
    const res = await apiService.createSale(data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to create sale');
  }
);

export const updateSale = createAsyncThunk(
  'sales/update',
  async ({ id, data }: { id: string; data: CreateSaleRequest }, { rejectWithValue }) => {
    const res = await apiService.updateSale(id, data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to update sale');
  }
);

export const deleteSale = createAsyncThunk(
  'sales/delete',
  async (id: string, { rejectWithValue }) => {
    const res = await apiService.deleteSale(id);
    if (res.success) { return id; }
    return rejectWithValue(res.error || 'Failed to delete sale');
  }
);

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchSales.pending,   state => { state.isLoading = true; })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items     = action.payload;
      })
      .addCase(fetchSales.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message || null;
      })
      .addCase(createSale.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateSale.fulfilled, (state, action) => {
        const idx = state.items.findIndex(s => s.id === action.payload.id);
        if (idx !== -1) { state.items[idx] = action.payload; }
      })
      .addCase(deleteSale.fulfilled, (state, action) => {
        state.items = state.items.filter(s => s.id !== action.payload);
      });
  },
});

export default salesSlice.reducer;
