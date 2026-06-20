import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';
import type { Product } from '@/types';

interface ProductsState {
  items: Product[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProductsState = { items: [], isLoading: false, error: null };

export const fetchProducts = createAsyncThunk('products/fetchAll', async () => {
  const res = await apiService.getProducts();
  return res.data || [];
});

export const addProduct = createAsyncThunk(
  'products/add',
  async (data: Partial<Product>, { rejectWithValue }) => {
    const res = await apiService.createProduct(data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to add product');
  }
);

export const editProduct = createAsyncThunk(
  'products/edit',
  async ({ id, data }: { id: string; data: Partial<Product> }, { rejectWithValue }) => {
    const res = await apiService.updateProduct(id, data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to update product');
  }
);

export const removeProduct = createAsyncThunk(
  'products/remove',
  async (id: string, { rejectWithValue }) => {
    const res = await apiService.deleteProduct(id);
    if (res.success) { return id; }
    return rejectWithValue(res.error || 'Failed to delete product');
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchProducts.pending,   state => { state.isLoading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items     = action.payload;
      })
      .addCase(fetchProducts.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message || null;
      })
      .addCase(addProduct.fulfilled,  (state, action) => { state.items.unshift(action.payload); })
      .addCase(editProduct.fulfilled, (state, action) => {
        const idx = state.items.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) { state.items[idx] = action.payload; }
      })
      .addCase(removeProduct.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload);
      });
  },
});

export default productsSlice.reducer;
