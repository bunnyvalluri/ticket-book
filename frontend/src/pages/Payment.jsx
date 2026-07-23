import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { bookingAPI } from '../services/api.js';
import { useBookingStore } from '../store/index.js';
import toast from 'react-hot-toast';
import { FiLoader, FiShield, FiCreditCard, FiCheckCircle, FiLock, FiSmartphone, FiGlobe } from 'react-icons/fi';

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, order, razorpayKeyId, isDemoMode } = location.state || {};
  const { clearBooking } = useBookingStore();
  const [loading, setLoading] = useState(false);
  const [demoProcessing, setDemoProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // UPI, CARD, NETBANKING

  useEffect(() => {
    if (!booking || !order) {
      navigate('/');
      return;
    }
  }, []);

  const initPayment = async () => {
    setLoading(true);

    if (isDemoMode || !razorpayKeyId) {
      setLoading(false);
      return;
    }

    const loaded = await loadRazorpay();
    if (!loaded) {
      toast.error('Razorpay SDK failed to load');
      setLoading(false);
      return;
    }

    const options = {
      key: razorpayKeyId,
      amount: order.amount * 100,
      currency: order.currency || 'INR',
      name: 'CineMax Ticketing',
      description: `Booking ${booking.bookingNumber}`,
      image: '/favicon.ico',
      order_id: order.id,
      handler: async (response) => {
        await confirmPayment(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );
      },
      prefill: {
        name: `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`,
        email: booking.user?.email || '',
      },
      theme: {
        color: '#7c3aed',
        backdrop_color: '#070710',
      },
      modal: {
        ondismiss: () => {
          navigate('/booking/failed', { state: { booking } });
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
    setLoading(false);
  };

  const confirmPayment = async (orderId, paymentId, signature) => {
    try {
      const res = await bookingAPI.confirmPayment({
        bookingId: booking.id,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });

      clearBooking();
      navigate('/booking/success', { state: { booking: res.data.data.booking } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment verification failed');
      navigate('/booking/failed', { state: { booking } });
    }
  };

  const handleDemoConfirm = async () => {
    setDemoProcessing(true);
    setTimeout(async () => {
      try {
        const fakeOrderId = 'order_demo_' + Date.now();
        const fakePaymentId = 'pay_demo_' + Date.now();
        const fakeSig = 'sig_demo_' + Date.now();

        const res = await bookingAPI.confirmPayment({
          bookingId: booking.id,
          razorpayOrderId: fakeOrderId,
          razorpayPaymentId: fakePaymentId,
          razorpaySignature: fakeSig,
        });

        clearBooking();
        toast.success('🎉 Payment successful!');
        navigate('/booking/success', { state: { booking: res.data.data.booking } });
      } catch (err) {
        // Fallback for static Vercel preview
        clearBooking();
        toast.success('🎉 Ticket Booked Successfully!');
        navigate('/booking/success', { state: { booking: { ...booking, status: 'CONFIRMED' } } });
      } finally {
        setDemoProcessing(false);
      }
    }, 1200);
  };

  if (!booking || !order) return null;

  return (
    <div className="min-h-screen py-10 bg-[#070710] pb-24">
      <div className="container-app max-w-4xl">
        
        {/* Wizard Steps Bar */}
        <div className="flex items-center justify-center gap-3 mb-10 text-xs font-bold">
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <FiCheckCircle size={12} /> 1. Seats
          </span>
          <span className="text-slate-600">→</span>
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <FiCheckCircle size={12} /> 2. Summary
          </span>
          <span className="text-slate-600">→</span>
          <span className="px-3.5 py-1.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 glow-purple">
            3. Payment
          </span>
          <span className="text-slate-600">→</span>
          <span className="px-3.5 py-1.5 rounded-full glass-card text-slate-500">
            4. Ticket Pass
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Payment Option Selector & Card Mockup */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/15 space-y-6 shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <FiLock className="text-purple-400" />
                    Secure Checkout
                  </h2>
                  <p className="text-xs text-slate-400">Order #{booking.bookingNumber}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                  🔒 256-Bit SSL Encrypted
                </span>
              </div>

              {/* Payment Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
                {[
                  { id: 'UPI', label: 'UPI / QR', icon: FiSmartphone },
                  { id: 'CARD', label: 'Cards', icon: FiCreditCard },
                  { id: 'NETBANKING', label: 'Net Banking', icon: FiGlobe },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === id
                        ? 'gradient-bg text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Card Visual Mockup Preview */}
              {paymentMethod === 'CARD' && (
                <div className="p-6 rounded-2xl gradient-bg-blue text-white shadow-2xl relative overflow-hidden space-y-6 border border-white/20">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono tracking-widest uppercase">CINEMAX PASS CARD</span>
                    <span className="font-black italic text-sm">VISA</span>
                  </div>
                  <div className="text-lg font-mono tracking-widest py-2">
                    •••• •••• •••• 4242
                  </div>
                  <div className="flex justify-between items-end text-xs font-mono">
                    <div>
                      <p className="text-[9px] uppercase opacity-75">Card Holder</p>
                      <p className="font-bold">{booking.user?.firstName} {booking.user?.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase opacity-75">Expires</p>
                      <p className="font-bold">12/28</p>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'UPI' && (
                <div className="p-6 rounded-2xl glass-card border border-white/10 text-center space-y-3">
                  <div className="flex justify-center gap-3 py-2">
                    <span className="px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 text-xs font-bold border border-purple-500/30">Google Pay</span>
                    <span className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 text-xs font-bold border border-blue-500/30">PhonePe</span>
                    <span className="px-3 py-1.5 rounded-xl bg-cyan-600/20 text-cyan-300 text-xs font-bold border border-cyan-500/30">Paytm UPI</span>
                  </div>
                  <p className="text-xs text-slate-400">Scan QR code or click pay to auto-route to your preferred UPI app.</p>
                </div>
              )}

              {paymentMethod === 'NETBANKING' && (
                <div className="p-6 rounded-2xl glass-card border border-white/10 text-center space-y-2">
                  <p className="text-xs text-slate-300 font-bold">Supported Major Banks:</p>
                  <p className="text-xs text-slate-400">HDFC Bank, ICICI Bank, SBI, Axis Bank, Kotak Mahindra</p>
                </div>
              )}

              {/* Confirm Action Button */}
              <div className="pt-2">
                {isDemoMode || !razorpayKeyId ? (
                  <button
                    onClick={handleDemoConfirm}
                    disabled={demoProcessing}
                    className="btn-primary w-full py-4 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-2xl glow-purple"
                  >
                    {demoProcessing ? (
                      <>
                        <FiLoader className="animate-spin" size={16} />
                        <span>Simulating Payment Authorization...</span>
                      </>
                    ) : (
                      <>
                        <FiCheckCircle size={16} />
                        <span>Complete Demo Payment (₹{booking.totalAmount.toFixed(0)})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={initPayment}
                    disabled={loading}
                    className="btn-primary w-full py-4 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-2xl glow-purple"
                  >
                    {loading ? (
                      <>
                        <FiLoader className="animate-spin" size={16} />
                        <span>Launching Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <FiCreditCard size={16} />
                        <span>Pay via Razorpay (₹{booking.totalAmount.toFixed(0)})</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Right Summary Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-3xl border border-white/15 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/10 pb-3">Booking Overview</h3>
              
              <div className="space-y-2 text-xs text-slate-300">
                <p className="font-black text-white text-sm">{booking.show?.movie?.title}</p>
                <p className="text-slate-400">{booking.show?.screen?.theatre?.name}</p>
                <p className="text-purple-300 font-bold">{booking.seats?.length} Seat(s) Reserved</p>
                <div className="border-t border-white/10 pt-3 flex justify-between font-extrabold text-white text-base">
                  <span>Total Due</span>
                  <span className="gradient-text font-black">₹{booking.totalAmount.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
