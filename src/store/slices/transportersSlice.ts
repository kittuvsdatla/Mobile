import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';
import type { Transporter } from '@/types';

interface TransportersState {
  items: Transporter[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TransportersState = { items: [], isLoading: false, error: null };

export const fetchTransporters = createAsyncThunk('transporters/fetchAll', async () => {
  const res = await apiService.getTransporters();
  return res.data || [];
});

export const addTransporter = createAsyncThunk(
  'transporters/add',
  async (data: Partial<Transporter>, { rejectWithValue }) => {
    const res = await apiService.createTransporter(data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to add transporter');
  }
);

export const editTransporter = createAsyncThunk(
  'transporters/edit',
  async ({ id, data }: { id: string; data: Partial<Transporter> }, { rejectWithValue }) => {
    const res = await apiService.updateTransporter(id, data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to update transporter');
  }
);

export const removeTransporter = createAsyncThunk(
  'transporters/remove',
  async (id: string, { rejectWithValue }) => {
    const res = await apiService.deleteTransporter(id);
    if (res.success) { return id; }
    return rejectWithValue(res.error || 'Failed to delete transporter');
  }
);

const transportersSlice = createSlice({
  name: 'transporters',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchTransporters.pending,   state => { state.isLoading = true; })
      .addCase(fetchTransporters.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items     = action.payload;
      })
      .addCase(fetchTransporters.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message || null;
      })
      .addCase(addTransporter.fulfilled,    (state, action) => { state.items.unshift(action.payload); })
      .addCase(editTransporter.fulfilled,   (state, action) => {
        const idx = state.items.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) { state.items[idx] = action.payload; }
      })
      .addCase(removeTransporter.fulfilled, (state, action) => {
        state.items = state.items.filter(t => t.id !== action.payload);
      });
  },
});

export default transportersSlice.reducer;
