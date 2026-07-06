import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore, useNotificationStore } from '../../store/index.js';
import { authAPI, notificationAPI } from '../../services/api.js';
import toast from 'react-hot-toast';
import {
  FiSearch, FiX, FiBell, FiUser, FiLogOut, FiBookmark,
  FiHeart, FiSettings, FiChevronDown, FiMenu, FiFilm,
  FiMapPin, FiShield
} from 'react-icons/fi';

const CITIES = ['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { selectedCity, setCity, searchQuery, setSearchQuery, isSearchOpen, setSearchOpen } = useUIStore();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotificationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityDropdown, setCityDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [notifDropdown, setNotifDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      markAllRead();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark notifications read');
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationAPI.clearAll();
      clearAll();
      toast.success('All notifications cleared');
    } catch (err) {
      toast.error('Failed to clear notifications');
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      markRead(id);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-2xl' : 'bg-transparent'
      }`}
    >
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="text-2xl"
            >🎬</motion.div>
            <span className="text-xl font-black gradient-text hidden sm:block">CineMax</span>
          </Link>

          {/* City Selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setCityDropdown(!cityDropdown)}
              className="flex items-center gap-1.5 text-sm font-medium transition-all"
              style={{ color: '#a0a0c0' }}
            >
              <FiMapPin className="text-purple-500" size={14} />
              <span style={{ color: '#f0f0f8' }}>{selectedCity}</span>
              <FiChevronDown size={14} className={`transition-transform ${cityDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {cityDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-8 left-0 glass rounded-xl p-2 min-w-[160px] shadow-2xl"
                  style={{ zIndex: 1000 }}
                >
                  {CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => { setCity(city); setCityDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        city === selectedCity
                          ? 'bg-purple-600/20 text-purple-400'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium transition-all" style={{ color: location.pathname === '/' ? '#7c3aed' : '#a0a0c0' }}>
              Movies
            </Link>
            <Link to="/theatres" className="text-sm font-medium transition-all" style={{ color: location.pathname === '/theatres' ? '#7c3aed' : '#a0a0c0' }}>
              Theatres
            </Link>
            {isAdmin && (
              <Link to="/admin/dashboard" className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                <FiShield className="inline mr-1" size={14} />
                Admin
              </Link>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <AnimatePresence>
              {isSearchOpen ? (
                <motion.form
                  initial={{ width: 40, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 40, opacity: 0 }}
                  onSubmit={handleSearch}
                  className="flex items-center"
                >
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies..."
                    className="w-full text-sm px-4 py-2 rounded-l-lg outline-none"
                    style={{ background: '#1e1e35', border: '1px solid #3d3d5c', color: '#f0f0f8' }}
                  />
                  <button
                    type="button"
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    className="px-3 py-2 rounded-r-lg"
                    style={{ background: '#1e1e35', border: '1px solid #3d3d5c', borderLeft: 'none', color: '#a0a0c0' }}
                  >
                    <FiX size={16} />
                  </button>
                </motion.form>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSearchOpen(true)}
                  className="btn-ghost p-2 rounded-xl"
                >
                  <FiSearch size={18} />
                </motion.button>
              )}
            </AnimatePresence>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setNotifDropdown(!notifDropdown); setUserDropdown(false); }}
                    className="btn-ghost p-2 rounded-xl relative"
                  >
                    <FiBell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold flex items-center justify-center rounded-full"
                        style={{ background: '#ec4899', color: 'white' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {notifDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 top-10 glass rounded-2xl overflow-hidden shadow-2xl w-[320px] md:w-[360px]"
                        style={{ zIndex: 1000 }}
                      >
                        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#2d2d4a' }}>
                          <div>
                            <h3 className="font-bold text-sm text-white">Notifications</h3>
                            <p className="text-[10px]" style={{ color: '#606080' }}>
                              You have {unreadCount} unread notifications
                            </p>
                          </div>
                          <div className="flex gap-2 text-xs">
                            {unreadCount > 0 && (
                              <button onClick={handleMarkAllRead} className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer">
                                Mark read
                              </button>
                            )}
                            {notifications.length > 0 && (
                              <button onClick={handleClearAll} className="text-red-400 hover:text-red-300 font-semibold cursor-pointer">
                                Clear all
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto scrollbar-thin divide-y" style={{ divideColor: '#2d2d4a' }}>
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-xs" style={{ color: '#606080' }}>
                              <FiBell className="mx-auto mb-2 text-lg opacity-40" />
                              No notifications yet
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  if (!notif.isRead) handleMarkOneRead(notif.id);
                                  if (notif.data?.bookingId) navigate(`/bookings/${notif.data.bookingId}/ticket`);
                                  setNotifDropdown(false);
                                }}
                                className={`p-4 text-left transition-all hover:bg-white/5 cursor-pointer flex gap-3 relative ${
                                  !notif.isRead ? 'bg-purple-950/15' : ''
                                }`}
                              >
                                {!notif.isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 absolute left-2 top-[22px] shrink-0 animate-pulse" />
                                )}
                                <div className="pl-1">
                                  <p className="font-bold text-xs text-white leading-tight flex items-center justify-between">
                                    {notif.title}
                                    <span className="text-[9px] font-normal" style={{ color: '#606080' }}>
                                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </p>
                                  <p className="text-[11px] mt-1 leading-normal" style={{ color: notif.isRead ? '#8080a0' : '#a0a0c0' }}>
                                    {notif.message}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* User Menu */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setUserDropdown(!userDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: userDropdown ? '#1e1e35' : 'transparent', border: '1px solid transparent' }}
                  >
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="avatar" />
                    ) : (
                      <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium hidden sm:block" style={{ color: '#f0f0f8' }}>
                      {user?.firstName}
                    </span>
                    <FiChevronDown size={14} style={{ color: '#a0a0c0' }} className={`transition-transform ${userDropdown ? 'rotate-180' : ''}`} />
                  </motion.button>

                  <AnimatePresence>
                    {userDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 top-10 glass rounded-xl overflow-hidden shadow-2xl min-w-[200px]"
                        style={{ zIndex: 1000 }}
                      >
                        <div className="p-3 border-b" style={{ borderColor: '#2d2d4a' }}>
                          <p className="font-semibold text-sm" style={{ color: '#f0f0f8' }}>{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs" style={{ color: '#606080' }}>{user?.email}</p>
                        </div>

                        {[
                          { icon: FiUser, label: 'Profile', to: '/profile' },
                          { icon: FiFilm, label: 'My Bookings', to: '/bookings' },
                          { icon: FiHeart, label: 'Favorites', to: '/profile?tab=favorites' },
                          { icon: FiSettings, label: 'Settings', to: '/profile?tab=settings' },
                          ...(isAdmin ? [{ icon: FiShield, label: 'Admin Panel', to: '/admin/dashboard', special: true }] : []),
                        ].map(({ icon: Icon, label, to, special }) => (
                          <Link
                            key={label}
                            to={to}
                            onClick={() => setUserDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-white/5"
                            style={{ color: special ? '#f59e0b' : '#a0a0c0' }}
                          >
                            <Icon size={15} />
                            {label}
                          </Link>
                        ))}

                        <div className="border-t" style={{ borderColor: '#2d2d4a' }}>
                          <button
                            onClick={() => { handleLogout(); setUserDropdown(false); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-all hover:bg-red-500/10"
                            style={{ color: '#ef4444' }}
                          >
                            <FiLogOut size={15} />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost px-4 py-2 text-sm rounded-lg">Sign In</Link>
                <Link to="/register" className="btn-primary px-4 py-2 text-sm rounded-lg">
                  Join Now
                </Link>
              </div>
            )}

            {/* Mobile menu */}
            <button
              className="md:hidden btn-ghost p-2 rounded-xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <FiMenu size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t py-4"
              style={{ borderColor: '#2d2d4a' }}
            >
              <div className="flex flex-col gap-3">
                {CITIES.slice(0, 4).map((c) => (
                  <button key={c} onClick={() => { setCity(c); setMobileMenuOpen(false); }}
                    className="text-left px-2 py-1 text-sm" style={{ color: c === selectedCity ? '#7c3aed' : '#a0a0c0' }}>
                    {c}
                  </button>
                ))}
                <div className="border-t pt-3" style={{ borderColor: '#2d2d4a' }}>
                  <Link to="/" className="block py-2 text-sm" style={{ color: '#a0a0c0' }} onClick={() => setMobileMenuOpen(false)}>Movies</Link>
                  <Link to="/theatres" className="block py-2 text-sm" style={{ color: '#a0a0c0' }} onClick={() => setMobileMenuOpen(false)}>Theatres</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside handler */}
      {(cityDropdown || userDropdown || notifDropdown) && (
        <div className="fixed inset-0 z-40" onClick={() => { setCityDropdown(false); setUserDropdown(false); setNotifDropdown(false); }} />
      )}
    </motion.nav>
  );
}
