import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  FiUsers, FiFilm, FiDollarSign, FiBookmark, FiTrendingUp,
  FiTrendingDown, FiMapPin, FiActivity, FiPlus, FiCalendar,
  FiRefreshCw, FiRadio, FiCheckCircle, FiClock, FiTag, FiZap
} from 'react-icons/fi';
import CountUp from 'react-countup';

const CountUpComponent = CountUp.default || CountUp;

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const StatCard = ({ icon: Icon, label, value, prefix = '', suffix = '', change, color, delay = 0, isLive = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300 shadow-xl"
  >
    <div className="flex items-start justify-between mb-3">
      <div 
        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300"
        style={{ background: color + '20', border: `1px solid ${color}40` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
          change >= 0 
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
            : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        }`}>
          {change >= 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
          {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
        {prefix}
        <CountUpComponent end={typeof value === 'number' ? value : 0} duration={1.5} separator="," decimals={prefix === '₹' ? 0 : 0} />
        {suffix}
        {isLive && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        )}
      </p>
      <p className="text-xs font-semibold text-slate-400 mt-1">{label}</p>
    </div>
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-2xl p-3.5 text-xs shadow-2xl border border-white/15 bg-slate-900/95 backdrop-blur-xl space-y-1">
      <p className="font-extrabold text-slate-200">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: {p.name === 'revenue' || p.name === 'Revenue' ? '₹' : ''}{p.value?.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [activeUsers, setActiveUsers] = useState(1);
  const [totalConnections, setTotalConnections] = useState(1);
  const [timeRange, setTimeRange] = useState('monthly');
  const [activityLogs, setActivityLogs] = useState([
    { id: 1, type: 'BOOKING', text: 'New booking confirmed for Avatar 3', time: '2 mins ago', color: 'text-emerald-400' },
    { id: 2, type: 'USER', text: 'New customer account created', time: '10 mins ago', color: 'text-blue-400' },
    { id: 3, type: 'SHOW', text: 'Screen 2 showtime updated', time: '25 mins ago', color: 'text-purple-400' },
  ]);

  const { data: statsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminAPI.getDashboard,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['admin-revenue', timeRange],
    queryFn: () => adminAPI.getRevenueAnalytics({ period: timeRange }),
  });

  const { data: topMoviesData } = useQuery({
    queryKey: ['admin-top-movies'],
    queryFn: () => adminAPI.getTopMovies({ limit: 5 }),
  });

  const { data: userGrowthData } = useQuery({
    queryKey: ['admin-user-growth'],
    queryFn: adminAPI.getUserGrowth,
  });

  // Socket real-time invalidations & live activity feed
  useEffect(() => {
    if (!socket) return;

    socket.emit('admin:join');

    const handleDashboardUpdate = (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-top-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-growth'] });

      // Add to activity log feed
      const newLog = {
        id: Date.now(),
        type: data.type || 'SYSTEM',
        text: data.type === 'BOOKING_CONFIRMED' ? 'Ticket booking confirmed! 🎫' :
              data.type === 'USER_REGISTERED' ? 'New customer registered! 👥' :
              data.type === 'BOOKING_CANCELLED' ? 'Booking cancelled. ❌' : 'Dashboard metrics updated',
        time: 'Just now',
        color: data.type === 'BOOKING_CONFIRMED' ? 'text-emerald-400' : 'text-purple-400',
      };
      setActivityLogs(prev => [newLog, ...prev.slice(0, 5)]);

      toast.success(
        <div className="flex flex-col gap-0.5">
          <p className="font-bold text-xs text-white uppercase tracking-wider">Live Sync Event</p>
          <p className="text-xs text-purple-200">{newLog.text}</p>
        </div>,
        { icon: '⚡', duration: 3500 }
      );
    };

    const handleActiveUsers = (data) => {
      setActiveUsers(data.activeUsersCount);
      setTotalConnections(data.totalConnections);
    };

    socket.on('admin:dashboard_update', handleDashboardUpdate);
    socket.on('admin:active_users', handleActiveUsers);

    return () => {
      socket.emit('admin:leave');
      socket.off('admin:dashboard_update', handleDashboardUpdate);
      socket.off('admin:active_users', handleActiveUsers);
    };
  }, [socket, queryClient]);

  const stats = statsData?.data?.data;
  const revenue = revenueData?.data?.data;
  const topMovies = topMoviesData?.data?.data?.movies || [];
  const userGrowth = userGrowthData?.data?.data?.data || [];

  const handleRefresh = () => {
    refetch();
    toast.success('Metrics refreshed! 🔄');
  };

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl shimmer" />)}
      </div>
    </div>
  );

  const statCards = [
    { icon: FiDollarSign, label: 'Total Revenue', value: Math.round(stats?.revenue?.total || 0), prefix: '₹', color: '#7c3aed', change: parseFloat(stats?.revenue?.growth || 0) },
    { icon: FiBookmark, label: 'Total Bookings', value: stats?.overview?.totalBookings || 0, color: '#ec4899', change: 12.5 },
    { icon: FiUsers, label: 'Total Customers', value: stats?.overview?.totalUsers || 0, color: '#3b82f6', change: 8.3 },
    { icon: FiFilm, label: 'Active Movies', value: stats?.overview?.totalMovies || 0, color: '#10b981' },
    { icon: FiMapPin, label: 'Theatres', value: stats?.overview?.totalTheatres || 0, color: '#f59e0b' },
    { icon: FiActivity, label: "Today's Bookings", value: stats?.overview?.todayBookings || 0, color: '#06b6d4', change: 22 },
    { icon: FiDollarSign, label: 'Monthly Revenue', value: Math.round(stats?.revenue?.monthly || 0), prefix: '₹', color: '#8b5cf6', change: parseFloat(stats?.revenue?.growth || 0) },
    { icon: FiRadio, label: 'Live Active Connections', value: activeUsers, suffix: ` (${totalConnections})`, color: '#10b981', isLive: true },
  ];

  return (
    <div className="space-y-8 text-slate-100 selection:bg-purple-500 selection:text-white">
      
      {/* Command Center Banner Header */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Socket Sync Active
              </span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
              </span>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <FiZap className="text-purple-400" /> Admin Command Center
            </h1>
            <p className="text-xs text-slate-400">Real-time metrics, revenue analytics, and live cinema operations</p>
          </div>

          {/* Header Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Refresh Analytics"
            >
              <FiRefreshCw size={16} />
            </button>

            <div className="flex gap-1 p-1 rounded-2xl bg-slate-900 border border-white/10 text-xs font-bold">
              {['monthly', 'weekly', 'yearly'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeRange(period)}
                  className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                    timeRange === period ? 'gradient-bg text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap gap-3">
          <Link to="/admin/movies" className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <FiPlus size={14} /> Add New Movie
          </Link>
          <Link to="/admin/coupons" className="px-4 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <FiTag size={14} /> Create Coupon
          </Link>
          <Link to="/admin/shows" className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <FiCalendar size={14} /> Schedule Shows
          </Link>
          <Link to="/admin/analytics" className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors">
            <FiTrendingUp size={14} /> View Detailed Analytics
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.slice(0, 4).map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.05} />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.slice(4).map((s, i) => (
          <StatCard key={s.label} {...s} delay={(i + 4) * 0.05} />
        ))}
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 rounded-3xl border border-white/15 shadow-2xl lg:col-span-2 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <FiTrendingUp className="text-purple-400" /> Revenue Stream Overview
              </h3>
              <p className="text-xs text-slate-400">Total ticketer gross sales trends</p>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Live Aggregate
            </span>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenue?.data || []}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={3} fill="url(#revenueGrad)" dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Movies Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 rounded-3xl border border-white/15 shadow-2xl space-y-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
              <FiFilm className="text-amber-400" /> Top Movies
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">By Bookings</span>
          </div>

          <div className="space-y-4">
            {topMovies.slice(0, 5).map((movie, i) => (
              <div key={movie.id} className="flex items-center gap-3">
                <span className={`text-xs font-black w-5 h-5 rounded-md flex items-center justify-center ${
                  i === 0 ? 'bg-amber-400 text-slate-950' :
                  i === 1 ? 'bg-slate-300 text-slate-950' :
                  i === 2 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  #{i + 1}
                </span>
                <img
                  src={movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200'}
                  alt={movie.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200';
                  }}
                  className="w-9 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{movie.title}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>{movie.bookings} bookings</span>
                    <span className="font-bold text-purple-300">₹{(movie.revenue / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{ width: `${Math.min(100, (movie.bookings / Math.max(1, topMovies[0]?.bookings || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* User Growth, Booking Status & Live Feed Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Growth Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4"
        >
          <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
            <FiUsers className="text-blue-400" /> User Growth
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="new_users" name="New Users" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Booking Status Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4"
        >
          <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
            <FiBookmark className="text-pink-400" /> Booking Breakdown
          </h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Confirmed', value: stats?.overview?.totalBookings || 80 },
                    { name: 'Pending', value: stats?.overview?.pendingBookings || 15 },
                    { name: 'Cancelled', value: stats?.overview?.cancelledBookings || 5 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={58}
                  dataKey="value"
                >
                  {['#10b981', '#f59e0b', '#ef4444'].map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 flex-1">
              {[
                { label: 'Confirmed', value: stats?.overview?.totalBookings, color: '#10b981' },
                { label: 'Pending', value: stats?.overview?.pendingBookings, color: '#f59e0b' },
                { label: 'Cancelled', value: stats?.overview?.cancelledBookings, color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-slate-300 font-medium">{label}</span>
                  </div>
                  <span className="font-bold text-white">{value || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Live Operations Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
              <FiRadio className="text-emerald-400 animate-pulse" /> Live System Feed
            </h3>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Realtime
            </span>
          </div>

          <div className="space-y-3">
            {activityLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FiCheckCircle className={log.color} size={15} />
                  <span className="text-slate-200 truncate font-medium">{log.text}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">{log.time}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

    </div>
  );
}
