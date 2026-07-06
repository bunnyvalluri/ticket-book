import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 / refresh token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/auth/refresh') {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const { accessToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================
// API METHODS
// ============================

// AUTH
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: () => api.post('/auth/resend-verification'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// MOVIES
export const movieAPI = {
  getAll: (params) => api.get('/movies', { params }),
  getNowShowing: (params) => api.get('/movies/now-showing', { params }),
  getComingSoon: (params) => api.get('/movies/coming-soon', { params }),
  getTrending: (params) => api.get('/movies/trending', { params }),
  getBySlug: (slug) => api.get(`/movies/${slug}`),
  getGenres: () => api.get('/movies/genres'),
  getLanguages: () => api.get('/movies/languages'),
  getShows: (movieId, params) => api.get(`/movies/${movieId}/shows`, { params }),
  toggleWishlist: (movieId) => api.post(`/movies/${movieId}/wishlist`),
  toggleFavorite: (movieId) => api.post(`/movies/${movieId}/favorite`),
  addReview: (movieId, data) => api.post(`/movies/${movieId}/reviews`, data),
  // Admin
  create: (data) => api.post('/movies', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  createJson: (data) => api.post('/movies', data),
  update: (id, data) => api.put(`/movies/${id}`, data),
  delete: (id) => api.delete(`/movies/${id}`),
  tmdbSearch: (query) => api.get('/movies/tmdb/search', { params: { query } }),
  tmdbDetails: (id) => api.get(`/movies/tmdb/details/${id}`),
};

// THEATRES
export const theatreAPI = {
  getAll: (params) => api.get('/theatres', { params }),
  getCities: () => api.get('/theatres/cities'),
  getById: (id) => api.get(`/theatres/${id}`),
  create: (data) => api.post('/theatres', data),
  update: (id, data) => api.put(`/theatres/${id}`, data),
  delete: (id) => api.delete(`/theatres/${id}`),
  createScreen: (data) => api.post('/theatres/screens', data),
};

// SHOWS
export const showAPI = {
  getAll: (params) => api.get('/shows', { params }),
  getById: (id) => api.get(`/shows/${id}`),
  create: (data) => api.post('/shows', data),
  update: (id, data) => api.put(`/shows/${id}`, data),
  delete: (id) => api.delete(`/shows/${id}`),
};

// BOOKINGS
export const bookingAPI = {
  create: (data) => api.post('/bookings', data),
  confirmPayment: (data) => api.post('/bookings/confirm-payment', data),
  validateCoupon: (data) => api.post('/bookings/validate-coupon', data),
  getMy: (params) => api.get('/bookings/my', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }),
  downloadTicket: (id) => api.get(`/bookings/${id}/ticket`, { responseType: 'blob' }),
};

// ADMIN
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getRevenueAnalytics: (params) => api.get('/admin/analytics/revenue', { params }),
  getTopMovies: (params) => api.get('/admin/analytics/top-movies', { params }),
  getUserGrowth: () => api.get('/admin/analytics/user-growth'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getBookings: (params) => api.get('/admin/bookings', { params }),
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// NOTIFICATIONS
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  clearAll: () => api.delete('/notifications/clear'),
};

export default api;
