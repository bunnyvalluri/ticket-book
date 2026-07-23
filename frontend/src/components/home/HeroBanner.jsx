import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlay, FiStar, FiChevronLeft, FiChevronRight, FiClock, FiCalendar, FiX, FiFilm, FiCheckCircle } from 'react-icons/fi';

export default function HeroBanner({ movies = [] }) {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (movies.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % movies.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [movies.length]);

  const movie = movies[current];
  if (!movie) return null;

  return (
    <div className="relative w-full overflow-hidden min-h-[580px] lg:min-h-[660px] flex items-center justify-center">
      
      {/* Background Poster Image Carousel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          className="absolute inset-0 z-0"
        >
          <img
            src={movie.bannerUrl || movie.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1400&q=80'}
            alt={movie.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1400&q=80';
            }}
            className="w-full h-full object-cover"
          />
          
          {/* Multi-layer Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070710] via-[#070710]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070710] via-[#070710]/40 to-transparent" />
          <div className="absolute inset-0 bg-radial-vignette opacity-70" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Area */}
      <div className="relative z-10 container-app w-full py-16">
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="space-y-4"
            >
              
              {/* Badges & Tags */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40 backdrop-blur-md">
                  {movie.ageRating || 'U/A'}
                </span>
                
                {movie.genres?.[0] && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-600/20 text-pink-300 border border-pink-500/30 backdrop-blur-md">
                    {movie.genres[0].genre?.name}
                  </span>
                )}

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 backdrop-blur-md flex items-center gap-1">
                  <FiFilm size={12} />
                  IMAX 3D & 4DX
                </span>

                {movie.isTrending && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md animate-pulse">
                    🔥 #1 Trending
                  </span>
                )}
              </div>

              {/* Movie Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                {movie.title}
              </h1>

              {/* Tagline */}
              {movie.tagline && (
                <p className="text-base sm:text-lg font-semibold gradient-text italic">
                  "{movie.tagline}"
                </p>
              )}

              {/* Metadata Stats */}
              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-300 font-medium">
                {movie.imdbRating && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-card">
                    <FiStar className="fill-yellow-400 text-yellow-400" size={15} />
                    <span className="font-bold text-white text-sm">{movie.imdbRating}</span>
                    <span className="text-slate-400">/10 IMDb</span>
                  </div>
                )}
                {movie.duration && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-card">
                    <FiClock className="text-purple-400" size={15} />
                    <span>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
                  </div>
                )}
                {movie.releaseDate && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-card">
                    <FiCalendar className="text-pink-400" size={15} />
                    <span>{new Date(movie.releaseDate).getFullYear()} Release</span>
                  </div>
                )}
              </div>

              {/* Synopsis */}
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300 line-clamp-3 max-w-xl">
                {movie.synopsis}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  to={`/movies/${movie.slug}`}
                  className="btn-primary px-8 py-3.5 text-sm font-bold rounded-2xl flex items-center gap-2 shadow-2xl glow-purple"
                >
                  <span>🎫 Book Tickets Now</span>
                </Link>

                {movie.trailerUrl && (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="px-6 py-3.5 rounded-2xl font-bold text-sm text-white glass-card hover:border-purple-500/50 hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <FiPlay size={16} className="fill-white text-white" />
                    Watch Official Trailer
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Carousel Navigation Controls */}
      {movies.length > 1 && (
        <>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 glass-card px-4 py-2 rounded-full">
            {movies.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`transition-all rounded-full ${
                  i === current ? 'w-8 h-2.5 gradient-bg' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrent((c) => (c - 1 + movies.length) % movies.length)}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl glass-card flex items-center justify-center z-20 text-white hover:border-purple-500/50 transition-all"
          >
            <FiChevronLeft size={22} />
          </button>

          <button
            onClick={() => setCurrent((c) => (c + 1) % movies.length)}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl glass-card flex items-center justify-center z-20 text-white hover:border-purple-500/50 transition-all"
          >
            <FiChevronRight size={22} />
          </button>
        </>
      )}

      {/* Video Trailer Modal */}
      <AnimatePresence>
        {isPlaying && movie.trailerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setIsPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden glass-card relative border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsPlaying(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:bg-red-500/20"
              >
                <FiX size={20} />
              </button>
              <iframe
                src={movie.trailerUrl?.replace('watch?v=', 'embed/') + '?autoplay=1'}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay"
                title={`${movie.title} Trailer`}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
