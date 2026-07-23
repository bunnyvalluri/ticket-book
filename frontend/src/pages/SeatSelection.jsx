import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { showAPI } from '../services/api.js';
import { useBookingStore, useAuthStore } from '../store/index.js';
import { useSocket } from '../context/SocketContext.jsx';
import { BrandLogoIcon } from '../components/common/BrandLogo.jsx';
import toast from 'react-hot-toast';
import { FiClock, FiZoomIn, FiZoomOut, FiArrowRight, FiX, FiCheck, FiFilm, FiShield, FiEye } from 'react-icons/fi';
import { FALLBACK_SHOWS } from '../data/fallbackData.js';

const SEAT_TYPE_COLORS = {
  SILVER: '#64748b',
  GOLD: '#f59e0b',
  PREMIUM: '#7c3aed',
  PLATINUM: '#6366f1',
  VIP: '#ec4899',
  RECLINER: '#10b981',
  COUPLE: '#f97316',
  WHEELCHAIR: '#3b82f6',
};

const SEAT_TYPE_PRICES = {
  SILVER: 150,
  GOLD: 220,
  PREMIUM: 300,
  PLATINUM: 380,
  VIP: 450,
  RECLINER: 500,
  COUPLE: 600,
  WHEELCHAIR: 120,
};

export default function SeatSelection() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedSeats, selectSeat, deselectSeat, clearSeats, setCurrentShow } = useBookingStore();
  const [zoom, setZoom] = useState(1);
  const { socket } = useSocket();
  const [realtimeLocks, setRealtimeLocks] = useState(new Map());
  const [timeLeft, setTimeLeft] = useState(null);
  const [sessionStart] = useState(Date.now());

  const isProceeding = useRef(false);
  const selectedSeatsRef = useRef(selectedSeats);
  const topViewRef = useRef(null);

  // Auto scroll to top view when entering page or changing showtime
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    topViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showId]);

  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  const handleClear = () => {
    selectedSeats.forEach((seat) => {
      socket?.emit('seat:deselect', { seatId: seat.id, showId });
    });
    clearSeats();
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['show', showId],
    queryFn: () => showAPI.getById(showId),
  });

  const show = data?.data?.data?.show;

  useEffect(() => {
    if (show) setCurrentShow(show);
  }, [show]);

  // Session countdown (10 minutes lock)
  useEffect(() => {
    const TIMEOUT = 10 * 60 * 1000;
    const tick = setInterval(() => {
      const elapsed = Date.now() - sessionStart;
      const remaining = TIMEOUT - elapsed;
      if (remaining <= 0) {
        selectedSeatsRef.current.forEach((seat) => {
          socket?.emit('seat:deselect', { seatId: seat.id, showId });
        });
        clearSeats();
        toast.error('Seat selection timer expired. Please reselect your seats.');
        navigate(-1);
      } else {
        setTimeLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [socket, showId]);

  // Socket.io listeners
  useEffect(() => {
    if (!socket || !showId) return;

    socket.emit('show:join', showId);

    const handleSeatLocked = ({ seatId, userId }) => {
      setRealtimeLocks((prev) => new Map(prev).set(seatId, userId));
    };

    const handleSeatReleased = ({ seatId }) => {
      setRealtimeLocks((prev) => {
        const next = new Map(prev);
        next.delete(seatId);
        return next;
      });
    };

    const handleSeatBooked = ({ seatId }) => {
      setRealtimeLocks((prev) => new Map(prev).set(seatId, 'BOOKED'));
    };

    socket.on('seat:locked', handleSeatLocked);
    socket.on('seat:released', handleSeatReleased);
    socket.on('seat:booked', handleSeatBooked);

    return () => {
      socket.emit('show:leave', showId);
      socket.off('seat:locked', handleSeatLocked);
      socket.off('seat:released', handleSeatReleased);
      socket.off('seat:booked', handleSeatBooked);

      if (!isProceeding.current) {
        selectedSeatsRef.current.forEach((seat) => {
          socket.emit('seat:deselect', { seatId: seat.id, showId });
        });
        clearSeats();
      }
    };
  }, [socket, showId]);

  const handleSeatClick = useCallback((seat) => {
    if (seat.status === 'BOOKED' || seat.status === 'LOCKED') return;
    if (realtimeLocks.has(seat.id) && realtimeLocks.get(seat.id) !== user?.id) return;

    const isSelected = selectedSeats.some((s) => s.id === seat.id);

    if (isSelected) {
      deselectSeat(seat.id);
      socket?.emit('seat:deselect', { seatId: seat.id, showId });
    } else {
      if (selectedSeats.length >= 10) {
        toast.error('Maximum 10 seats allowed per booking');
        return;
      }
      selectSeat({ ...seat, showId });
      socket?.emit('seat:select', { seatId: seat.id, showId });
    }
  }, [selectedSeats, socket, user, realtimeLocks, showId]);

  const getSeatStatus = (seat) => {
    if (seat.status === 'BOOKED') return 'booked';
    if (realtimeLocks.get(seat.id) === 'BOOKED') return 'booked';
    if (realtimeLocks.has(seat.id) && realtimeLocks.get(seat.id) !== user?.id) return 'locked';
    if (selectedSeats.some((s) => s.id === seat.id)) return 'selected';
    return 'available';
  };

  const handleProceed = () => {
    if (!selectedSeats.length) {
      toast.error('Please select at least one seat');
      return;
    }
    isProceeding.current = true;
    navigate('/booking/summary');
  };

  const handleSwitchShow = (targetShow) => {
    if (targetShow.id === showId) return;
    selectedSeats.forEach((seat) => {
      socket?.emit('seat:deselect', { seatId: seat.id, showId });
    });
    clearSeats();
    setCurrentShow(targetShow);
    navigate(`/shows/${targetShow.id}/seats`);
    setTimeout(() => {
      topViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const seatsByRow = {};
  const rawSeats = show?.screen?.seats;
  
  const seatList = (rawSeats && rawSeats.length > 0)
    ? rawSeats
    : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].flatMap((row, rIndex) =>
        [1, 2, 3, 4, 5, 6, 7, 8].map((col) => ({
          id: `seat-${row}${col}`,
          row,
          column: col,
          number: col,
          label: `${row}${col}`,
          seatType: rIndex < 2 ? 'VIP' : rIndex < 5 ? 'PREMIUM' : 'GOLD',
          status: 'AVAILABLE',
          price: rIndex < 2 ? 450 : rIndex < 5 ? 300 : 220,
        }))
      );

  seatList.forEach((seat) => {
    const rowKey = seat.row || 'A';
    if (!seatsByRow[rowKey]) seatsByRow[rowKey] = [];
    seatsByRow[rowKey].push(seat);
  });

  const totalPrice = selectedSeats.reduce((s, seat) => s + (seat.price || SEAT_TYPE_PRICES[seat.seatType] || 250), 0);

  if (isLoading && !show) return (
    <div className="min-h-screen flex items-center justify-center bg-[#070710]">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-400">Loading Cinema Seat Map...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-36 bg-[#070710] text-slate-100">
      
      {/* Top Header Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 py-3.5 px-6 backdrop-blur-xl sticky top-0 z-30">
        <div className="container-app flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <BrandLogoIcon className="w-9 h-9" iconSize="w-5 h-5" />
            <span className="text-xl font-black tracking-wider text-white uppercase font-heading">
              TICKET <span className="gradient-text">BOX</span>
            </span>
          </div>

          {/* User / Logout Action */}
          <div className="flex items-center gap-4">
            {timeLeft && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border backdrop-blur-md ${
                timeLeft < 120 
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' 
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                <FiClock size={13} />
                <span>Timer: {formatTime(timeLeft)}</span>
              </div>
            )}
            
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container-app py-8 space-y-6">

        {/* Scroll to Top View Anchor */}
        <div ref={topViewRef} className="scroll-mt-4" />

        {/* Showtime Selector Bar (Tap showtime to view seats map in top view) */}
        <div className="glass-card p-4 rounded-3xl border border-white/10 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 font-heading flex items-center gap-2">
              <FiClock size={15} /> Select Showtime (Top View Seats)
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <FiEye size={12} className="text-pink-400" /> Tap showtime to switch seat layout
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {FALLBACK_SHOWS.map((st) => {
              const isSelected = st.id === showId;
              const availableSeats = st.availableSeats ?? 30;
              const isFillingFast = availableSeats < 15;
              const showTimeFormatted = st.startTime 
                ? format(new Date(st.startTime), 'hh:mm a')
                : '11:10 PM';

              return (
                <button
                  key={st.id}
                  onClick={() => handleSwitchShow(st)}
                  className={`shrink-0 px-4 py-3 rounded-2xl glass-card border transition-all duration-300 text-left group ${
                    isSelected
                      ? 'bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/50 shadow-lg glow-purple scale-102'
                      : 'border-white/10 hover:border-purple-500/50 hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-sm font-numeric ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-purple-300'}`}>
                      {showTimeFormatted}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600/40 text-purple-200 uppercase font-heading">
                      {st.format || 'IMAX 3D'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-1.5 text-[11px]">
                    <span className="text-emerald-400 font-black font-numeric">₹{st.price || 300}</span>
                    <span className={`text-[9px] font-extrabold ${isFillingFast ? 'text-amber-400' : 'text-slate-400'}`}>
                      {isFillingFast ? 'Filling Fast 🔥' : `${availableSeats} seats`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Title & Screen Indicator Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
              {show?.movie?.title || 'Oppenheimer'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {show?.screen?.theatre?.name || 'CineMax IMAX Hyderabad'} • {show?.screen?.name || 'Screen IMAX'} • {show?.startTime ? new Date(show.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '23 Jul 2026, 9:30 am'}
            </p>
          </div>

          {/* Screen this side Indicator */}
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center justify-center gap-2 font-heading">
              <span className="w-12 h-px bg-slate-700" />
              Screen this side
              <span className="w-12 h-px bg-slate-700" />
            </p>
            {/* Screen Arc bar */}
            <div className="w-64 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full mx-auto mt-2 shadow-lg glow-purple" />
          </div>

          {/* Zoom Controls (Visible on all screens) */}
          <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-2xl border border-slate-700/60">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="p-1 text-slate-300 hover:text-white">
              <FiZoomOut size={16} />
            </button>
            <span className="text-xs font-bold text-slate-300 font-numeric">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} className="p-1 text-slate-300 hover:text-white">
              <FiZoomIn size={16} />
            </button>
          </div>
        </div>

        {/* Seat Matrix Area */}
        <div className="overflow-x-auto py-4">
          <div 
            className="flex flex-col items-center gap-3 min-w-[640px]"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.25s ease' }}
          >
            {Object.entries(seatsByRow).map(([row, seats]) => (
              <div key={row} className="flex items-center justify-center gap-3.5">
                {/* Row Label Left */}
                <span className="w-6 text-center font-black text-sm text-slate-400 font-heading">{row}</span>

                {/* Seat Rectangles */}
                <div className="flex gap-2.5 sm:gap-3">
                  {seats.map((seat) => {
                    const status = getSeatStatus(seat);
                    const numVal = seat.number ?? seat.column ?? (seat.label ? seat.label.replace(/^[A-Z]+/i, '') : '');
                    const seatLabel = seat.label || (numVal ? `${seat.row}${numVal}` : `${seat.row}`);

                    return (
                      <motion.button
                        key={seat.id}
                        whileHover={status === 'available' ? { scale: 1.12, zIndex: 10 } : {}}
                        whileTap={status === 'available' ? { scale: 0.95 } : {}}
                        onClick={() => handleSeatClick(seat)}
                        title={`Seat ${seatLabel} • ${seat.seatType} • ₹${seat.price || SEAT_TYPE_PRICES[seat.seatType] || 250}`}
                        className={`w-14 sm:w-16 h-10 sm:h-11 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center transition-all duration-200 shadow-md ${
                          status === 'selected'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white ring-2 ring-pink-400 shadow-xl glow-purple scale-105'
                            : status === 'booked'
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50 line-through'
                            : status === 'locked'
                            ? 'bg-amber-500/20 text-amber-400 cursor-not-allowed border border-amber-500/30'
                            : 'bg-[#fed7aa] text-amber-950 hover:bg-[#fde68a] hover:shadow-lg border border-amber-300 cursor-pointer'
                        }`}
                      >
                        {status === 'selected' ? (
                          <div className="flex items-center gap-1">
                            <FiCheck size={14} className="text-white" />
                            <span>{seatLabel}</span>
                          </div>
                        ) : (
                          <span>{seatLabel}</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Row Label Right */}
                <span className="w-6 text-center font-black text-sm text-slate-400">{row}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 glass-card p-4 rounded-2xl max-w-xl mx-auto border border-white/10">
          {[
            { label: 'Available', bg: 'bg-[#fed7aa]', text: 'text-amber-950' },
            { label: 'Selected', bg: 'bg-purple-600', text: 'text-white' },
            { label: 'Booked', bg: 'bg-slate-800', text: 'text-slate-500' },
            { label: 'Locked', bg: 'bg-amber-500/20', text: 'text-amber-400' },
          ].map(({ label, bg, text }) => (
            <div key={label} className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <div className={`w-6 h-5 rounded-md ${bg} ${text} text-[10px] font-black flex items-center justify-center shadow-sm`}>
                A1
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Seat Category Pricing Tags */}
        <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto pt-2">
          {Object.entries(SEAT_TYPE_PRICES).map(([type, price]) => (
            <div
              key={type}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-card border border-white/10 text-xs font-bold"
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: SEAT_TYPE_COLORS[type] || '#f59e0b' }} />
              <span className="text-slate-300">{type}</span>
              <span className="text-purple-400">₹{price}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom Seats Selection Status & Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 py-4 px-6 shadow-2xl backdrop-blur-2xl">
        <div className="container-app flex items-center justify-between">
          {selectedSeats.length === 0 ? (
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                No Seats Selected
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tap on seat rectangles above (e.g. A1, A2...) to reserve your tickets.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-400">Selected:</span>
                {selectedSeats.map((seat) => (
                  <span
                    key={seat.id}
                    className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-600/30 text-purple-200 border border-purple-500/40 flex items-center gap-1"
                  >
                    {seat.label || `${seat.row}${seat.number}`}
                    <button onClick={() => deselectSeat(seat.id)} className="hover:text-pink-400 ml-0.5">
                      <FiX size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Total Price: <span className="text-white font-black text-lg ml-1">₹{totalPrice.toFixed(0)}</span> ({selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''})
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            {selectedSeats.length > 0 && (
              <button onClick={handleClear} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200">
                Clear
              </button>
            )}

            <motion.button
              whileHover={selectedSeats.length > 0 ? { scale: 1.03 } : {}}
              whileTap={selectedSeats.length > 0 ? { scale: 0.97 } : {}}
              onClick={handleProceed}
              disabled={selectedSeats.length === 0}
              className={`px-7 py-3.5 text-xs font-black rounded-2xl flex items-center gap-2 shadow-2xl transition-all ${
                selectedSeats.length > 0
                  ? 'btn-primary glow-purple cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <span>Proceed to Payment</span>
              <FiArrowRight size={16} />
            </motion.button>
          </div>
        </div>
      </div>

    </div>
  );
}
