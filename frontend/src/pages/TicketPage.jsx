import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  FiPrinter, FiDownload, FiArrowLeft, FiClock, 
  FiMapPin, FiTv, FiLayers, FiAlertCircle, FiLoader, 
  FiCheckCircle, FiShare2, FiCalendar, FiFilm 
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { bookingAPI } from '../services/api.js';

export default function TicketPage() {
  const { id } = useParams();
  const [downloading, setDownloading] = useState(false);

  const { data: bookingResponse, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingAPI.getById(id),
  });

  const booking = bookingResponse?.data?.data?.booking;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await bookingAPI.downloadTicket(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cinemax_pass_${booking?.bookingNumber || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Digital Ticket PDF Downloaded! 🎟️');
    } catch (err) {
      toast.error('Failed to download ticket PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070710]">
        <div className="text-center space-y-3">
          <FiLoader size={40} className="animate-spin text-purple-400 mx-auto" />
          <p className="text-xs font-bold text-slate-400">Rendering Digital Boarding Pass...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#070710]">
        <FiAlertCircle size={56} className="text-pink-500 mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Ticket Not Available</h2>
        <p className="text-xs text-slate-400 mb-6">Could not locate booking records.</p>
        <Link to="/bookings" className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl">My Bookings</Link>
      </div>
    );
  }

  const show = booking.show;
  const movie = show?.movie;
  const screen = show?.screen;
  const theatre = screen?.theatre;

  const showDate = show?.startTime ? format(parseISO(show.startTime), 'EEEE, d MMMM yyyy') : '';
  const showTime = show?.startTime ? format(parseISO(show.startTime), 'hh:mm a') : '';

  return (
    <div className="min-h-screen pb-20 pt-8 bg-[#070710] print:p-0 print:bg-white">
      <div className="container-app max-w-2xl space-y-6">
        
        {/* Navigation & Action Bar */}
        <div className="flex justify-between items-center print:hidden">
          <Link to="/bookings" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <FiArrowLeft /> Back to My Bookings
          </Link>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold glass-card text-slate-200 hover:text-white"
            >
              <FiPrinter size={14} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="btn-primary flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold shadow-lg glow-purple"
            >
              <FiDownload size={14} /> Download PDF
            </button>
          </div>
        </div>

        {/* Digital Ticket Pass Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ticket-stub overflow-hidden border border-white/20 shadow-2xl rounded-3xl"
        >
          {/* Header Banner Image */}
          <div className="relative h-48 overflow-hidden bg-slate-900">
            <img
              src={movie?.bannerUrl || movie?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1000'}
              alt={movie?.title}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1000';
              }}
              className="w-full h-full object-cover brightness-50 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141428] via-transparent to-transparent" />
            
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30 backdrop-blur-md flex items-center gap-1">
                <FiCheckCircle size={12} /> CONFIRMED TICKET
              </span>
            </div>

            <div className="absolute bottom-4 left-6 right-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">{movie?.genres?.[0]?.genre?.name || 'Action Movie'}</span>
              <h1 className="text-2xl font-black text-white leading-tight">{movie?.title}</h1>
            </div>
          </div>

          {/* Ticket Information Section */}
          <div className="p-6 md:p-8 space-y-6">
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date & Showtime</p>
                <p className="font-extrabold text-white text-sm mt-0.5">{showTime}</p>
                <p className="text-slate-300 text-[11px]">{showDate}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cinema & Screen</p>
                <p className="font-extrabold text-white text-sm mt-0.5">{theatre?.name}</p>
                <p className="text-purple-300 text-[11px] font-semibold">{screen?.name} • {show?.format || 'IMAX 3D'}</p>
              </div>
            </div>

            {/* Perforated Line */}
            <div className="border-t border-dashed border-white/20 pt-4" />

            {/* Seats Grid */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reserved Seat Numbers</p>
              <div className="flex flex-wrap gap-2">
                {booking.seats?.map((seat) => (
                  <span key={seat.id} className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-purple-600/30 text-purple-200 border border-purple-500/40">
                    {seat.label || `${seat.row}${seat.number}`}
                  </span>
                ))}
              </div>
            </div>

            {/* QR Code & Barcode Mockup */}
            <div className="p-6 rounded-2xl glass-card border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Booking Reference</p>
                <p className="font-mono font-black text-lg text-white tracking-widest">{booking.bookingNumber}</p>
                <p className="text-[10px] text-slate-500 mt-1">Show this QR code at cinema entry counter for entry validation.</p>
              </div>

              {/* Generated QR visual */}
              <div className="w-28 h-28 bg-white p-2 rounded-2xl shrink-0 shadow-lg flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="#ffffff" />
                  <path d="M10,10 h30 v30 h-30 z M55,10 h35 v35 h-35 z M10,55 h35 v35 h-35 z M55,55 h20 v20 h-20 z M80,80 h10 v10 h-10 z" fill="#070710" />
                </svg>
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </div>
  );
}
