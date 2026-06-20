import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';
import type { Party } from '@/types';

interface PartiesState {
  customers: Party[];
  suppliers: Party[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PartiesState = {
  customers: [],
  suppliers: [],
  isLoading: false,
  error:     null,
};

export const fetchCustomers = createAsyncThunk('parties/fetchCustomers', async () => {
  const res = await apiService.getCustomers();
  return res.data || [];
});

export const fetchSuppliers = createAsyncThunk('parties/fetchSuppliers', async () => {
  const res = await apiService.getSuppliers();
  return res.data || [];
});

export const addParty = createAsyncThunk(
  'parties/addParty',
  async (data: Parameters<typeof apiService.createParty>[0], { rejectWithValue }) => {
    const res = await apiService.createParty(data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to add party');
  }
);

export const editParty = createAsyncThunk(
  'parties/editParty',
  async ({ id, data }: { id: string; data: Partial<Party> }, { rejectWithValue }) => {
    const res = await apiService.updateParty(id, data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to update party');
  }
);

export const removeParty = createAsyncThunk(
  'parties/removeParty',
  async (id: string, { rejectWithValue }) => {
    const res = await apiService.deleteParty(id);
    if (res.success) { return id; }
    return rejectWithValue(res.error || 'Failed to delete party');
  }
);

const partiesSlice = createSlice({
  name: 'parties',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchCustomers.pending,   state => { state.isLoading = true; })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload;
      })
      .addCase(fetchCustomers.rejected,  (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || null;
      })
      .addCase(fetchSuppliers.pending,   state => { state.isLoading = true; })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.suppliers = action.payload;
      })
      .addCase(fetchSuppliers.rejected,  (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || null;
      })
      .addCase(addParty.fulfilled, (state, action) => {
        if (action.payload.type === 'CUSTOMER') {
          state.customers.unshift(action.payload);
        } else {
          state.suppliers.unshift(action.payload);
        }
      })
      .addCase(editParty.fulfilled, (state, action) => {
        const updated = action.payload;
        const cuIdx = state.customers.findIndex(p => p.id === updated.id);
        const suIdx = state.suppliers.findIndex(p => p.id === updated.id);
        if (cuIdx !== -1) { state.customers[cuIdx] = updated; }
        if (suIdx !== -1) { state.suppliers[suIdx] = updated; }
      })
      .addCase(removeParty.fulfilled, (state, action) => {
        state.customers = state.customers.filter(p => p.id !== action.payload);
        state.suppliers = state.suppliers.filter(p => p.id !== action.payload);
      });
  },
});

export default partiesSlice.reducer;
