import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import { 
  FiDownload, FiX, FiCalendar, FiMapPin, FiFilm, FiLoader, FiCheckCircle,
  FiSearch, FiFilter, FiClock, FiArrowRight, FiInfo, FiSlash, FiTrendingUp
} from 'react-icons/fi';
import { HiOutlineTicket, HiSparkles } from 'react-icons/hi2';
import { MdEventSeat, MdOutlineConfirmationNumber } from 'react-icons/md';

const STATUS_CONFIG = {
  CONFIRMED: { label: 'Confirmed Pass', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', badge: 'bg-emerald-500' },
  PENDING: { label: 'Payment Pending', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', badge: 'bg-amber-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30', badge: 'bg-rose-500' },
  REFUNDED: { label: 'Refund Processed', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', badge: 'bg-blue-500' },
  EXPIRED: { label: 'Pass Expired', color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/30', badge: 'bg-slate-500' },
};

export default function BookingHistory() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [cancellingId, setCancellingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-bookings', activeTab],
    queryFn: () => bookingAPI.getMy({ status: activeTab === 'ALL' ? undefined : activeTab }),
  });

  const rawBookings = data?.data?.data?.bookings || [];

  // Computed Stats & Filtering
  const stats = useMemo(() => {
    const confirmed = rawBookings.filter(b => b.status === 'CONFIRMED');
    const totalSpent = confirmed.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    // Find closest upcoming show
    const now = new Date();
    const upcoming = confirmed
      .filter(b => b.show?.startTime && new Date(b.show.startTime) > now)
      .sort((a, b) => new Date(a.show.startTime) - new Date(b.show.startTime))[0];

    return {
      totalCount: rawBookings.length,
      confirmedCount: confirmed.length,
      totalSpent,
      upcoming,
    };
  }, [rawBookings]);

  // Filter & Sort Bookings
  const filteredBookings = useMemo(() => {
    let result = [...rawBookings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.bookingNumber?.toLowerCase().includes(q) ||
        b.show?.movie?.title?.toLowerCase().includes(q) ||
        b.show?.screen?.theatre?.name?.toLowerCase().includes(q) ||
        b.show?.screen?.theatre?.city?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'amount_high') return b.totalAmount - a.totalAmount;
      if (sortBy === 'amount_low') return a.totalAmount - b.totalAmount;
      return 0;
    });

    return result;
  }, [rawBookings, searchQuery, sortBy]);

  const handleCancel = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking? A refund will be initiated.')) return;
    setCancellingId(bookingId);
    try {
      await bookingAPI.cancel(bookingId, 'Customer requested');
      toast.success('Booking cancelled. Refund initiated.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownload = async (bookingId, bookingNumber) => {
    setDownloadingId(bookingId);
    try {
      const res = await bookingAPI.downloadTicket(bookingId);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${bookingNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Ticket PDF downloaded! 📥');
    } catch {
      toast.error('Download failed. Try viewing online.');
    } finally {
      setDownloadingId(null);
    }
  };

  const tabs = [
    { id: 'ALL', label: 'All Passes' },
    { id: 'CONFIRMED', label: 'Confirmed' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'CANCELLED', label: 'Cancelled' },
    { id: 'REFUNDED', label: 'Refunded' },
  ];

  return (
    <div className="min-h-screen py-10 bg-[#070710] pb-24 text-slate-100 selection:bg-purple-500 selection:text-white">
      <div className="container-app max-w-5xl space-y-8">
        
        {/* Header Title & Passbook Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-6 md:p-8 shadow-2xl backdrop-blur-2xl">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest mb-1">
                <HiOutlineTicket size={16} /> CineMax Digital Passbook
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                My Movie Tickets
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Manage your digital M-Tickets, view upcoming showtimes, download PDF passes, and track refunds.
              </p>
            </div>

            <Link
              to="/"
              className="btn-primary px-5 py-3 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xl glow-purple hover:scale-[1.02] transition-transform"
            >
              <HiSparkles size={16} /> Book New Tickets
            </Link>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl glass-card border border-white/10 flex items-center gap-3 bg-purple-500/5">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300">
              <HiOutlineTicket size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Bookings</p>
              <p className="text-lg font-black text-white">{stats.totalCount}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-white/10 flex items-center gap-3 bg-emerald-500/5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
              <FiCheckCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Active Passes</p>
              <p className="text-lg font-black text-emerald-400">{stats.confirmedCount}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-white/10 flex items-center gap-3 bg-amber-500/5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
              <FiTrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Cinema Spent</p>
              <p className="text-lg font-black text-amber-300">₹{stats.totalSpent.toFixed(0)}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-white/10 flex items-center gap-3 bg-indigo-500/5">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300">
              <FiClock size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Next Show</p>
              <p className="text-xs font-extrabold text-white truncate max-w-[120px]">
                {stats.upcoming ? stats.upcoming.show?.movie?.title : 'No Upcoming'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter, Search & Sort Controls Bar */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Status Tabs */}
          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === t.id
                    ? 'gradient-bg text-white shadow-lg glow-purple'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-60">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movie or cinema..."
                className="w-full glass-input text-xs pl-9 pr-4 py-2 rounded-xl outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                  <FiX />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input text-xs px-3 py-2 rounded-xl outline-none bg-slate-900 text-slate-300 font-semibold"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Highest Amount</option>
              <option value="amount_low">Lowest Amount</option>
            </select>
          </div>

        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 rounded-3xl shimmer" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-3xl border border-white/10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto text-2xl border border-purple-500/20">
              <FiFilm />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No Tickets Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery ? `No booking matches "${searchQuery}"` : 'You haven’t placed any bookings in this category yet.'}
              </p>
            </div>
            <Link to="/" className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl inline-block">
              Explore Blockbuster Movies
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {filteredBookings.map((booking, i) => {
                const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CONFIRMED;
                const movie = booking.show?.movie;
                const theatre = booking.show?.screen?.theatre;
                const showDate = booking.show?.startTime ? new Date(booking.show.startTime) : null;
                const isUpcoming = showDate && showDate > new Date() && booking.status === 'CONFIRMED';

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative group rounded-3xl bg-slate-900/90 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-xl"
                  >
                    {/* Perforated Side Notches */}
                    <div className="w-5 h-5 rounded-full bg-[#070710] absolute -left-2.5 top-1/2 -translate-y-1/2 border border-white/10 z-20 pointer-events-none" />
                    <div className="w-5 h-5 rounded-full bg-[#070710] absolute -right-2.5 top-1/2 -translate-y-1/2 border border-white/10 z-20 pointer-events-none" />

                    <div className="flex flex-col lg:flex-row justify-between">
                      
                      {/* Ticket Body Details */}
                      <div className="p-6 flex-1 flex flex-col sm:flex-row gap-5 items-start">
                        {/* Poster */}
                        <div className="relative shrink-0">
                          <img
                            src={movie?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200'}
                            alt={movie?.title}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200';
                            }}
                            className="w-28 h-40 object-cover rounded-2xl border border-white/10 shadow-lg"
                          />
                          {isUpcoming && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500 text-slate-950 shadow-md">
                              Upcoming
                            </span>
                          )}
                        </div>

                        {/* Text Information */}
                        <div className="space-y-3 flex-1">
                          {/* Status & Booking Number */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                            <span className="text-xs font-mono text-purple-300 font-bold">
                              #{booking.bookingNumber}
                            </span>
                            {booking.show?.screen?.type && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                {booking.show.screen.type}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="font-black text-xl text-white leading-snug tracking-tight">
                            {movie?.title || 'Movie Experience'}
                          </h3>

                          {/* Info Rows */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                            <div className="flex items-center gap-2">
                              <FiMapPin className="text-purple-400 shrink-0" size={14} />
                              <span className="truncate">{theatre?.name}, {theatre?.city}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <FiCalendar className="text-pink-400 shrink-0" size={14} />
                              <span>
                                {showDate ? showDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 sm:col-span-2 text-purple-300 font-bold">
                              <MdEventSeat className="text-purple-400 shrink-0" size={15} />
                              <span>
                                Seats ({booking.seats?.length || 0}): {booking.seats?.map(s => s.label || `${s.row}${s.number}`).join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Perforated Divider Line */}
                      <div className="hidden lg:block w-px border-r-2 border-dashed border-white/15 my-4" />

                      {/* Ticket Stub Side Panel (Actions & Amount) */}
                      <div className="p-6 bg-white/[0.02] border-t lg:border-t-0 border-white/10 flex flex-col justify-between items-end gap-4 min-w-[220px]">
                        <div className="text-right w-full flex justify-between lg:flex-col lg:items-end">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Paid</p>
                            <p className="text-2xl font-black gradient-text">₹{booking.totalAmount?.toFixed(0)}</p>
                          </div>
                          {booking.couponCode && (
                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">
                              Coupon: {booking.couponCode}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap lg:flex-col gap-2.5 w-full">
                          {booking.status === 'CONFIRMED' && (
                            <>
                              <Link
                                to={`/bookings/${booking.id}/ticket`}
                                className="flex-1 btn-primary py-2.5 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg glow-purple"
                              >
                                <HiOutlineTicket size={15} /> View M-Ticket
                              </Link>

                              <button
                                onClick={() => handleDownload(booking.id, booking.bookingNumber)}
                                disabled={downloadingId === booking.id}
                                className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                              >
                                {downloadingId === booking.id ? <FiLoader className="animate-spin" /> : <FiDownload size={13} />} PDF
                              </button>

                              <button
                                onClick={() => handleCancel(booking.id)}
                                disabled={cancellingId === booking.id}
                                className="py-1.5 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors text-center"
                              >
                                {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                              </button>
                            </>
                          )}

                          {booking.status === 'CANCELLED' && (
                            <div className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                              <FiSlash size={12} /> Booking Cancelled
                            </div>
                          )}

                          {booking.status === 'REFUNDED' && (
                            <div className="text-[11px] text-blue-400 font-semibold flex items-center gap-1">
                              <FiCheckCircle size={12} /> Refund Sent to Account
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}
