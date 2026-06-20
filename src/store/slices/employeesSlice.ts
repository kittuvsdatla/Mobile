import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/services/apiService';
import type { Employee, EmployeePermissions } from '@/types';

interface EmployeesState {
  items: Employee[];
  isLoading: boolean;
  error: string | null;
}

const initialState: EmployeesState = { items: [], isLoading: false, error: null };

export const fetchEmployees = createAsyncThunk('employees/fetchAll', async () => {
  const res = await apiService.getEmployees();
  return res.data || [];
});

export const addEmployee = createAsyncThunk(
  'employees/add',
  async (
    data: { name: string; phone: string; email?: string; designation?: string; salary?: number; joinDate?: string },
    { rejectWithValue }
  ) => {
    const res = await apiService.addEmployee(data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to add employee');
  }
);

export const editEmployee = createAsyncThunk(
  'employees/edit',
  async ({ id, data }: { id: string; data: Partial<Employee> }, { rejectWithValue }) => {
    const res = await apiService.updateEmployee(id, data);
    if (res.success && res.data) { return res.data; }
    return rejectWithValue(res.error || 'Failed to update employee');
  }
);

export const removeEmployee = createAsyncThunk(
  'employees/remove',
  async (id: string, { rejectWithValue }) => {
    const res = await apiService.deleteEmployee(id);
    if (res.success) { return id; }
    return rejectWithValue(res.error || 'Failed to delete employee');
  }
);

export const updateEmployeePermissions = createAsyncThunk(
  'employees/updatePermissions',
  async ({ id, data }: { id: string; data: Partial<EmployeePermissions> }, { rejectWithValue }) => {
    const res = await apiService.updatePermissions(id, data);
    if (res.success) { return { id, permissions: data }; }
    return rejectWithValue(res.error || 'Failed to update permissions');
  }
);

const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchEmployees.pending,   state => { state.isLoading = true; })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items     = action.payload;
      })
      .addCase(fetchEmployees.rejected,  (state, action) => {
        state.isLoading = false;
        state.error     = action.error.message || null;
      })
      .addCase(addEmployee.fulfilled,    (state, action) => { state.items.unshift(action.payload); })
      .addCase(editEmployee.fulfilled,   (state, action) => {
        const idx = state.items.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) { state.items[idx] = action.payload; }
      })
      .addCase(removeEmployee.fulfilled, (state, action) => {
        state.items = state.items.filter(e => e.id !== action.payload);
      })
      .addCase(updateEmployeePermissions.fulfilled, (state, action) => {
        const idx = state.items.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) {
          state.items[idx] = {
            ...state.items[idx],
            permissions: { ...state.items[idx].permissions, ...action.payload.permissions } as EmployeePermissions,
          };
        }
      });
  },
});

export default employeesSlice.reducer;
