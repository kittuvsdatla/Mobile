import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';
import type { Due } from '@/types';

interface DuesState {
  items: Due[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DuesState = { items: [], isLoading: false, error: null };

export const fetchDues = createAsyncThunk(
  'dues/fetchAll',
  async (params: { status?: string; partyId?: string } | undefined) => {
    const res = await apiService.getDues(params?.status, params?.partyId);
    return res.data || [];
  }
);

export const recordPayment = createAsyncThunk(
  'dues/recordPayment',
  async (
    { id, amount, paymentMode, notes }:
    { id: string; amount: number; paymentMode: string; notes?: string },
    { rejectWithValue }
  ) => {
    const res = await apiService.recordDuePayment(id, amount, paymentMode, notes);
    if (res.success) { return id; }
    return rejectWithValue(res.error || 'Payment failed');
  }
);

const duesSlice = createSlice({
  name: 'dues',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchDues.pending,   state => { state.isLoading = true; })
      .addCase(fetchDues.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items     = action.payload;
      })
      .addCase(fetchDues.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message || null;
      });
  },
});

export default duesSlice.reducer;
