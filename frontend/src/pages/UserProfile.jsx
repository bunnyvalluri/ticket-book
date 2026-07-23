import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  FiUser, FiMail, FiPhone, FiCalendar, FiLock, 
  FiKey, FiBell, FiShield, FiCheckCircle, FiLoader, FiFilm, FiHeart,
  FiCopy, FiAward, FiGift, FiChevronRight, FiShare2, FiStar, FiMapPin,
  FiActivity, FiCheck, FiCheckSquare, FiAlertCircle
} from 'react-icons/fi';
import { HiOutlineTicket, HiSparkles } from 'react-icons/hi2';
import { MdEventSeat, MdOutlineLocalOffer, MdOutlineCardMembership } from 'react-icons/md';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { authAPI, bookingAPI } from '../services/api.js';
import { useAuthStore, useUIStore } from '../store/index.js';

const AVATAR_OPTIONS = ['🍿', '🦸🏼‍♂️', '🎬', '🎭', '🌟', '👑', '🚀', '🎸'];

export default function UserProfile() {
  const { user, updateUser } = useAuthStore();
  const { selectedCity, setCity } = useUIStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '🍿');

  // Fetch real booking stats
  const { data: bookingData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-bookings-profile'],
    queryFn: () => bookingAPI.getMy({ limit: 5 }),
  });

  const bookings = bookingData?.data?.data?.bookings || [];
  const totalBookingsCount = bookings.length;

  const { register: registerProfile, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors } } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      dateOfBirth: user?.dateOfBirth ? format(parseISO(user.dateOfBirth), 'yyyy-MM-dd') : '',
      gender: user?.gender || '',
      city: selectedCity || 'Hyderabad',
      bio: user?.bio || 'Passionate movie enthusiast & cinephile 🎬',
    }
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, reset: resetPasswordForm, watch } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  const newPasswordVal = watch('newPassword') || '';

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Weak', color: 'bg-rose-500' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 33, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 66, label: 'Medium', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const passStrength = getPasswordStrength(newPasswordVal);

  const onProfileSubmit = async (data) => {
    setProfileLoading(true);
    try {
      if (data.city) setCity(data.city);
      const res = await authAPI.updateProfile({ ...data, avatar: selectedAvatar });
      const updatedUser = res.data?.data?.user || { ...user, ...data, avatar: selectedAvatar };
      updateUser(updatedUser);
      toast.success('Profile updated successfully! ✨');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password updated successfully! 🔑');
      resetPasswordForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const [notifs, setNotifs] = useState({
    bookingConfirmations: true,
    weeklyOffers: true,
    showReminders: true,
    systemUpdates: false,
    smsAlerts: true,
  });

  const toggleNotif = (key) => {
    setNotifs(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      toast.success('Preferences updated!');
      return updated;
    });
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard! 📋`);
  };

  const memberId = user?.id ? `CNX-${user.id.slice(-6).toUpperCase()}` : 'CNX-VIP8892';
  const referralCode = `CINE-${(user?.firstName || 'VIP').toUpperCase()}100`;

  return (
    <div className="min-h-screen pb-24 pt-8 bg-[#070710] text-slate-100 selection:bg-purple-500 selection:text-white">
      <div className="container-app max-w-5xl space-y-8">
        
        {/* Holographic VIP Header Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-indigo-950/60 backdrop-blur-2xl p-6 md:p-8 shadow-2xl glow-purple"
        >
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* User Info & Avatar */}
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center text-4xl shadow-2xl glow-purple ring-4 ring-purple-500/30 group-hover:scale-105 transition-transform duration-300">
                  {selectedAvatar || user?.firstName?.[0] || '🍿'}
                </div>
                <button 
                  onClick={() => setActiveTab('profile')} 
                  title="Customize Avatar"
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-purple-600 text-white shadow-lg text-xs hover:bg-purple-500 transition-colors"
                >
                  <HiSparkles size={14} />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-3xl font-black text-white tracking-tight">
                    {user?.firstName} {user?.lastName || ''}
                  </h1>
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                    <MdOutlineCardMembership size={13} /> {user?.role === 'ADMIN' ? 'ADMIN VIP' : 'GOLD VIP'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-2">
                  <span>{user?.email}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="text-purple-400 font-semibold">{selectedCity}</span>
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                  <button 
                    onClick={() => copyToClipboard(memberId, 'Member ID')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 transition-colors group"
                  >
                    <span>ID: {memberId}</span>
                    <FiCopy size={12} className="text-purple-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <FiCheckCircle size={12} /> Verified Cinephile
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions / Loyalty Badge */}
            <div className="flex flex-col sm:flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
              <Link 
                to="/bookings" 
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl gradient-bg text-white text-xs font-bold shadow-xl glow-purple flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
              >
                <HiOutlineTicket size={16} /> View Active Tickets
              </Link>
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <FiStar size={13} className="text-amber-400" />
                <span>Loyalty Points: <strong className="text-amber-300 font-bold">750 pts</strong></span>
              </div>
            </div>

          </div>

          {/* Progress to Platinum */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <FiAward className="text-amber-400 text-base" />
              <span>Progress to <strong>Platinum VIP</strong>: <strong>750 / 1000 pts</strong></span>
            </div>
            <div className="w-full sm:w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 w-[75%] rounded-full shadow-lg" />
            </div>
          </div>
        </motion.div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings', val: totalBookingsCount, icon: FiFilm, color: 'text-purple-400', bg: 'from-purple-500/10 to-indigo-500/10' },
            { label: 'Saved Wishlist', val: '8 Movies', icon: FiHeart, color: 'text-pink-400', bg: 'from-pink-500/10 to-rose-500/10' },
            { label: 'Rewards Saved', val: '₹450', icon: MdOutlineLocalOffer, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-teal-500/10' },
            { label: 'Member Tier', val: 'Gold VIP', icon: FiAward, color: 'text-amber-400', bg: 'from-amber-500/10 to-orange-500/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className={`p-4 rounded-2xl glass-card border border-white/10 bg-gradient-to-br ${stat.bg} flex items-center gap-4`}
            >
              <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{stat.label}</p>
                <p className="text-lg font-black text-white">{stat.val}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Nav Tabs */}
        <div className="flex gap-2 p-1.5 rounded-2xl glass-card border border-white/10 overflow-x-auto">
          {[
            { id: 'profile', label: 'Edit Profile', icon: FiUser },
            { id: 'password', label: 'Security & Login', icon: FiKey },
            { id: 'notifications', label: 'Alerts & Notifs', icon: FiBell },
            { id: 'tickets', label: 'Recent Tickets', icon: HiOutlineTicket, count: totalBookingsCount },
            { id: 'perks', label: 'VIP Rewards', icon: FiGift },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`shrink-0 flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 relative ${
                activeTab === id
                  ? 'gradient-bg text-white shadow-xl glow-purple'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
              {typeof count === 'number' && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === id ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-300'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Container */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/15 shadow-2xl relative overflow-hidden min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Edit Profile */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FiUser className="text-purple-400" /> Personal Profile & Preferences
                  </h3>
                  <p className="text-xs text-slate-400">Update your account identity and cinema preferences</p>
                </div>

                {/* Avatar Picker */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <label className="text-xs font-bold text-slate-300 block">Choose Cinephile Avatar</label>
                  <div className="flex flex-wrap gap-3">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedAvatar(emoji)}
                        className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                          selectedAvatar === emoji
                            ? 'bg-purple-600/40 border-2 border-purple-400 scale-110 shadow-lg glow-purple'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-bold text-slate-300 mb-2 block">First Name</label>
                      <input
                        type="text"
                        {...registerProfile('firstName', { required: 'First name is required' })}
                        className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none focus:border-purple-500 transition-colors"
                      />
                      {profileErrors.firstName && <span className="text-[10px] text-pink-400 mt-1 block">{profileErrors.firstName.message}</span>}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 mb-2 block">Last Name</label>
                      <input
                        type="text"
                        {...registerProfile('lastName')}
                        className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-bold text-slate-300 mb-2 block">Phone Number</label>
                      <input
                        type="tel"
                        {...registerProfile('phone')}
                        placeholder="+91 98765 43210"
                        className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 mb-2 block">Preferred City</label>
                      <select
                        {...registerProfile('city')}
                        className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none focus:border-purple-500 transition-colors bg-slate-900"
                      >
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Bengaluru">Bengaluru</option>
                        <option value="Delhi-NCR">Delhi-NCR</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Kolkata">Kolkata</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-bold text-slate-300 mb-2 block">Date of Birth</label>
                      <input
                        type="date"
                        {...registerProfile('dateOfBirth')}
                        className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 mb-2 block">Gender</label>
                      <select
                        {...registerProfile('gender')}
                        className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none focus:border-purple-500 transition-colors bg-slate-900"
                      >
                        <option value="">Select Gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-2 block">Cinephile Bio</label>
                    <textarea
                      rows={2}
                      {...registerProfile('bio')}
                      className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none focus:border-purple-500 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="btn-primary px-8 py-3.5 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xl glow-purple hover:scale-[1.02] transition-transform"
                  >
                    {profileLoading ? <FiLoader className="animate-spin" /> : 'Save Profile Changes'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* TAB 2: Security */}
            {activeTab === 'password' && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FiShield className="text-purple-400" /> Security & Account Protection
                  </h3>
                  <p className="text-xs text-slate-400">Keep your account secure by updating your credentials</p>
                </div>

                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-5 max-w-xl">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-2 block">Current Password</label>
                    <input
                      type="password"
                      {...registerPassword('currentPassword', { required: 'Current password is required' })}
                      placeholder="••••••••"
                      className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none"
                    />
                    {passwordErrors.currentPassword && <span className="text-[10px] text-pink-400 mt-1 block">{passwordErrors.currentPassword.message}</span>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-2 block">New Password</label>
                    <input
                      type="password"
                      {...registerPassword('newPassword', { required: 'New password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
                      placeholder="••••••••"
                      className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none"
                    />
                    {passwordErrors.newPassword && <span className="text-[10px] text-pink-400 mt-1 block">{passwordErrors.newPassword.message}</span>}
                    
                    {/* Password Strength Indicator */}
                    {newPasswordVal && (
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Password Strength</span>
                          <span className="font-bold text-slate-200">{passStrength.label}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${passStrength.color} transition-all duration-300`} style={{ width: `${passStrength.score}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-2 block">Confirm New Password</label>
                    <input
                      type="password"
                      {...registerPassword('confirmPassword', { validate: val => val === newPasswordVal || 'Passwords do not match' })}
                      placeholder="••••••••"
                      className="glass-input text-xs px-4 py-3.5 rounded-2xl w-full outline-none"
                    />
                    {passwordErrors.confirmPassword && <span className="text-[10px] text-pink-400 mt-1 block">{passwordErrors.confirmPassword.message}</span>}
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="btn-primary px-8 py-3.5 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xl glow-purple"
                  >
                    {passwordLoading ? <FiLoader className="animate-spin" /> : 'Update Password'}
                  </button>
                </form>

                {/* Security Card Info */}
                <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/15 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FiLock className="text-purple-400 text-xl" />
                    <div>
                      <p className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</p>
                      <p className="text-[11px] text-slate-400">Enhance login security with verified email tokens</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </div>
              </motion.div>
            )}

            {/* TAB 3: Notifications */}
            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FiBell className="text-purple-400" /> Notification & Alert Preferences
                  </h3>
                  <p className="text-xs text-slate-400">Customize how and when you receive movie and ticket alerts</p>
                </div>

                <div className="space-y-3 max-w-2xl">
                  {[
                    { key: 'bookingConfirmations', title: 'Instant M-Ticket & Booking Confirmations', desc: 'Receive immediate QR tickets via email & in-app alerts' },
                    { key: 'showReminders', title: 'Showtime Countdown & Gate Alerts', desc: 'Get reminded 1 hour before showtime with cinema directions' },
                    { key: 'weeklyOffers', title: 'Weekend Movie Deals & Promo Codes', desc: 'Exclusive promo codes and 1-for-1 movie ticket offers' },
                    { key: 'smsAlerts', title: 'SMS Ticket Notifications', desc: 'Get M-Ticket SMS backup link directly to your phone' },
                    { key: 'systemUpdates', title: 'App Upgrades & Service News', desc: 'Occasional announcements about new cinema formats & features' },
                  ].map(({ key, title, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white">{title}</p>
                        <p className="text-[11px] text-slate-400">{desc}</p>
                      </div>
                      <button
                        onClick={() => toggleNotif(key)}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${notifs[key] ? 'bg-purple-600' : 'bg-slate-700'}`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${notifs[key] ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB 4: Recent Tickets Hub */}
            {activeTab === 'tickets' && (
              <motion.div
                key="tickets"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <HiOutlineTicket className="text-purple-400" /> Recent Ticket Passes
                    </h3>
                    <p className="text-xs text-slate-400">Quick access to your upcoming and recent movie tickets</p>
                  </div>
                  <Link to="/bookings" className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1">
                    View All History <FiChevronRight />
                  </Link>
                </div>

                {bookingsLoading ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-24 rounded-2xl shimmer" />
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <FiFilm className="text-4xl text-purple-400 mx-auto opacity-50" />
                    <p className="text-xs text-slate-300 font-medium">No recent tickets found</p>
                    <Link to="/" className="btn-primary px-5 py-2 text-xs font-bold rounded-xl inline-block">
                      Browse Blockbusters
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.slice(0, 4).map((b) => (
                      <div key={b.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={b.show?.movie?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200'}
                            alt={b.show?.movie?.title}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200';
                            }}
                            className="w-12 h-16 object-cover rounded-xl border border-white/10"
                          />
                          <div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300">
                              #{b.bookingNumber}
                            </span>
                            <h4 className="text-sm font-extrabold text-white mt-1">{b.show?.movie?.title}</h4>
                            <p className="text-[11px] text-slate-400">
                              {b.show?.screen?.theatre?.name} • {new Date(b.show?.startTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <Link
                          to={`/bookings/${b.id}/ticket`}
                          className="btn-primary px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shrink-0"
                        >
                          <HiOutlineTicket size={14} /> View Pass
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 5: VIP Perks */}
            {activeTab === 'perks' && (
              <motion.div
                key="perks"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FiGift className="text-purple-400" /> VIP Member Rewards & Perks
                  </h3>
                  <p className="text-xs text-slate-400">Exclusive privileges enabled for your Gold VIP membership</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: 'Free Popcorn Upgrade', desc: 'Upgrade any medium popcorn to large on weekend shows', badge: 'Active' },
                    { title: '10% Cash Back Rewards', desc: 'Earn 10% points on every ticket and concession item booked', badge: 'Active' },
                    { title: 'Zero Cancellation Fee', desc: 'Cancel up to 2 hours before showtime with 100% refund', badge: 'Gold VIP' },
                    { title: 'Priority VIP Counter', desc: 'Skip ticket & popcorn lines with your digital pass QR', badge: 'Active' },
                  ].map((perk) => (
                    <div key={perk.title} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-white">{perk.title}</h4>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {perk.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{perk.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Referral Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                      <FiShare2 className="text-purple-400" /> Invite Friends & Earn ₹100 Off
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">Share your invite code. Friends get ₹100 off their first ticket!</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="px-4 py-2 rounded-xl bg-slate-900 font-mono text-xs font-bold text-amber-300 border border-amber-500/30">
                      {referralCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(referralCode, 'Referral Code')}
                      className="btn-primary px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1 shadow-md shrink-0"
                    >
                      <FiCopy /> Copy
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
