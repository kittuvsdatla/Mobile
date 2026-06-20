import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '@/services/apiService';
import { STORAGE_KEYS } from '@/config';
import type { AuthResponse, EmployeePermissions } from '@/types';

interface UserState {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: 'superadmin' | 'client' | 'employee';
  entityId: string | null;
  entityName: string | null;
  entityStatus: string | null;
  entityType: string | null;
  permissions: EmployeePermissions | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserState | null;
  isLoading: boolean;
  error: string | null;
  token: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  token: null,
};

function mapAuthResponse(data: AuthResponse): UserState {
  return {
    id:           data.userId,
    name:         data.name,
    phone:        data.phone,
    email:        data.email,
    role:         data.role,
    entityId:     data.entityId,
    entityName:   data.entityName,
    entityStatus: data.entityStatus,
    entityType:   data.entityType || 'Basic CRM',
    permissions:  data.permissions || null,
  };
}

// ---- Thunks ----

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (
    { phone, otp, firebaseIdToken }:
    { phone: string; otp: string; firebaseIdToken?: string },
    { rejectWithValue }
  ) => {
    const response = await apiService.verifyOtp(phone, otp, firebaseIdToken);
    if (response.success && response.data) {
      await apiService.setToken(response.data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.PIN_UNLOCKED, 'true');
      return response.data;
    }
    return rejectWithValue(response.error || 'OTP verification failed');
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    const response = await apiService.login(email, password);
    if (response.success && response.data) {
      await apiService.setToken(response.data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.PIN_UNLOCKED, 'true');
      return response.data;
    }
    return rejectWithValue(response.error || 'Login failed');
  }
);

export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async (
    data: Parameters<typeof apiService.signup>[0],
    { rejectWithValue }
  ) => {
    const response = await apiService.signup(data);
    if (response.success && response.data) {
      await apiService.setToken(response.data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.PIN_UNLOCKED, 'true');
      return response.data;
    }
    return rejectWithValue(response.error || 'Signup failed');
  }
);

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  await apiService.logout();
  return true;
});

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    await apiService.init();
    const token = apiService.getToken();
    if (!token) { return rejectWithValue('No token'); }
    const response = await apiService.getCurrentUser();
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue('Session expired');
  }
);

// ---- Slice ----

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: state => { state.error = null; },
    resetAuth:  ()    => initialState,
    initializeAuth: (state, action: PayloadAction<AuthResponse>) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user  = mapAuthResponse(action.payload);
    },
  },
  extraReducers: builder => {
    const handlePending = (state: AuthState) => {
      state.isLoading = true;
      state.error     = null;
    };
    const handleFulfilled = (state: AuthState, action: any) => {
      state.isLoading      = false;
      state.isAuthenticated = true;
      state.token          = action.payload.token || state.token;
      state.user           = mapAuthResponse(action.payload);
      state.error          = null;
    };
    const handleRejected = (state: AuthState, action: any) => {
      state.isLoading = false;
      state.error     = action.payload as string;
    };

    builder
      .addCase(verifyOtp.pending,   handlePending)
      .addCase(verifyOtp.fulfilled, handleFulfilled)
      .addCase(verifyOtp.rejected,  handleRejected)
      .addCase(loginUser.pending,   handlePending)
      .addCase(loginUser.fulfilled, handleFulfilled)
      .addCase(loginUser.rejected,  handleRejected)
      .addCase(signupUser.pending,  handlePending)
      .addCase(signupUser.fulfilled,handleFulfilled)
      .addCase(signupUser.rejected, handleRejected)
      .addCase(checkAuth.fulfilled, handleFulfilled)
      .addCase(checkAuth.rejected,  state => {
        state.isAuthenticated = false;
        state.user  = null;
        state.token = null;
      })
      .addCase(logoutUser.fulfilled, () => initialState);
  },
});

export const { clearError, resetAuth, initializeAuth } = authSlice.actions;
export default authSlice.reducer;
