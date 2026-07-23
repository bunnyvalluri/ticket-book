import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore, useNotificationStore } from '../../store/index.js';
import { authAPI, notificationAPI } from '../../services/api.js';
import toast from 'react-hot-toast';
import {
  FiSearch, FiX, FiBell, FiUser, FiLogOut, FiBookmark,
  FiHeart, FiSettings, FiChevronDown, FiMenu, FiFilm,
  FiMapPin, FiShield, FiCheckCircle, FiClock, FiTv
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
      transition={{ type: 'spring', damping: 20, stiffness: 120 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass py-2.5 shadow-2xl border-b border-white/10' : 'bg-gradient-to-b from-black/90 via-black/50 to-transparent py-3.5'
      }`}
    >
      <div className="container-app">
        <div className="flex items-center justify-between h-12">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg glow-purple shrink-0"
            >
              <FiFilm className="text-lg" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight gradient-text leading-none">
                CineMax
              </span>
              <span className="text-[9px] font-bold text-purple-400/90 tracking-widest uppercase -mt-0.5">
                Cinema Pass
              </span>
            </div>
          </Link>

          {/* City Selector */}
          <div className="relative hidden md:block">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setCityDropdown(!cityDropdown)}
              className="h-9 flex items-center gap-2 px-3.5 rounded-full glass-card text-xs font-semibold hover:border-purple-500/50 transition-all"
            >
              <FiMapPin className="text-purple-400 animate-pulse shrink-0" size={13} />
              <span className="text-slate-200">{selectedCity}</span>
              <FiChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${cityDropdown ? 'rotate-180 text-purple-400' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {cityDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-11 left-0 glass-card rounded-2xl p-2 min-w-[180px] shadow-2xl z-50 border border-white/15"
                >
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Select Location
                  </div>
                  {CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => { setCity(city); setCityDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                        city === selectedCity
                          ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/40'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {city}
                      {city === selectedCity && <FiCheckCircle className="text-purple-400" size={13} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md h-9.5">
            <Link
              to="/"
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                location.pathname === '/' 
                  ? 'gradient-bg text-white shadow-md glow-purple' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FiFilm size={13} /> Movies
            </Link>
            <Link
              to="/theatres"
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                location.pathname === '/theatres' 
                  ? 'gradient-bg text-white shadow-md glow-purple' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FiTv size={13} /> Theatres
            </Link>
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 border border-amber-500/30'
                }`}
              >
                <FiShield size={13} /> Admin
              </Link>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            
            {/* Search Input Bar */}
            <AnimatePresence>
              {isSearchOpen ? (
                <motion.form
                  initial={{ width: 40, opacity: 0 }}
                  animate={{ width: 250, opacity: 1 }}
                  exit={{ width: 40, opacity: 0 }}
                  onSubmit={handleSearch}
                  className="flex items-center"
                >
                  <div className="relative w-full">
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search movies, genres..."
                      className="w-full text-xs pl-8 pr-8 py-2 rounded-full glass-input text-white outline-none"
                    />
                    <FiSearch className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                    <button
                      type="button"
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSearchOpen(true)}
                  className="w-9 h-9 rounded-full glass hover:border-purple-500/50 text-slate-300 hover:text-white transition-all flex items-center justify-center"
                  title="Search Movies"
                >
                  <FiSearch size={15} />
                </motion.button>
              )}
            </AnimatePresence>

            {isAuthenticated ? (
              <>
                {/* Notifications Dropdown */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setNotifDropdown(!notifDropdown); setUserDropdown(false); }}
                    className="w-9 h-9 rounded-full glass hover:border-purple-500/50 text-slate-300 hover:text-white transition-all relative flex items-center justify-center"
                  >
                    <FiBell size={15} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold flex items-center justify-center rounded-full bg-pink-500 text-white animate-pulse shadow-md">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {notifDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-12 glass-card rounded-2xl overflow-hidden shadow-2xl w-[320px] md:w-[360px] z-50 border border-white/15"
                      >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                          <div>
                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                              Notifications
                              {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-500/30 text-purple-300 font-semibold border border-purple-500/40">
                                  {unreadCount} new
                                </span>
                              )}
                            </h3>
                          </div>
                          <div className="flex gap-2 text-xs">
                            {unreadCount > 0 && (
                              <button onClick={handleMarkAllRead} className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer">
                                Mark read
                              </button>
                            )}
                            {notifications.length > 0 && (
                              <button onClick={handleClearAll} className="text-pink-400 hover:text-pink-300 font-semibold cursor-pointer">
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="max-h-[320px] overflow-y-auto divide-y divide-white/5">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                              <FiBell className="mx-auto mb-2 text-2xl text-slate-500 opacity-60" />
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
                                className={`p-3.5 text-left transition-all hover:bg-white/5 cursor-pointer flex gap-3 relative ${
                                  !notif.isRead ? 'bg-purple-600/10' : ''
                                }`}
                              >
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-pink-500 absolute left-2 top-4 shrink-0 animate-ping" />
                                )}
                                <div className="pl-1 w-full">
                                  <div className="flex items-center justify-between">
                                    <p className="font-bold text-xs text-slate-100">{notif.title}</p>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <FiClock size={10} />
                                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-[11px] mt-1 text-slate-300 leading-snug">
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

                {/* User Card Dropdown */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setUserDropdown(!userDropdown)}
                    className="h-10 flex items-center gap-2.5 p-1 pl-1.5 pr-3 rounded-full glass hover:border-purple-500/60 transition-all duration-300 border border-white/15 shadow-lg group"
                  >
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-500/40 group-hover:ring-purple-400 transition-all" alt="avatar" />
                    ) : (
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-black shadow-md ring-2 ring-purple-500/40 group-hover:ring-purple-400 transition-all shrink-0">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                    )}
                    <div className="flex flex-col text-left hidden sm:flex">
                      <span className="text-xs font-extrabold text-white group-hover:text-purple-300 transition-colors leading-tight">
                        {user?.firstName}
                      </span>
                      <span className="text-[9px] font-semibold text-purple-400/80 uppercase tracking-widest leading-none">
                        {isAdmin ? 'Admin' : 'Member'}
                      </span>
                    </div>
                    <FiChevronDown size={14} className={`text-slate-400 group-hover:text-purple-300 transition-transform duration-300 ${userDropdown ? 'rotate-180 text-purple-400' : ''}`} />
                  </motion.button>

                  <AnimatePresence>
                    {userDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-14 glass-card rounded-3xl overflow-hidden shadow-2xl min-w-[250px] z-50 border border-white/20 backdrop-blur-2xl bg-[#0b0c1b]/95"
                      >
                        {/* Profile Header Header Box */}
                        <div className="p-4 border-b border-white/10 bg-gradient-to-br from-white/10 via-purple-900/10 to-transparent">
                          <div className="flex items-center gap-3">
                            {user?.avatarUrl ? (
                              <img src={user.avatarUrl} className="w-10 h-10 rounded-2xl object-cover ring-2 ring-purple-500/50 shadow-md" alt="avatar" />
                            ) : (
                              <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center text-white text-sm font-black shadow-lg ring-2 ring-purple-500/50 shrink-0">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <p className="font-black text-sm text-white truncate">{user?.firstName} {user?.lastName}</p>
                              <p className="text-[11px] font-medium text-slate-400 truncate">{user?.email}</p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {isAdmin ? (
                              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)] flex items-center gap-1">
                                <FiShield size={11} className="text-amber-400" />
                                Admin Access
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <FiCheckCircle size={11} className="text-purple-400" />
                                CineMax VIP
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Navigation Items */}
                        <div className="p-2 space-y-1">
                          {[
                            { icon: FiUser, label: 'Profile Settings', to: '/profile' },
                            { icon: FiFilm, label: 'My Tickets & Bookings', to: '/bookings' },
                            { icon: FiHeart, label: 'Wishlist & Favorites', to: '/profile?tab=favorites' },
                            ...(isAdmin ? [{ icon: FiShield, label: 'Admin Portal', to: '/admin/dashboard', special: true }] : []),
                          ].map(({ icon: Icon, label, to, special }) => (
                            <Link
                              key={label}
                              to={to}
                              onClick={() => setUserDropdown(false)}
                              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 group/item relative overflow-hidden ${
                                special
                                  ? 'text-amber-300 hover:bg-amber-500/15 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                                  : 'text-slate-200 hover:bg-purple-600/20 hover:text-white border border-transparent hover:border-purple-500/30'
                              }`}
                            >
                              <div className={`p-1.5 rounded-xl transition-all ${
                                special 
                                  ? 'bg-amber-500/20 text-amber-400 group-hover/item:scale-110' 
                                  : 'bg-white/5 text-purple-400 group-hover/item:bg-purple-500/30 group-hover/item:text-purple-200 group-hover/item:scale-110'
                              }`}>
                                <Icon size={14} />
                              </div>
                              <span className="flex-1">{label}</span>
                            </Link>
                          ))}
                        </div>

                        {/* Logout Section */}
                        <div className="p-2 border-t border-white/10 bg-white/[0.02]">
                          <button
                            onClick={() => { handleLogout(); setUserDropdown(false); }}
                            className="flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-extrabold w-full text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 transition-all duration-200 shadow-md group/logout"
                          >
                            <FiLogOut size={15} className="group-hover/logout:-translate-x-0.5 transition-transform" />
                            Log Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary px-4 py-1.5 text-xs font-bold rounded-full shadow-lg glow-purple">
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-xl glass text-slate-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <FiMenu size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 mt-3 pt-3 pb-2"
            >
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Popular Cities</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CITIES.slice(0, 5).map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCity(c); setMobileMenuOpen(false); }}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        c === selectedCity ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <Link to="/" className="py-2 text-sm font-semibold text-slate-200" onClick={() => setMobileMenuOpen(false)}>Movies</Link>
                <Link to="/theatres" className="py-2 text-sm font-semibold text-slate-200" onClick={() => setMobileMenuOpen(false)}>Theatres</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backdrop overlay for open menus */}
      {(cityDropdown || userDropdown || notifDropdown) && (
        <div className="fixed inset-0 z-40" onClick={() => { setCityDropdown(false); setUserDropdown(false); setNotifDropdown(false); }} />
      )}
    </motion.nav>
  );
}
