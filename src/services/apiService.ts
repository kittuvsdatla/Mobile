// ============================================================
// BusinessApp Mobile — API Service
// Mobile-adapted: uses AsyncStorage instead of localStorage,
// and React Native's Linking instead of window.URL for PDFs.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { apiConfig, STORAGE_KEYS } from '@/config';
import type {
  AuthResponse,
  Party,
  Product,
  StockItem,
  Sale,
  Purchase,
  Due,
  DuePayment,
  Transporter,
  TransporterLedgerItem,
  SettingsData,
  BusinessEntity,
  Notification,
  Employee,
  EmployeePermissions,
  Attendance,
  LedgerEntry,
  Plan,
  CreateSaleRequest,
  CreatePurchaseRequest,
  SignupRequest,
  ApiResponse,
} from '@/types';

// ============================================================
// Core HTTP Client
// ============================================================

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async loadToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      this.token = token;
    } catch {
      this.token = null;
    }
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  async clearToken(): Promise<void> {
    this.token = null;
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.PIN_UNLOCKED,
    ]);
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    // Ensure token is loaded on first use
    if (this.token === null) {
      await this.loadToken();
    }

    const url = `${this.baseURL}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Log the API Request
    console.log(`%c[API Request] ${method} ${url}`, 'color: #00bcd4; font-weight: bold;', {
      method,
      url,
      headers,
      body,
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        apiConfig.timeout
      );

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 401) {
        await this.clearToken();
        console.warn(`%c[API Response] 401 Unauthorized - ${method} ${url}`, 'color: #ff9800; font-weight: bold;');
        return { success: false, error: 'Session expired. Please login again.' };
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || data.error || `Request failed (${response.status})`;
        console.error(`%c[API Response Failed] ${response.status} - ${method} ${url}`, 'color: #f44336; font-weight: bold;', {
          status: response.status,
          ok: false,
          error: errorMsg,
          data,
        });
        return {
          success: false,
          error: errorMsg,
        };
      }

      console.log(`%c[API Response Success] ${response.status} - ${method} ${url}`, 'color: #4caf50; font-weight: bold;', {
        status: response.status,
        ok: true,
        data,
      });

      return { success: true, data };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`%c[API Request Timeout] ${method} ${url}`, 'color: #ff5722; font-weight: bold;');
        return { success: false, error: 'Request timed out. Check your connection.' };
      }
      console.error(`%c[API Request Error] ${method} ${url}`, 'color: #f44336; font-weight: bold;', {
        error: error.message || error,
      });
      return {
        success: false,
        error: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  get<T>(path: string) { return this.request<T>('GET', path); }
  post<T>(path: string, body?: unknown) { return this.request<T>('POST', path, body); }
  put<T>(path: string, body?: unknown) { return this.request<T>('PUT', path, body); }
  delete<T>(path: string) { return this.request<T>('DELETE', path); }
}

const client = new ApiClient(apiConfig.baseUrl);

// ============================================================
// PDF Opener (mobile-safe — opens in device browser)
// ============================================================
const openPdfInBrowser = async (url: string): Promise<void> => {
  try {
    console.log('[API SERVICE LOG] Attempting to open/download PDF URL:', url);
    await Linking.openURL(url);
    console.log('[API SERVICE LOG] pdf downloaded sucess');
  } catch (err: any) {
    console.error('[API SERVICE LOG] Error opening/downloading PDF URL in browser:', err);
  }
};

const buildPdfUrl = (path: string): string => {
  const token = client.getToken();
  const separator = path.includes('?') ? '&' : '?';
  return `${apiConfig.baseUrl}${path}${separator}token=${token}`;
};

// ============================================================
// API Service — Exported Object
// ============================================================

export const apiService = {
  // ---------- Init ----------
  /** Call once at app start to restore persisted token */
  init: () => client.loadToken(),

  // ---------- Token Management ----------
  setToken: (token: string) => client.setToken(token),
  clearToken: () => client.clearToken(),
  getToken: () => client.getToken(),

  // ---------- Auth ----------
  checkPhone: (phone: string) =>
    client.post<{ exists: boolean; status?: string; type?: string }>(
      '/api/auth/check-phone', { phone }
    ),

  verifyOtp: (phone: string, otp: string, firebaseIdToken?: string) =>
    client.post<AuthResponse>('/api/auth/verify-otp', { phone, otp, firebaseIdToken }),

  verifyPin: (pin: string) =>
    client.post<{ success: boolean; message: string }>('/api/auth/verify-pin', { pin }),

  setPin: (pin: string) =>
    client.post<{ success: boolean; message: string }>('/api/auth/set-pin', { pin }),

  changePin: (currentPin: string, newPin: string) =>
    client.post<{ success: boolean; message: string }>('/api/auth/change-pin', { currentPin, newPin }),

  resetPin: (firebaseIdToken: string, newPin: string) =>
    client.post<{ success: boolean; message: string }>('/api/auth/reset-pin', { firebaseIdToken, newPin }),

  signup: (data: SignupRequest) =>
    client.post<AuthResponse>('/api/auth/signup', data),

  login: (email: string, password: string) =>
    client.post<AuthResponse>('/api/auth/login', { email, password }),

  getCurrentUser: () =>
    client.get<AuthResponse>('/api/auth/me'),

  getPlans: () =>
    client.get<Plan[]>('/api/auth/plans'),

  logout: async () => {
    await client.clearToken();
    return { success: true };
  },

  // ---------- Parties ----------
  getParties: (type?: string) =>
    client.get<Party[]>(type ? `/api/parties?type=${type}` : '/api/parties'),

  getCustomers: () =>
    client.get<Party[]>('/api/parties?type=customer'),

  getSuppliers: () =>
    client.get<Party[]>('/api/parties?type=supplier'),

  createParty: (data: {
    name: string; phone?: string; address?: string;
    state?: string; gstNumber?: string; type: string;
  }) =>
    client.post<Party>('/api/parties', data),

  updateParty: (id: string, data: Partial<Party>) =>
    client.put<Party>(`/api/parties/${id}`, data),

  deleteParty: (id: string) =>
    client.delete(`/api/parties/${id}`),

  getPartyLedger: (id: string) =>
    client.get<any[]>(`/api/parties/${id}/ledger`),

  // ---------- Products ----------
  getProducts: (category?: string) =>
    client.get<Product[]>(
      category ? `/api/products?category=${category}` : '/api/products'
    ),

  createProduct: (data: Partial<Product>) =>
    client.post<Product>('/api/products', data),

  updateProduct: (id: string, data: Partial<Product>) =>
    client.put<Product>(`/api/products/${id}`, data),

  deleteProduct: (id: string) =>
    client.delete(`/api/products/${id}`),

  // ---------- Stock ----------
  getStock: () =>
    client.get<StockItem[]>('/api/stock'),

  getLowStockAlerts: () =>
    client.get<StockItem[]>('/api/stock/low-alert'),

  // ---------- Sales ----------
  getNextSaleInvoice: () =>
    client.get<{ invoiceNumber: string }>('/api/sales/next-invoice'),

  getSales: (from?: string, to?: string) => {
    let path = '/api/sales';
    if (from && to) { path += `?from=${from}&to=${to}`; }
    return client.get<Sale[]>(path);
  },

  getSaleDetail: (id: string) =>
    client.get<Sale>(`/api/sales/${id}`),

  createSale: (data: CreateSaleRequest) =>
    client.post<Sale>('/api/sales', data),

  updateSale: (id: string, data: CreateSaleRequest) =>
    client.put<Sale>(`/api/sales/${id}`, data),

  deleteSale: (id: string) =>
    client.delete(`/api/sales/${id}`),

  /** Opens sale PDF in device browser */
  openSalePdf: (id: string) =>
    openPdfInBrowser(buildPdfUrl(`/api/sales/${id}/pdf`)),

  openSalePdfByInvoice: (invoiceNo: string) =>
    openPdfInBrowser(buildPdfUrl(`/api/sales/invoice/${invoiceNo}/pdf`)),

  // ---------- Purchases ----------
  getNextPurchaseInvoice: () =>
    client.get<{ invoiceNumber: string }>('/api/purchases/next-invoice'),

  getPurchases: (from?: string, to?: string) => {
    let path = '/api/purchases';
    if (from && to) { path += `?from=${from}&to=${to}`; }
    return client.get<Purchase[]>(path);
  },

  getPurchaseDetail: (id: string) =>
    client.get<Purchase>(`/api/purchases/${id}`),

  createPurchase: (data: CreatePurchaseRequest) =>
    client.post<Purchase>('/api/purchases', data),

  updatePurchase: (id: string, data: CreatePurchaseRequest) =>
    client.put<Purchase>(`/api/purchases/${id}`, data),

  deletePurchase: (id: string) =>
    client.delete(`/api/purchases/${id}`),

  /** Opens purchase PDF in device browser */
  openPurchasePdf: (id: string) =>
    openPdfInBrowser(buildPdfUrl(`/api/purchases/${id}/pdf`)),

  openPurchasePdfByInvoice: (invoiceNo: string) =>
    openPdfInBrowser(buildPdfUrl(`/api/purchases/invoice/${invoiceNo}/pdf`)),

  // ---------- Dues ----------
  getDues: (status?: string, partyId?: string) => {
    let path = '/api/dues';
    const params: string[] = [];
    if (status) { params.push(`status=${status}`); }
    if (partyId) { params.push(`partyId=${partyId}`); }
    if (params.length > 0) { path += '?' + params.join('&'); }
    return client.get<Due[]>(path);
  },

  createManualDue: (data: any) =>
    client.post<Due>('/api/dues', data),

  recordDuePayment: (id: string, amount: number, paymentMode: string, notes?: string) =>
    client.post<any>(`/api/dues/${id}/payment`, { amount, paymentMode, notes }),

  recordPartyPayment: (data: {
    partyId: string; amount: number;
    paymentMode: string; notes?: string; date?: string;
  }) =>
    client.post<any>('/api/dues/party-payment', data),

  getDuePayments: (id: string) =>
    client.get<DuePayment[]>(`/api/dues/${id}/payments`),

  // ---------- Transporters ----------
  getTransporters: () =>
    client.get<Transporter[]>('/api/transporters'),

  createTransporter: (data: Partial<Transporter>) =>
    client.post<Transporter>('/api/transporters', data),

  updateTransporter: (id: string, data: Partial<Transporter>) =>
    client.put<Transporter>(`/api/transporters/${id}`, data),

  deleteTransporter: (id: string) =>
    client.delete<void>(`/api/transporters/${id}`),

  getTransporterLedger: (id: string) =>
    client.get<TransporterLedgerItem[]>(`/api/transporters/${id}/ledger`),

  // ---------- Settings ----------
  getSettings: () =>
    client.get<SettingsData>('/api/settings'),

  updateSettings: (data: Partial<SettingsData>) =>
    client.put('/api/settings', data),

  // ---------- Notifications ----------
  getNotifications: () =>
    client.get<Notification[]>('/api/notifications'),

  markNotificationRead: (id: string) =>
    client.put(`/api/notifications/${id}/read`),

  // ---------- Employees ----------
  getEmployees: () =>
    client.get<Employee[]>('/api/employees'),

  addEmployee: (data: {
    name: string; phone: string; email?: string;
    designation?: string; salary?: number; joinDate?: string;
  }) =>
    client.post<Employee>('/api/employees', data),

  updateEmployee: (id: string, data: Partial<Employee>) =>
    client.put<Employee>(`/api/employees/${id}`, data),

  deleteEmployee: (id: string) =>
    client.delete(`/api/employees/${id}`),

  updatePermissions: (id: string, data: Partial<EmployeePermissions>) =>
    client.put<EmployeePermissions>(`/api/employees/${id}/permissions`, data),

  markAttendance: (data: {
    employeeId: string; date?: string; status: string; notes?: string;
  }) =>
    client.post<Attendance>('/api/employees/attendance', data),

  getEmployeeLedger: (id: string) =>
    client.get<{ sales: Sale[]; purchases: Purchase[]; dues: any[] }>(
      `/api/employees/${id}/ledger`
    ),

  getAttendance: (params?: { date?: string; month?: string; employeeId?: string }) => {
    let path = '/api/employees/attendance';
    const query = new URLSearchParams();
    if (params?.date) { query.append('date', params.date); }
    if (params?.month) { query.append('month', params.month); }
    if (params?.employeeId) { query.append('employeeId', params.employeeId); }
    const qString = query.toString();
    if (qString) { path += `?${qString}`; }
    return client.get<Attendance[] | Attendance>(path);
  },

  // ---------- Reports ----------
  getDashboardStats: (from?: string, to?: string) => {
    let path = '/api/reports/dashboard';
    const query = new URLSearchParams();
    if (from) { query.append('from', from); }
    if (to) { query.append('to', to); }
    const qString = query.toString();
    if (qString) { path += `?${qString}`; }
    return client.get<any>(path);
  },

  getUnifiedLedger: async (
    from?: string, to?: string, partyId?: string, types?: string[]
  ): Promise<LedgerEntry[]> => {
    const params = new URLSearchParams();
    if (from) { params.append('from', from); }
    if (to) { params.append('to', to); }
    if (partyId) { params.append('partyId', partyId); }
    if (types && types.length > 0) {
      types.forEach(t => params.append('types', t));
    }
    const res = await client.get<LedgerEntry[]>(`/api/reports/ledger?${params.toString()}`);
    return res.data || [];
  },

  /** Opens ledger PDF in device browser */
  openLedgerPdf: (from?: string, to?: string, partyId?: string, types?: string[]) => {
    const params = new URLSearchParams();
    if (from) { params.append('from', from); }
    if (to) { params.append('to', to); }
    if (partyId) { params.append('partyId', partyId); }
    if (types && types.length > 0) {
      types.forEach(t => params.append('types', t));
    }
    return openPdfInBrowser(buildPdfUrl(`/api/reports/ledger/pdf?${params.toString()}`));
  },

  getSalesSummary: (from: string, to: string) =>
    client.get<any>(`/api/reports/sales-summary?from=${from}&to=${to}`),

  getPurchasesSummary: (from: string, to: string) =>
    client.get<any>(`/api/reports/purchases-summary?from=${from}&to=${to}`),

  getDuesSummary: () =>
    client.get<any>('/api/reports/dues-summary'),

  getStockReport: () =>
    client.get<any>('/api/reports/stock'),

  getEmployeePerformance: (from: string, to: string) =>
    client.get<any[]>(`/api/reports/employee-performance?from=${from}&to=${to}`),

  // ---------- Super Admin ----------
  admin: {
    getDashboard: () =>
      client.get<any>('/api/admin/dashboard'),

    getEntities: (status?: string) =>
      client.get<BusinessEntity[]>(
        status ? `/api/admin/entities?status=${status}` : '/api/admin/entities'
      ),

    getEntityDetail: (id: string) =>
      client.get<any>(`/api/admin/entities/${id}`),

    approveEntity: (id: string, data?: { entityType?: string }) =>
      client.post(`/api/admin/entities/${id}/approve`, data),

    suspendEntity: (id: string) =>
      client.post<{ message: string }>(`/api/admin/entities/${id}/suspend`),

    deleteEntity: (id: string) =>
      client.delete<{ message: string }>(`/api/admin/entities/${id}`),

    updateEntityType: (id: string, data: { entityType: string }) =>
      client.post<{ message: string }>(`/api/admin/entities/${id}/type`, data),

    updateEntityPlan: (entityId: string, data: {
      planId: string; startDate?: string; endDate?: string; notes?: string;
    }) =>
      client.post(`/api/admin/entities/${entityId}/plan`, data),

    getPlans: () =>
      client.get<Plan[]>('/api/admin/plans'),

    createOrUpdatePlan: (data: Partial<Plan>) =>
      client.post<Plan>('/api/admin/plans', data),

    deletePlan: (id: string) =>
      client.delete<{ message: string }>(`/api/admin/plans/${id}`),
  },
};

export default apiService;
