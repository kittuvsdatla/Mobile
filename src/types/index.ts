// ============================================================
// BusinessApp Mobile — Shared TypeScript Interfaces
// Mirrors the web app's apiService.ts type definitions
// ============================================================

export interface AuthResponse {
  token: string;
  userId: string;
  name: string;
  phone: string;
  email: string | null;
  role: 'superadmin' | 'client' | 'employee';
  entityId: string | null;
  entityName: string | null;
  entityStatus: string | null;
  entityType?: string;
  permissions?: EmployeePermissions;
}

export interface Plan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  features: string;
  isActive: boolean;
}

export interface Party {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  state: string | null;
  gstNumber: string | null;
  type: 'CUSTOMER' | 'SUPPLIER';
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string | null;
  productCode: string | null;
  hsnCode: string | null;
  gstPercentage: number;
  unitType: 'KG' | 'GRAM' | 'BAG' | 'PIECE' | 'LITRE' | 'BOX';
  minStockAlert: number;
  isActive: boolean;
}

export interface StockItem {
  id: string;
  product: Product;
  quantity: number;
}

export interface SaleItem {
  id: string;
  productName: string;
  hsnCode: string | null;
  gstPercentage: number;
  taxableAmount: number;
  gstAmount: number;
  finalRate: number;
  quantity: number;
  rate: number;
  total: number;
  unitType: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  party: Party;
  partyName: string;
  partyPhone: string | null;
  vehicleNumber: string | null;
  deliveryDate: string | null;
  deliveryLocation: string | null;
  items: SaleItem[];
  taxableSubtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  subtotal: number;
  transportCharges: number;
  transporterName: string | null;
  finalTotal: number;
  paymentType: string;
  paymentMode: string;
  amountPaid: number;
  dueAmount: number;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  productName: string;
  hsnCode: string | null;
  gstPercentage: number;
  taxableAmount: number;
  gstAmount: number;
  finalRate: number;
  quantity: number;
  rate: number;
  total: number;
  unitType: string;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  date: string;
  party: Party;
  partyName: string;
  partyPhone: string | null;
  vehicleNumber: string | null;
  deliveryDate: string | null;
  deliveryLocation: string | null;
  items: PurchaseItem[];
  taxableSubtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  subtotal: number;
  transportCharges: number;
  transporterName: string | null;
  finalTotal: number;
  paymentType: string;
  paymentMode: string;
  amountPaid: number;
  dueAmount: number;
  notes: string | null;
  createdAt: string;
}

export interface Due {
  id: string;
  dueNumber?: string;
  party?: Party;
  partyId?: string;
  partyName?: string;
  type?: string;           // 'SALE' | 'PURCHASE' | 'sale' | 'purchase' | 'manual'
  referenceType?: 'sale' | 'purchase' | 'manual' | 'opening_balance';
  invoiceNumber?: string;
  date?: string;
  amount?: number;         // Original total
  totalAmount?: number;
  paidAmount?: number;
  balance?: number;        // Outstanding balance
  balanceAmount?: number;
  status: 'pending' | 'partial' | 'cleared';
  paymentMode?: string;
  notes?: string | null;
  createdAt?: string;
}

export interface DuePayment {
  id: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  notes: string | null;
}

export interface Transporter {
  id: string;
  name: string;
  phone: string | null;
  vehicleNumber: string | null;
  address: string | null;
  isActive: boolean;
}

export interface TransporterLedgerItem {
  id: string;
  date: string;
  type: 'SALE' | 'PURCHASE';
  invoiceNumber: string;
  partyName: string;
  deliveryLocation: string | null;
  vehicleNumber: string | null;
  transportCharges: number;
  totalAmount: number;
  items: any[];
}

export interface SettingsData {
  companyName: string;
  address: string;
  phone: string;
  state: string;
  gstNumber: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  termsAndConditions: string;
}

export interface BusinessEntity {
  id: string;
  companyName: string;
  ownerName: string;
  address: string;
  gstNumber: string | null;
  panNumber: string | null;
  phone: string;
  email: string | null;
  status: 'pending' | 'active' | 'expired' | 'suspended';
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  designation: string | null;
  joinDate: string | null;
  salary: number | null;
  isActive: boolean;
  permissions?: EmployeePermissions;
}

export interface EmployeePermissions {
  canAddSale?: boolean;
  canCreateSale?: boolean;     // alias for canAddSale
  canViewSales?: boolean;
  canAddPurchase?: boolean;
  canCreatePurchase?: boolean; // alias for canAddPurchase
  canViewPurchases?: boolean;
  canViewStock?: boolean;
  canViewCustomers?: boolean;
  canManageParties?: boolean;
  canManageEmployees?: boolean;
  canReceiveDue?: boolean;
  canViewReports?: boolean;
  canViewOnlyOwnData?: boolean;
}

export interface Attendance {
  id: string;
  employee: { id: string; name: string };
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALFDAY' | 'LEAVE';
  notes: string | null;
}

export interface LedgerEntry {
  date: string;
  timestamp: string;
  type: string;
  voucherNo: string;
  vehicleNumber?: string;
  referenceId?: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: string;
}

// Request types
export interface CreateSaleRequest {
  invoiceNumber?: string;
  partyId: string;
  items: { productId: string; quantity: number; rate: number }[];
  paymentType: string;
  paymentMode: string;
  amountPaid?: number;
  transporterId?: string;
  transportCharges?: number;
  vehicleNumber?: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  date?: string;
  notes?: string;
}

export interface CreatePurchaseRequest {
  invoiceNumber?: string;
  partyId: string;
  items: { productId: string; quantity: number; rate: number }[];
  paymentType: string;
  paymentMode: string;
  amountPaid?: number;
  transporterId?: string;
  transportCharges?: number;
  vehicleNumber?: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  date?: string;
  notes?: string;
}

export interface SignupRequest {
  fullName: string;
  companyName: string;
  address: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  panNumber?: string;
  planId?: string;
  password?: string;
  firebaseIdToken?: string;
  pin: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Navigation types
export type RootStackParamList = {
  Landing: undefined;
  Auth: undefined;
  PinUnlock: undefined;
  Dashboard: undefined;
  Admin: undefined;
};

export type AuthStackParamList = {
  Login: { phone?: string } | undefined;
  Signup: { phone?: string } | undefined;
  Pending: undefined;
  Expired: undefined;
};

export type DashboardTabParamList = {
  Overview: undefined;
  Parties: undefined;
  Products: undefined;
  Stock: undefined;
  Sales: undefined;
  Purchases: undefined;
  Transporters: undefined;
  Dues: undefined;
  Reports: undefined;
  Employees: undefined;
  News: undefined;
  Settings: undefined;
  More: undefined;
  Ledger: {
    fromDate: string;
    toDate: string;
    partyId?: string;
    types?: string[];
  };
};

// Legacy alias
export type DashboardDrawerParamList = DashboardTabParamList;

