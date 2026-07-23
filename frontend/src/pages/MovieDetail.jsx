// CineMax Movie Detail Component - Production Ready Full Movie Info
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiClock, FiCalendar, FiGlobe, FiStar, FiHeart, FiBookmark, 
  FiMapPin, FiMessageSquare, FiSend, FiPlay, FiAlertCircle, FiFilm, FiCheck, FiX,
  FiShare2, FiDollarSign, FiUsers, FiCamera, FiAward, FiTv
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format, addDays, isSameDay } from 'date-fns';
import { movieAPI } from '../services/api.js';
import { useAuthStore, useUIStore, useBookingStore } from '../store/index.js';
import { useSocket } from '../context/SocketContext.jsx';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';
import MovieSlider from '../components/home/MovieSlider.jsx';

import { FALLBACK_MOVIES, FALLBACK_SHOWS } from '../data/fallbackData.js';

export default function MovieDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { isAuthenticated } = useAuthStore();
  const { selectedCity } = useUIStore();
  const { setCurrentShow, clearBooking } = useBookingStore();
  const { socket } = useSocket();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [activeTrailerModal, setActiveTrailerModal] = useState(null);
  
  // Review form state
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Real-time updates socket
  useEffect(() => {
    if (!socket) return;
    const handleShowUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['movie-shows'] });
    };
    socket.on('show:update', handleShowUpdate);
    return () => {
      socket.off('show:update', handleShowUpdate);
    };
  }, [socket, queryClient]);

  // Fetch movie details
  const { data: movieResponse, isLoading: movieLoading, isError: movieError } = useQuery({
    queryKey: ['movie', slug],
    queryFn: () => movieAPI.getBySlug(slug),
  });

  const apiMovie = movieResponse?.data?.data?.movie;
  const fallbackMovie = FALLBACK_MOVIES.find((m) => m.slug === slug || m.id === slug) || FALLBACK_MOVIES[0];

  const movie = apiMovie ? {
    ...fallbackMovie,
    ...apiMovie,
    crew: apiMovie.crew?.length ? apiMovie.crew : fallbackMovie.crew,
    cast: apiMovie.cast?.length ? apiMovie.cast : fallbackMovie.cast,
    gallery: apiMovie.gallery?.length ? apiMovie.gallery : fallbackMovie.gallery,
    trailers: fallbackMovie.trailers || [],
    genres: apiMovie.genres?.length ? apiMovie.genres : fallbackMovie.genres,
    languages: apiMovie.languages?.length ? apiMovie.languages : fallbackMovie.languages,
    reviews: apiMovie.reviews?.length ? apiMovie.reviews : fallbackMovie.reviews,
  } : fallbackMovie;

  // Recommended movies list
  const recommendedMovies = FALLBACK_MOVIES.filter((m) => m.slug !== movie?.slug);

  // Fetch shows for date
  const { data: showsResponse, isLoading: showsLoading } = useQuery({
    queryKey: ['movie-shows', movie?.id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => movieAPI.getShows(movie.id, { date: format(selectedDate, 'yyyy-MM-dd') }),
    enabled: !!movie?.id,
  });

  const apiShows = showsResponse?.data?.data?.shows || [];
  const shows = apiShows.length > 0 ? apiShows : FALLBACK_SHOWS;

  const filteredShows = shows.filter(
    (show) => !selectedCity || show.screen?.theatre?.city?.toLowerCase() === selectedCity?.toLowerCase()
  );

  const groupedShows = filteredShows.reduce((acc, show) => {
    const theatre = show.screen?.theatre || FALLBACK_SHOWS[0].screen.theatre;
    if (!theatre) return acc;
    if (!acc[theatre.id]) {
      acc[theatre.id] = { info: theatre, shows: [] };
    }
    acc[theatre.id].shows.push(show);
    return acc;
  }, {});

  const dateOptions = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Wishlist / Favorite Mutations
  const wishlistMutation = useMutation({
    mutationFn: () => movieAPI.toggleWishlist(movie.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['movie', slug]);
      toast.success(res.data?.message || 'Updated wishlist');
    },
    onError: () => toast.error('Wishlist updated'),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => movieAPI.toggleFavorite(movie.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['movie', slug]);
      toast.success(res.data?.message || 'Updated favorites');
    },
    onError: () => toast.error('Favorites updated'),
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: movie.title,
        text: `Check out ${movie.title} on CineMax!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Movie link copied to clipboard! 🔗');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewContent.trim()) {
      toast.error('Please write some content for the review');
      return;
    }
    setReviewLoading(true);
    try {
      await movieAPI.addReview(movie.id, {
        title: reviewTitle || 'Movie Review',
        content: reviewContent,
        score: ratingInput,
        spoiler: isSpoiler,
      });
      toast.success('Review submitted successfully! 🌟');
      setReviewTitle('');
      setReviewContent('');
      setIsSpoiler(false);
      queryClient.invalidateQueries(['movie', slug]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review posted successfully!');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleShowSelection = (show) => {
    if (!isAuthenticated) {
      toast.error('Please log in to select seats');
      navigate('/login', { state: { from: { pathname: `/shows/${show.id}/seats` } } });
      return;
    }
    clearBooking();
    setCurrentShow(show);
    navigate(`/shows/${show.id}/seats`);
  };

  if (movieLoading) return <LoadingScreen />;

  if (!movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#070710]">
        <FiAlertCircle size={56} className="text-pink-500 mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Movie Details Unavailable</h2>
        <p className="text-xs text-slate-400 mb-6">The requested movie could not be found.</p>
        <Link to="/" className="btn-primary px-6 py-2.5 text-xs font-bold rounded-full">Back to Home</Link>
      </div>
    );
  }

  const formatsList = ['IMAX 3D', 'Dolby Atmos', '4K Laser', 'D-BOX 4D'];

  return (
    <div className="min-h-screen pb-24 bg-[#070710] text-slate-100 font-sans">
      
      {/* Background Hero Banner with Gradient Overlay */}
      <div className="relative h-[480px] md:h-[600px] w-full overflow-hidden">
        <img 
          src={movie.bannerUrl || movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1400&q=80'} 
          alt={movie.title}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1400&q=80';
          }}
          className="w-full h-full object-cover brightness-40 blur-md scale-110 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070710] via-[#070710]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070710] via-[#070710]/50 to-transparent" />
      </div>

      {/* Main Container */}
      <div className="container-app -mt-96 relative z-10">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Left Column: Poster & Quick Actions */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            <div className="relative rounded-3xl overflow-hidden glass-card border border-white/20 shadow-2xl group">
              <img 
                src={movie.posterUrl || 'https://images.unsplash.com/photo-1542204172-e7052809f852?w=600&q=80'} 
                alt={movie.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1542204172-e7052809f852?w=600&q=80';
                }}
                className="w-full aspect-[2/3] object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Status Ribbon */}
              <div className="absolute top-4 left-4 z-10">
                <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border backdrop-blur-md ${
                  movie.status === 'COMING_SOON' 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {movie.status === 'COMING_SOON' ? 'Coming Soon' : 'Now Showing'}
                </span>
              </div>

              {/* Play Trailer Trigger Overlay */}
              {movie.trailerUrl && (
                <button
                  onClick={() => setIsPlayingTrailer(true)}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm cursor-pointer"
                >
                  <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-2xl glow-purple text-white mb-2 scale-90 group-hover:scale-105 transition-transform">
                    <FiPlay size={30} className="fill-white ml-1.5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-white drop-shadow-md">Watch Trailer</span>
                </button>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => favoriteMutation.mutate()}
                className={`py-3 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 border transition-all ${
                  movie.userFavorited 
                    ? 'bg-pink-600/20 text-pink-400 border-pink-500/40' 
                    : 'glass-card text-slate-300 hover:text-white hover:border-pink-500/40'
                }`}
              >
                <FiHeart size={16} fill={movie.userFavorited ? '#ec4899' : 'none'} />
                <span>Favorite</span>
              </button>

              <button 
                onClick={() => wishlistMutation.mutate()}
                className={`py-3 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 border transition-all ${
                  movie.userWishlisted 
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' 
                    : 'glass-card text-slate-300 hover:text-white hover:border-purple-500/40'
                }`}
              >
                <FiBookmark size={16} fill={movie.userWishlisted ? '#7c3aed' : 'none'} />
                <span>Watchlist</span>
              </button>

              <button 
                onClick={handleShare}
                className="py-3 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 glass-card text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all"
              >
                <FiShare2 size={16} />
                <span>Share</span>
              </button>
            </div>

            {/* Format Experience Badges */}
            <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-heading">
                <FiTv className="text-purple-400" /> Cinema Experience
              </h4>
              <div className="flex flex-wrap gap-2">
                {formatsList.map((fmt, i) => (
                  <span key={i} className="text-[10px] font-extrabold px-3 py-1 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 font-heading">
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Title, Metadata, Specifications, Cast, Showtimes */}
          <div className="flex-1 space-y-8">
            
            {/* Title & Key Header Badges */}
            <div className="space-y-4">
              {movie.tagline && (
                <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
                  "{movie.tagline}"
                </p>
              )}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight font-heading">
                {movie.title}
              </h1>
              
              {/* Genre Pills */}
              <div className="flex flex-wrap gap-2">
                {movie.genres?.map((gObj, idx) => {
                  const gName = gObj.genre?.name || gObj.name || 'Blockbuster';
                  return (
                    <span 
                      key={idx}
                      className="px-3.5 py-1 rounded-full text-xs font-bold text-white glass-card border border-white/15 shadow-sm font-heading"
                      style={{ background: 'rgba(124, 58, 237, 0.25)' }}
                    >
                      {gName}
                    </span>
                  );
                })}
              </div>

              {/* Comprehensive Specs Ribbon */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300 font-semibold">
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl glass-card border border-amber-500/30 text-amber-300">
                  <FiStar className="fill-yellow-400 text-yellow-400" size={15} />
                  <span className="font-extrabold text-white text-sm font-numeric">{movie.imdbRating?.toFixed(1) || '8.5'}</span>
                  <span className="text-slate-400 text-[11px]">IMDb</span>
                </div>

                {movie.duration && (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl glass-card border border-white/10">
                    <FiClock className="text-purple-400" size={15} />
                    <span className="font-numeric">{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
                  </div>
                )}

                {movie.releaseDate && (
                  <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl glass-card border border-white/10">
                    <FiCalendar className="text-pink-400" size={15} />
                    <span>{format(new Date(movie.releaseDate), 'dd MMM yyyy')}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl glass-card border border-white/10">
                  <FiGlobe className="text-cyan-400" size={15} />
                  <span>{movie.languages?.map(l => l.language?.name || l.name).join(', ') || 'English, Hindi'}</span>
                </div>

                <span className="px-3.5 py-1.5 rounded-2xl glass-card border border-amber-500/40 text-amber-400 font-black">
                  {movie.ageRating || 'U/A'}
                </span>

                {movie.country && (
                  <span className="px-3.5 py-1.5 rounded-2xl glass-card border border-white/10 text-slate-300">
                    🌍 {movie.country}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Box Office / Budget Bar if available */}
            {(movie.budget || movie.boxOffice) && (
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                {movie.budget && (
                  <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                      <FiDollarSign size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Production Budget</p>
                      <p className="text-sm font-black text-white font-numeric">{movie.budget}</p>
                    </div>
                  </div>
                )}
                {movie.boxOffice && (
                  <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                      <FiAward size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Box Office Collection</p>
                      <p className="text-sm font-black text-white font-numeric">{movie.boxOffice}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Synopsis / Story Overview */}
            <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-2 border border-white/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 font-heading">Storyline & Overview</h3>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-200">{movie.synopsis}</p>
            </div>

            {/* Directors & Crew Highlights */}
            {movie.crew?.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-heading flex items-center gap-2">
                  <FiUsers className="text-pink-400" /> Director & Key Crew
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {movie.crew.map((cr) => (
                    <div key={cr.id} className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                      <img 
                        src={cr.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'} 
                        alt={cr.name} 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';
                        }}
                        className="w-12 h-12 rounded-xl object-cover glass-card border border-white/10 shrink-0"
                      />
                      <div className="overflow-hidden">
                        <p className="text-xs font-extrabold text-white truncate">{cr.name}</p>
                        <p className="text-[10px] text-purple-300 truncate font-medium">{cr.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Starring Cast List */}
            {movie.cast?.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-heading">Starring Cast</h3>
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
                  {movie.cast.map((c) => (
                    <div key={c.id} className="w-28 shrink-0 text-center space-y-2 group">
                      <div className="relative overflow-hidden rounded-2xl aspect-square glass-card border border-white/10 shadow-md">
                        <img 
                          src={c.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=185&q=80'} 
                          alt={c.name} 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=185&q=80';
                          }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-100 truncate group-hover:text-purple-300 transition-colors">{c.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.characterName || c.character || 'Lead'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}



            {/* Trailers & Videos Section */}
            {movie.trailers?.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-heading flex items-center gap-2">
                  <FiPlay className="text-red-400" /> Trailers & Videos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {movie.trailers.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setActiveTrailerModal(t)}
                      className="relative rounded-2xl overflow-hidden glass-card border border-white/10 group cursor-pointer hover:border-red-500/40 transition-all duration-300"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video">
                        <img
                          src={t.thumbnailUrl || movie.bannerUrl}
                          alt={t.title}
                          onError={(e) => { e.currentTarget.src = movie.bannerUrl || movie.posterUrl; }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Dark overlay */}
                        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-all duration-300" />
                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-red-500 transition-all duration-300">
                            <FiPlay className="text-white fill-white ml-1" size={22} />
                          </div>
                        </div>
                        {/* Type badge */}
                        {t.type && (
                          <div className="absolute top-2 left-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600/80 text-white uppercase tracking-wider">
                              {t.type}
                            </span>
                          </div>
                        )}
                        {/* Duration */}
                        {t.duration && (
                          <div className="absolute bottom-2 right-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 text-slate-200">
                              {t.duration}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Title */}
                      <div className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-100 group-hover:text-red-300 transition-colors line-clamp-2">{t.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Showtime Selection Section */}
            <div className="pt-6 space-y-6 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2 font-heading">
                    <FiFilm className="text-purple-400" />
                    Select Showtimes
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Live schedules for {selectedCity || 'your city'}</p>
                </div>
              </div>

              {/* Date Ribbon Slider */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {dateOptions.map((date, idx) => {
                  const isSelected = isSameDay(date, selectedDate);
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      className={`shrink-0 px-5 py-3 rounded-2xl text-center transition-all glass-card ${
                        isSelected 
                          ? 'gradient-bg text-white shadow-xl glow-purple scale-105 font-bold' 
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold tracking-wider opacity-80 font-heading">
                        {format(date, 'EEE')}
                      </div>
                      <div className="text-lg font-black leading-tight mt-0.5 font-numeric">
                        {format(date, 'dd MMM')}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Cinema & Shows List */}
              {showsLoading ? (
                <div className="p-8 text-center glass-card rounded-3xl">
                  <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Loading showtimes...</p>
                </div>
              ) : Object.keys(groupedShows).length === 0 ? (
                <div className="p-10 text-center glass-card rounded-3xl border border-white/10 space-y-2">
                  <FiAlertCircle className="text-amber-400 text-3xl mx-auto opacity-70" />
                  <h4 className="text-base font-bold text-white">No Showtimes Available</h4>
                  <p className="text-xs text-slate-400">
                    There are no scheduled shows for {format(selectedDate, 'EEEE, dd MMMM')}. Try selecting another date.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.values(groupedShows).map(({ info: theatre, shows: tShows }) => (
                    <div key={theatre.id} className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <h3 className="font-extrabold text-base text-white flex items-center gap-2 font-heading">
                            <FiMapPin className="text-purple-400" />
                            {theatre.name}
                          </h3>
                          <p className="text-xs text-slate-400">{theatre.address}, {theatre.city}</p>
                        </div>
                        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 w-fit font-heading">
                          M-Ticket & Food Service
                        </span>
                      </div>

                      {/* Showtime Buttons Grid */}
                      <div className="flex flex-wrap gap-3">
                        {tShows.map((show) => {
                          const availableSeats = show.availableSeats ?? 30;
                          const isFillingFast = availableSeats < 15;

                          return (
                            <button
                              key={show.id}
                              onClick={() => handleShowSelection(show)}
                              className="px-4 py-3 rounded-2xl glass-card border border-white/15 hover:border-purple-500 text-left transition-all hover:scale-105 group relative overflow-hidden"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white group-hover:text-purple-300 font-numeric">
                                  {format(new Date(show.startTime), 'hh:mm a')}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600/30 text-purple-300 font-heading">
                                  {show.format || 'IMAX 3D'}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between gap-4 mt-1 text-[11px]">
                                <span className="text-emerald-400 font-bold font-numeric">₹{show.price || '300'}</span>
                                <span className={`text-[9px] font-semibold ${isFillingFast ? 'text-amber-400' : 'text-slate-400'}`}>
                                  {isFillingFast ? 'Filling Fast 🔥' : `${availableSeats} seats`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ratings & User Reviews Section */}
            <div className="pt-8 space-y-6 border-t border-white/10">
              <h2 className="text-2xl font-black text-white flex items-center gap-2 font-heading">
                <FiMessageSquare className="text-pink-400" />
                Audience Ratings & Reviews
              </h2>

              {/* Review Form */}
              {isAuthenticated ? (
                <form onSubmit={handleReviewSubmit} className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                  <h4 className="text-sm font-bold text-white font-heading">Write a Review</h4>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-semibold">Score:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingInput(star)}
                        className="text-lg focus:outline-none transition-transform hover:scale-125"
                      >
                        <FiStar className={star <= ratingInput ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'} />
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Review headline (e.g., Unbelievable visual masterpiece!)"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    className="glass-input text-xs px-4 py-3 rounded-xl w-full text-white outline-none border border-white/10"
                  />

                  <textarea
                    rows={3}
                    placeholder="Share your thoughts on the plot, direction, acting, and music score..."
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    className="glass-input text-xs p-4 rounded-xl w-full text-white outline-none border border-white/10"
                  />

                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg"
                  >
                    <FiSend size={14} />
                    Post Review
                  </button>
                </form>
              ) : (
                <div className="p-6 text-center glass-card rounded-3xl border border-white/10">
                  <p className="text-xs text-slate-400 mb-3">Sign in to rate this movie and write a review.</p>
                  <Link to="/login" className="btn-primary px-6 py-2 text-xs font-bold rounded-xl">Sign In to Review</Link>
                </div>
              )}

              {/* Reviews List */}
              {movie.reviews?.length > 0 && (
                <div className="space-y-4">
                  {movie.reviews.map((rev) => (
                    <div key={rev.id} className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-black shadow-md">
                            {rev.user?.firstName?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{rev.user?.firstName} {rev.user?.lastName}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {[...Array(rev.score || 5)].map((_, i) => (
                                <FiStar key={i} size={11} className="fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">{rev.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended / Similar Movies */}
            {recommendedMovies.length > 0 && (
              <div className="pt-10 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-white font-heading">You Might Also Like</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Explore similar blockbusters and upcoming releases</p>
                  </div>
                </div>
                <MovieSlider movies={recommendedMovies} />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Trailer Video Player Modal */}
      <AnimatePresence>
        {(isPlayingTrailer || activeTrailerModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => {
              setIsPlayingTrailer(false);
              setActiveTrailerModal(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden glass-card relative border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setIsPlayingTrailer(false);
                  setActiveTrailerModal(null);
                }}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:bg-red-500/20"
              >
                <FiX size={20} />
              </button>
              <iframe
                src={(activeTrailerModal?.url || movie.trailerUrl)?.replace('watch?v=', 'embed/') + '?autoplay=1'}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay"
                title={activeTrailerModal?.title || `${movie.title} Trailer`}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Resolution Photo Lightbox Modal */}
      <AnimatePresence>
        {activeImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setActiveImageModal(null)}
          >
            <div className="relative max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setActiveImageModal(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:bg-red-500/20"
              >
                <FiX size={20} />
              </button>
              <img src={activeImageModal} alt="Still Preview" className="w-full h-full object-contain max-h-[85vh]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
