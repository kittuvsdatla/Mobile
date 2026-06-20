// ============================================================
// BusinessApp Mobile — Redux Store
// ============================================================

import { configureStore } from '@reduxjs/toolkit';
import authReducer       from './slices/authSlice';
import uiReducer         from './slices/uiSlice';
import partiesReducer    from './slices/partiesSlice';
import productsReducer   from './slices/productsSlice';
import stockReducer      from './slices/stockSlice';
import salesReducer      from './slices/salesSlice';
import purchasesReducer  from './slices/purchasesSlice';
import duesReducer       from './slices/duesSlice';
import transportersReducer from './slices/transportersSlice';
import employeesReducer  from './slices/employeesSlice';
import reportsReducer    from './slices/reportsSlice';

export const store = configureStore({
  reducer: {
    auth:         authReducer,
    ui:           uiReducer,
    parties:      partiesReducer,
    products:     productsReducer,
    stock:        stockReducer,
    sales:        salesReducer,
    purchases:    purchasesReducer,
    dues:         duesReducer,
    transporters: transportersReducer,
    employees:    employeesReducer,
    reports:      reportsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
