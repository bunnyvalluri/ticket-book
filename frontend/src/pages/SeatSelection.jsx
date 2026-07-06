import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { showAPI, bookingAPI } from '../services/api.js';
import { useBookingStore, useAuthStore } from '../store/index.js';
import { useSocket } from '../context/SocketContext.jsx';
import toast from 'react-hot-toast';
import { FiInfo, FiClock, FiZoomIn, FiZoomOut, FiArrowRight, FiX } from 'react-icons/fi';

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
  const [realtimeLocks, setRealtimeLocks] = useState(new Map()); // seatId -> userId
  const [timeLeft, setTimeLeft] = useState(null);
  const [sessionStart] = useState(Date.now());

  // Fetch show with seat layout
  const { data, isLoading, error } = useQuery({
    queryKey: ['show', showId],
    queryFn: () => showAPI.getById(showId),
  });

  const show = data?.data?.data?.show;

  useEffect(() => {
    if (show) setCurrentShow(show);
  }, [show]);

  // Session countdown (10 minutes)
  useEffect(() => {
    const TIMEOUT = 10 * 60 * 1000;
    const tick = setInterval(() => {
      const elapsed = Date.now() - sessionStart;
      const remaining = TIMEOUT - elapsed;
      if (remaining <= 0) {
        clearSeats();
        toast.error('Session expired. Please select seats again.');
        navigate(-1);
      } else {
        setTimeLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Socket.io real-time
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
        toast.error('Maximum 10 seats per booking');
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
    navigate('/booking/summary');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Group seats by row
  const seatsByRow = {};
  show?.screen?.seats?.forEach((seat) => {
    if (!seatsByRow[seat.row]) seatsByRow[seat.row] = [];
    seatsByRow[seat.row].push(seat);
  });

  const totalPrice = selectedSeats.reduce((s, seat) => s + (seat.price || SEAT_TYPE_PRICES[seat.seatType] || 200), 0);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p style={{ color: '#606080' }}>Loading seat map...</p>
      </div>
    </div>
  );

  if (error || !show) return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: '#ef4444' }}>Show not found</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="glass sticky top-16 z-30 py-3">
        <div className="container-app flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg" style={{ color: '#f0f0f8' }}>{show.movie?.title}</h1>
            <p className="text-xs" style={{ color: '#606080' }}>
              {show.screen?.theatre?.name} • {show.screen?.name} • {new Date(show.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          {/* Session timer */}
          {timeLeft && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono font-bold ${
              timeLeft < 60 ? 'text-red-400' : 'text-yellow-400'
            }`} style={{ background: '#1a1a2e', border: '1px solid #2d2d4a' }}>
              <FiClock size={14} />
              {formatTime(timeLeft)}
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="btn-ghost p-2 rounded-lg">
              <FiZoomOut size={16} />
            </button>
            <span className="text-xs" style={{ color: '#606080' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="btn-ghost p-2 rounded-lg">
              <FiZoomIn size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="container-app py-8">
        {/* Screen indicator */}
        <div className="overflow-x-auto py-4">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}>
            {/* Screen arc */}
            <div className="screen-arc mx-auto mb-8" style={{ width: '60%' }} />

            {/* Seat grid */}
            <div className="flex flex-col gap-2 items-center">
              {Object.entries(seatsByRow).map(([row, seats]) => (
                <div key={row} className="flex items-center gap-1.5">
                  {/* Row label */}
                  <span className="w-6 text-center text-xs font-bold" style={{ color: '#606080' }}>{row}</span>

                  {/* Seats */}
                  <div className="flex gap-1.5">
                    {seats.map((seat, i) => {
                      const status = getSeatStatus(seat);
                      const seatColor = SEAT_TYPE_COLORS[seat.seatType] || '#64748b';

                      return (
                        <motion.button
                          key={seat.id}
                          whileHover={status === 'available' ? { scale: 1.2, zIndex: 10 } : {}}
                          whileTap={status === 'available' ? { scale: 0.9 } : {}}
                          onClick={() => handleSeatClick(seat)}
                          title={`${seat.label} - ${seat.seatType} - ₹${seat.price || SEAT_TYPE_PRICES[seat.seatType]}`}
                          className={`relative w-6 h-5 rounded-t-lg text-[8px] font-bold flex items-center justify-center transition-all ${
                            status === 'available'
                              ? 'cursor-pointer hover:opacity-90'
                              : 'cursor-not-allowed'
                          }`}
                          style={{
                            background:
                              status === 'selected'
                                ? '#7c3aed'
                                : status === 'booked'
                                ? 'rgba(239,68,68,0.2)'
                                : status === 'locked'
                                ? 'rgba(245,158,11,0.25)'
                                : `${seatColor}20`,
                            border: `1px solid ${
                              status === 'selected'
                                ? '#9d6ff0'
                                : status === 'booked'
                                ? 'rgba(239,68,68,0.4)'
                                : status === 'locked'
                                ? 'rgba(245,158,11,0.5)'
                                : `${seatColor}50`
                            }`,
                          }}
                        >
                          {status === 'selected' && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-white"
                            >✓</motion.span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Row label right */}
                  <span className="w-6 text-center text-xs font-bold" style={{ color: '#606080' }}>{row}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap justify-center gap-6">
          {[
            { label: 'Available', color: '#1e1e35', border: '#3d3d5c' },
            { label: 'Selected', color: '#7c3aed', border: '#9d6ff0' },
            { label: 'Booked', color: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)' },
            { label: 'Locked', color: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.5)' },
          ].map(({ label, color, border }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-5 h-4 rounded-t-md" style={{ background: color, border: `1px solid ${border}` }} />
              <span className="text-xs" style={{ color: '#a0a0c0' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Seat type pricing */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {Object.entries(SEAT_TYPE_PRICES).map(([type, price]) => (
            <div key={type} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: '#1a1a2e', border: `1px solid ${SEAT_TYPE_COLORS[type]}40` }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: SEAT_TYPE_COLORS[type] + '50', border: `1px solid ${SEAT_TYPE_COLORS[type]}` }} />
              <span className="text-xs" style={{ color: '#a0a0c0' }}>{type}</span>
              <span className="text-xs font-bold" style={{ color: SEAT_TYPE_COLORS[type] }}>₹{price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom booking bar */}
      <AnimatePresence>
        {selectedSeats.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 glass border-t"
            style={{ borderColor: '#2d2d4a' }}
          >
            <div className="container-app py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {selectedSeats.map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => deselectSeat(seat.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa' }}
                    >
                      {seat.label}
                      <FiX size={10} />
                    </button>
                  ))}
                </div>
                <p className="text-sm" style={{ color: '#606080' }}>
                  {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} • ₹{totalPrice.toFixed(0)} (excl. charges)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={clearSeats} className="btn-ghost px-4 py-2.5 text-sm rounded-lg">
                  Clear
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleProceed}
                  className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 rounded-xl"
                >
                  Proceed
                  <FiArrowRight size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
