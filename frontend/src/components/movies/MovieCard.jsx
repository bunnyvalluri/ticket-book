import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiStar, FiClock, FiHeart, FiFilm } from 'react-icons/fi';
import { HiOutlineTicket } from 'react-icons/hi2';
import { useAuthStore } from '../../store/index.js';
import { movieAPI } from '../../services/api.js';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function MovieCard({ movie, index = 0 }) {
  const { isAuthenticated } = useAuthStore();
  const [wishlisted, setWishlisted] = useState(movie.userWishlisted || false);
  const [loading, setLoading] = useState(false);

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist');
      return;
    }

    setLoading(true);
    try {
      await movieAPI.toggleWishlist(movie.id);
      setWishlisted(!wishlisted);
      toast.success(wishlisted ? 'Removed from wishlist' : '❤️ Saved to wishlist');
    } catch {
      toast.error('Failed to update wishlist');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    NOW_SHOWING: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Now Showing' },
    COMING_SOON: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Coming Soon' },
    ARCHIVED: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Archived' },
  };
  const status = statusColors[movie.status] || statusColors.NOW_SHOWING;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.4 }}
    >
      <Link to={`/movies/${movie.slug}`} className="block movie-card group">
        
        {/* Poster Wrapper */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-slate-900">
          <img
            src={movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80'}
            alt={movie.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
            }}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />

          {/* Dark Glass Overlay on Hover */}
          <div className="movie-card-overlay" />

          {/* Status Badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-md ${status.bg} ${status.text} ${status.border}`}>
              {status.label}
            </span>
          </div>

          {/* Wishlist Button */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleWishlist}
            disabled={loading}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center glass-card border border-white/20 shadow-lg transition-all"
            style={{
              background: wishlisted ? 'rgba(236,72,153,0.85)' : 'rgba(15,15,30,0.6)',
            }}
          >
            <FiHeart
              size={15}
              className={wishlisted ? 'fill-white text-white' : 'text-white'}
            />
          </motion.button>

          {/* Rating Badge */}
          {movie.imdbRating && (
            <div className="absolute top-12 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md glass-card text-[11px] font-bold text-white border border-white/10">
              <FiStar className="fill-yellow-400 text-yellow-400" size={11} />
              <span>{movie.imdbRating}</span>
            </div>
          )}

          {/* Format Tags */}
          <div className="absolute bottom-16 left-3 right-3 z-10 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-600/80 text-white backdrop-blur-sm">
              IMAX 3D
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-pink-600/80 text-white backdrop-blur-sm">
              Dolby Atmos
            </span>
          </div>

          {/* Slide-Up Book Button on Hover */}
          <div className="absolute inset-x-0 bottom-0 p-3 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <div className="btn-primary py-2.5 text-center text-xs font-bold rounded-xl w-full flex items-center justify-center gap-1.5 shadow-xl">
              <HiOutlineTicket size={14} />
              Book Seats
            </div>
          </div>
        </div>

        {/* Info Content */}
        <div className="pt-3 px-1">
          <h3 className="font-bold text-sm text-slate-100 group-hover:text-purple-400 transition-colors line-clamp-1">
            {movie.title}
          </h3>
          
          <div className="flex items-center justify-between mt-1 text-xs">
            {movie.duration ? (
              <span className="flex items-center gap-1 text-slate-400">
                <FiClock size={12} className="text-purple-400" />
                {Math.floor(movie.duration / 60)}h {movie.duration % 60}m
              </span>
            ) : <span />}

            {movie.genres?.[0] && (
              <span className="font-semibold text-purple-400 text-[11px]">
                {movie.genres[0].genre?.name}
              </span>
            )}
          </div>
        </div>

      </Link>
    </motion.div>
  );
}
