import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isMenuOpen: boolean;
  currentSlide: number;
  showLoginModal: boolean;
  isLoading: boolean;
  drawerOpen: boolean;
}

const initialState: UIState = {
  isMenuOpen:     false,
  currentSlide:   0,
  showLoginModal: false,
  isLoading:      false,
  drawerOpen:     false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMenu:     state => { state.isMenuOpen = !state.isMenuOpen; },
    closeMenu:      state => { state.isMenuOpen = false; },
    setCurrentSlide:(state, action: PayloadAction<number>) => { state.currentSlide = action.payload; },
    showLoginModal: state => { state.showLoginModal = true; },
    hideLoginModal: state => { state.showLoginModal = false; },
    setLoading:     (state, action: PayloadAction<boolean>) => { state.isLoading = action.payload; },
    openDrawer:     state => { state.drawerOpen = true; },
    closeDrawer:    state => { state.drawerOpen = false; },
    toggleDrawer:   state => { state.drawerOpen = !state.drawerOpen; },
  },
});

export const {
  toggleMenu, closeMenu, setCurrentSlide,
  showLoginModal, hideLoginModal, setLoading,
  openDrawer, closeDrawer, toggleDrawer,
} = uiSlice.actions;

export default uiSlice.reducer;
