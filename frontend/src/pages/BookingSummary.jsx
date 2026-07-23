import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBookingStore } from '../store/index.js';
import { bookingAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import { FiTag, FiX, FiCheck, FiLoader, FiFilm, FiMapPin, FiClock, FiShield, FiArrowRight } from 'react-icons/fi';
import { MdEventSeat } from 'react-icons/md';

export default function BookingSummary() {
  const navigate = useNavigate();
  const { selectedSeats, currentShow, coupon, couponDiscount, setCoupon, clearCoupon } = useBookingStore();
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [proceeding, setProceeding] = useState(false);

  const show = currentShow;
  const ticketTotal = selectedSeats.reduce((s, seat) => s + (seat.price || 250), 0);
  const convFee = selectedSeats.length * 20;
  const gst = Math.round((ticketTotal - couponDiscount) * 0.18);
  const grandTotal = ticketTotal - couponDiscount + convFee + gst;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidating(true);
    try {
      const res = await bookingAPI.validateCoupon({ code: couponCode, totalAmount: ticketTotal });
      const { coupon: c, discount } = res.data.data;
      setCoupon(c, discount);
      toast.success(`🎉 Coupon "${c.code}" applied! You saved ₹${discount.toFixed(0)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setValidating(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedSeats.length || !show) return;
    setProceeding(true);

    try {
      const res = await bookingAPI.create({
        showId: show.id,
        seatIds: selectedSeats.map((s) => s.id),
        couponCode: coupon?.code,
      });

      const { booking, order, razorpayKeyId, isDemoMode } = res.data.data;
      navigate('/booking/payment', {
        state: { booking, order, razorpayKeyId, isDemoMode },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking creation failed. Please retry.');
    } finally {
      setProceeding(false);
    }
  };

  if (!selectedSeats.length || !show) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070710] p-6 text-center">
        <div className="glass-card p-10 rounded-3xl border border-white/10 space-y-4 max-w-md">
          <FiFilm className="text-5xl text-purple-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">No Seats Selected</h3>
          <p className="text-xs text-slate-400">Please choose a movie and select seats to view booking summary.</p>
          <button onClick={() => navigate('/')} className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl w-full">
            Browse Movies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 bg-[#070710] pb-24">
      <div className="container-app max-w-5xl">
        
        {/* Wizard Steps Bar */}
        <div className="flex items-center justify-center gap-3 mb-10 text-xs font-bold">
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <FiCheck size={12} /> 1. Seats
          </span>
          <span className="text-slate-600">→</span>
          <span className="px-3.5 py-1.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 glow-purple">
            2. Summary
          </span>
          <span className="text-slate-600">→</span>
          <span className="px-3.5 py-1.5 rounded-full glass-card text-slate-500">
            3. Payment
          </span>
          <span className="text-slate-600">→</span>
          <span className="px-3.5 py-1.5 rounded-full glass-card text-slate-500">
            4. Ticket Pass
          </span>
        </div>

        <h1 className="text-3xl font-black text-white mb-8">
          Order Summary
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Voucher Stub Card */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Perforated Movie Ticket Voucher Stub */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="ticket-stub p-6 md:p-8 space-y-6 border border-white/10 shadow-2xl"
            >
              <div className="flex gap-6 items-center border-b border-white/10 pb-6">
                <img
                  src={show.movie?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200'}
                  alt={show.movie?.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200';
                  }}
                  className="w-24 h-36 object-cover rounded-2xl shadow-md border border-white/10 shrink-0"
                />
                <div className="space-y-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-600/30 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                    {show.format || 'IMAX 3D'}
                  </span>
                  <h2 className="text-2xl font-black text-white leading-tight">{show.movie?.title}</h2>
                  <div className="space-y-1 text-xs text-slate-300">
                    <p className="flex items-center gap-2">
                      <FiMapPin className="text-purple-400 shrink-0" size={14} />
                      <span>{show.screen?.theatre?.name}, {show.screen?.theatre?.city}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <FiClock className="text-pink-400 shrink-0" size={14} />
                      <span>{new Date(show.startTime).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Seats Badges */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MdEventSeat className="text-purple-400" size={16} />
                  Selected Seats ({selectedSeats.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.map((seat) => (
                    <span
                      key={seat.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600/30 text-purple-200 border border-purple-500/40"
                    >
                      {seat.label || `${seat.row}${seat.number}`} • ₹{seat.price || 250}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Promo Code / Coupon Applicator Box */}
            <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FiTag className="text-amber-400" />
                Apply Discount Coupon
              </h3>

              {coupon ? (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-emerald-300">Coupon "{coupon.code}" Applied</span>
                    <p className="text-[11px] text-emerald-400">Discount Saved: ₹{couponDiscount.toFixed(0)}</p>
                  </div>
                  <button onClick={clearCoupon} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400">
                    <FiX size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon Code (e.g. FIRST50)"
                    className="glass-input text-xs px-4 py-3 rounded-2xl w-full outline-none uppercase font-mono font-bold"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={validating || !couponCode.trim()}
                    className="btn-secondary shrink-0 px-5 py-3 text-xs font-bold rounded-2xl"
                  >
                    {validating ? <FiLoader className="animate-spin" /> : 'Apply'}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Price Breakdown Invoice Card */}
          <div className="space-y-6">
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/15 space-y-5 shadow-2xl">
              <h3 className="text-base font-extrabold text-white border-b border-white/10 pb-3">Payment Breakdown</h3>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Ticket Base Price ({selectedSeats.length} Seats)</span>
                  <span className="font-bold text-white">₹{ticketTotal}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Coupon Discount</span>
                    <span>- ₹{couponDiscount.toFixed(0)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Convenience Fee</span>
                  <span className="font-bold text-white">₹{convFee}</span>
                </div>

                <div className="flex justify-between">
                  <span>Integrated GST (18%)</span>
                  <span className="font-bold text-white">₹{gst.toFixed(0)}</span>
                </div>

                <div className="border-t border-white/10 pt-4 flex justify-between items-center text-sm font-extrabold text-white">
                  <span>Grand Total</span>
                  <span className="text-xl gradient-text font-black">₹{grandTotal.toFixed(0)}</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleProceedToPayment}
                disabled={proceeding}
                className="btn-primary w-full py-4 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-2xl glow-purple mt-4"
              >
                {proceeding ? (
                  <>
                    <FiLoader className="animate-spin" size={16} />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Pay ₹{grandTotal.toFixed(0)}</span>
                    <FiArrowRight size={16} />
                  </>
                )}
              </motion.button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 pt-2">
                <FiShield size={12} className="text-emerald-400" />
                <span>256-Bit SSL Encrypted & Instant Cancellation Eligible</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
