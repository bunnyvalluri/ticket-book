import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (accessToken) => {
        set({ accessToken });
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        else localStorage.removeItem('accessToken');
      },
      setAuth: (user, token) => {
        localStorage.setItem('accessToken', token);
        set({ user, accessToken: token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      setLoading: (isLoading) => set({ isLoading }),
      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
    }),
    {
      name: 'cinemax-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Booking Store
export const useBookingStore = create((set, get) => ({
  // Selected seats
  selectedSeats: [],
  currentShow: null,
  currentBooking: null,
  sessionId: null,
  coupon: null,
  couponDiscount: 0,

  setCurrentShow: (show) => set({ currentShow: show }),
  setCurrentBooking: (booking) => set({ currentBooking: booking }),
  setSessionId: (sessionId) => set({ sessionId }),
  setCoupon: (coupon, discount) => set({ coupon, couponDiscount: discount }),
  clearCoupon: () => set({ coupon: null, couponDiscount: 0 }),

  selectSeat: (seat) => {
    const { selectedSeats } = get();
    if (selectedSeats.find((s) => s.id === seat.id)) return;
    if (selectedSeats.length >= 10) return;
    set({ selectedSeats: [...selectedSeats, seat] });
  },

  deselectSeat: (seatId) => {
    set((state) => ({
      selectedSeats: state.selectedSeats.filter((s) => s.id !== seatId),
    }));
  },

  clearSeats: () => set({ selectedSeats: [] }),
  clearBooking: () => set({
    selectedSeats: [],
    currentBooking: null,
    sessionId: null,
    coupon: null,
    couponDiscount: 0,
  }),

  // Computed
  get totalAmount() {
    return get().selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);
  },
  get convenienceFee() {
    return get().selectedSeats.length * 20;
  },
  get gstAmount() {
    const { totalAmount, couponDiscount } = get();
    return ((totalAmount - couponDiscount) * 0.18);
  },
  get grandTotal() {
    const { totalAmount, couponDiscount, convenienceFee, gstAmount } = get();
    return totalAmount - couponDiscount + convenienceFee + gstAmount;
  },
}));

// UI Store
export const useUIStore = create((set) => ({
  selectedCity: 'Hyderabad',
  searchQuery: '',
  isSearchOpen: false,
  sidebarOpen: false,

  setCity: (city) => set({ selectedCity: city }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

// Notification Store
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notif) => {
    set((state) => {
      // Don't add duplicate notifications if they already exist
      if (state.notifications.some((n) => n.id === notif.id)) return state;
      return {
        notifications: [notif, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + (notif.isRead ? 0 : 1),
      };
    });
  },
  markRead: (id) => {
    set((state) => {
      const isUnread = state.notifications.find((n) => n.id === id && !n.isRead);
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: isUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
  },
  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
