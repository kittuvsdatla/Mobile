import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';
import type { Purchase, CreatePurchaseRequest } from '@/types';

interface PurchasesState {
  items: Purchase[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PurchasesState = { items: [], isLoading: false, error: null };

export const fetchPurchases = createAsyncThunk(
  'purchases/fetchAll',
  async (params: { from?: string; to?: string } | undefined) => {
    const res = await apiService.getPurchases(params?.from, params?.to);
    return res.data || [];
  }
);

export const createPurchase = createAsyncThunk(
  'purchases/create',
  async (data: CreatePurchaseRequest, { rejectWithValue }) => {
    const res = await apiService.createPurchase(data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to create purchase');
  }
);

export const updatePurchase = createAsyncThunk(
  'purchases/update',
  async ({ id, data }: { id: string; data: CreatePurchaseRequest }, { rejectWithValue }) => {
    const res = await apiService.updatePurchase(id, data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to update purchase');
  }
);

export const deletePurchase = createAsyncThunk(
  'purchases/delete',
  async (id: string, { rejectWithValue }) => {
    const res = await apiService.deletePurchase(id);
    if (res.success) { return id; }
    return rejectWithValue(res.error || 'Failed to delete purchase');
  }
);

const purchasesSlice = createSlice({
  name: 'purchases',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchPurchases.pending,   state => { state.isLoading = true; })
      .addCase(fetchPurchases.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items     = action.payload;
      })
      .addCase(fetchPurchases.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message || null;
      })
      .addCase(createPurchase.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updatePurchase.fulfilled, (state, action) => {
        const idx = state.items.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) { state.items[idx] = action.payload; }
      })
      .addCase(deletePurchase.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload);
      });
  },
});

export default purchasesSlice.reducer;
