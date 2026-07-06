import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/api.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  FiUsers, FiFilm, FiDollarSign, FiBookmark, FiTrendingUp,
  FiTrendingDown, FiMapPin, FiActivity
} from 'react-icons/fi';
import CountUp from 'react-countup';

const CountUpComponent = CountUp.default || CountUp;

const COLORS = ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const StatCard = ({ icon: Icon, label, value, prefix = '', suffix = '', change, color, delay = 0, isLive = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="card p-6"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: color + '20', border: `1px solid ${color}40` }}>
        <Icon size={18} style={{ color }} />
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
          change >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
        }`}>
          {change >= 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
          {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-2xl font-black flex items-center gap-2" style={{ color: '#f0f0f8' }}>
        {prefix}
        <CountUpComponent end={typeof value === 'number' ? value : 0} duration={1.5} separator="," decimals={prefix === '₹' ? 0 : 0} />
        {suffix}
        {isLive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}
      </p>
      <p className="text-sm mt-1" style={{ color: '#606080' }}>{label}</p>
    </div>
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 text-sm shadow-2xl">
      <p className="font-semibold mb-2" style={{ color: '#f0f0f8' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === 'revenue' ? '₹' : ''}{p.value?.toLocaleString('en-IN')}
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

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminAPI.getDashboard,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['admin-revenue', 'monthly'],
    queryFn: () => adminAPI.getRevenueAnalytics({ period: 'monthly' }),
  });

  const { data: topMoviesData } = useQuery({
    queryKey: ['admin-top-movies'],
    queryFn: () => adminAPI.getTopMovies({ limit: 5 }),
  });

  const { data: userGrowthData } = useQuery({
    queryKey: ['admin-user-growth'],
    queryFn: adminAPI.getUserGrowth,
  });

  // Socket real-time invalidations & user tracking
  useEffect(() => {
    if (!socket) return;

    socket.emit('admin:join');

    const handleDashboardUpdate = (data) => {
      // Invalidate queries so Recharts updates smoothly
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-top-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-growth'] });

      // Live dashboard update toast
      toast.success(
        <div className="flex flex-col gap-0.5">
          <p className="font-bold text-xs text-white uppercase tracking-wider">Dashboard Updated</p>
          <p className="text-xs text-purple-200">
            {data.type === 'BOOKING_CONFIRMED' ? 'New ticket booking confirmed! 🎫' :
             data.type === 'USER_REGISTERED' ? 'New customer registered! 👥' :
             data.type === 'BOOKING_CANCELLED' ? 'Booking cancelled. ❌' : 'Dashboard metrics updated!'}
          </p>
        </div>,
        { icon: '📊', duration: 4000 }
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
    { icon: FiUsers, label: 'Total Users', value: stats?.overview?.totalUsers || 0, color: '#3b82f6', change: 8.3 },
    { icon: FiFilm, label: 'Active Movies', value: stats?.overview?.totalMovies || 0, color: '#10b981' },
    { icon: FiMapPin, label: 'Theatres', value: stats?.overview?.totalTheatres || 0, color: '#f59e0b' },
    { icon: FiActivity, label: 'Today\'s Bookings', value: stats?.overview?.todayBookings || 0, color: '#06b6d4', change: 22 },
    { icon: FiDollarSign, label: 'Monthly Revenue', value: Math.round(stats?.revenue?.monthly || 0), prefix: '₹', color: '#8b5cf6', change: parseFloat(stats?.revenue?.growth || 0) },
    { icon: FiUsers, label: 'Live Users (Active Conns)', value: activeUsers, suffix: ` (${totalConnections})`, color: '#10b981', isLive: true },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black" style={{ color: '#f0f0f8' }}>Dashboard Overview</h1>
        <p className="text-sm mt-1" style={{ color: '#606080' }}>
          {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.slice(0, 4).map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.08} />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.slice(4).map((s, i) => (
          <StatCard key={s.label} {...s} delay={(i + 4) * 0.08} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6 lg:col-span-2"
        >
          <h3 className="font-bold mb-6" style={{ color: '#f0f0f8' }}>📈 Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenue?.data || []}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="name" tick={{ fill: '#606080', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#606080', fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5}
                fill="url(#revenueGrad)" dot={{ fill: '#7c3aed', strokeWidth: 2, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Movies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <h3 className="font-bold mb-6" style={{ color: '#f0f0f8' }}>🎬 Top Movies</h3>
          <div className="space-y-4">
            {topMovies.slice(0, 5).map((movie, i) => (
              <div key={movie.id} className="flex items-center gap-3">
                <span className="text-sm font-black w-4" style={{ color: i === 0 ? '#f59e0b' : '#606080' }}>
                  #{i + 1}
                </span>
                <div className="w-8 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: '#f0f0f8' }}>{movie.title}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px]" style={{ color: '#606080' }}>{movie.bookings} bookings</span>
                    <span className="text-[10px] font-semibold" style={{ color: '#7c3aed' }}>₹{(movie.revenue / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full" style={{ background: '#1a1a2e' }}>
                    <div className="h-1 rounded-full gradient-bg"
                      style={{ width: `${Math.min(100, (movie.bookings / Math.max(1, topMovies[0]?.bookings)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* User growth + Booking status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-6"
        >
          <h3 className="font-bold mb-6" style={{ color: '#f0f0f8' }}>👥 User Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="month" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="new_users" name="New Users" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Booking Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-6"
        >
          <h3 className="font-bold mb-6" style={{ color: '#f0f0f8' }}>📊 Booking Status</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Confirmed', value: stats?.overview?.totalBookings || 80 },
                    { name: 'Pending', value: stats?.overview?.pendingBookings || 15 },
                    { name: 'Cancelled', value: stats?.overview?.cancelledBookings || 5 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  dataKey="value"
                >
                  {['#10b981', '#f59e0b', '#ef4444'].map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {[
                { label: 'Confirmed', value: stats?.overview?.totalBookings, color: '#10b981' },
                { label: 'Pending', value: stats?.overview?.pendingBookings, color: '#f59e0b' },
                { label: 'Cancelled', value: stats?.overview?.cancelledBookings, color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className="text-xs" style={{ color: '#a0a0c0' }}>{label}</span>
                  <span className="text-xs font-bold ml-auto" style={{ color }}>{value || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
