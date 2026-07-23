import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiClock, FiCalendar, FiGlobe, FiStar, FiHeart, FiBookmark, 
  FiMapPin, FiMessageSquare, FiSend, FiPlay, FiAlertTriangle, FiAlertCircle, FiFilm, FiCheck, FiX 
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format, addDays, isSameDay } from 'date-fns';
import { movieAPI } from '../services/api.js';
import { useAuthStore, useUIStore, useBookingStore } from '../store/index.js';
import { useSocket } from '../context/SocketContext.jsx';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';

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
  const { data: movieResponse, isLoading: movieLoading, error: movieError } = useQuery({
    queryKey: ['movie', slug],
    queryFn: () => movieAPI.getBySlug(slug),
  });

  const movie = movieResponse?.data?.data?.movie;

  // Fetch shows for date
  const { data: showsResponse, isLoading: showsLoading } = useQuery({
    queryKey: ['movie-shows', movie?.id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => movieAPI.getShows(movie.id, { date: format(selectedDate, 'yyyy-MM-dd') }),
    enabled: !!movie?.id,
  });

  const shows = showsResponse?.data?.data?.shows || [];

  const filteredShows = shows.filter(
    (show) => show.screen?.theatre?.city?.toLowerCase() === selectedCity?.toLowerCase()
  );

  const groupedShows = filteredShows.reduce((acc, show) => {
    const theatre = show.screen?.theatre;
    if (!theatre) return acc;
    if (!acc[theatre.id]) {
      acc[theatre.id] = { info: theatre, shows: [] };
    }
    acc[theatre.id].shows.push(show);
    return acc;
  }, {});

  const dateOptions = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Mutations
  const wishlistMutation = useMutation({
    mutationFn: () => movieAPI.toggleWishlist(movie.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['movie', slug]);
      toast.success(res.data.message);
    },
    onError: () => toast.error('Failed to update wishlist'),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => movieAPI.toggleFavorite(movie.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['movie', slug]);
      toast.success(res.data.message);
    },
    onError: () => toast.error('Failed to update favorites'),
  });

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
      toast.error(err.response?.data?.message || 'Failed to submit review');
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

  if (movieError || !movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#070710]">
        <FiAlertCircle size={56} className="text-pink-500 mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Movie Details Unavailable</h2>
        <p className="text-xs text-slate-400 mb-6">The requested movie could not be found.</p>
        <Link to="/" className="btn-primary px-6 py-2.5 text-xs font-bold rounded-full">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#070710]">
      
      {/* Background Hero Banner */}
      <div className="relative h-[420px] md:h-[540px] w-full overflow-hidden">
        <img 
          src={movie.bannerUrl || movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1400&q=80'} 
          alt={movie.title}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1400&q=80';
          }}
          className="w-full h-full object-cover brightness-40 blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070710] via-[#070710]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070710] via-[#070710]/40 to-transparent" />
      </div>

      {/* Main Container */}
      <div className="container-app -mt-80 relative z-10">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Left Column: Poster & Quick Action Buttons */}
          <div className="w-full lg:w-80 shrink-0 space-y-5">
            <div className="relative rounded-3xl overflow-hidden glass-card border border-white/20 shadow-2xl group">
              <img 
                src={movie.posterUrl || 'https://images.unsplash.com/photo-1542204172-e7052809f852?w=600&q=80'} 
                alt={movie.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1542204172-e7052809f852?w=600&q=80';
                }}
                className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {movie.trailerUrl && (
                <button
                  onClick={() => setIsPlayingTrailer(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                >
                  <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center shadow-2xl glow-purple text-white">
                    <FiPlay size={24} className="fill-white ml-1" />
                  </div>
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => favoriteMutation.mutate()}
                className={`py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  movie.userFavorited 
                    ? 'bg-pink-600/20 text-pink-400 border-pink-500/40' 
                    : 'glass-card text-slate-300 hover:text-white'
                }`}
              >
                <FiHeart size={15} fill={movie.userFavorited ? '#ec4899' : 'none'} />
                {movie.userFavorited ? 'Favorited' : 'Favorite'}
              </button>

              <button 
                onClick={() => wishlistMutation.mutate()}
                className={`py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                  movie.userWishlisted 
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' 
                    : 'glass-card text-slate-300 hover:text-white'
                }`}
              >
                <FiBookmark size={15} fill={movie.userWishlisted ? '#7c3aed' : 'none'} />
                {movie.userWishlisted ? 'Saved' : 'Watchlist'}
              </button>
            </div>
          </div>

          {/* Right Column: Title, Metadata, Showtimes Grid */}
          <div className="flex-1 space-y-8">
            <div>
              {movie.tagline && (
                <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">
                  "{movie.tagline}"
                </p>
              )}
              <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-4">{movie.title}</h1>
              
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-semibold">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-card border border-white/10">
                  <FiStar className="fill-yellow-400 text-yellow-400" size={15} />
                  <span className="font-extrabold text-white text-sm">{movie.imdbRating?.toFixed(1) || '8.5'}</span>
                  <span className="text-slate-400 text-[11px]">IMDb</span>
                </div>

                {movie.duration && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-card border border-white/10">
                    <FiClock className="text-purple-400" size={15} />
                    <span>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl glass-card border border-white/10">
                  <FiGlobe className="text-pink-400" size={15} />
                  <span>{movie.languages?.map(l => l.language.name).join(', ') || 'English, Hindi'}</span>
                </div>

                <span className="px-3 py-1 rounded-xl glass-card border border-amber-500/30 text-amber-400 font-extrabold">
                  {movie.ageRating || 'U/A'}
                </span>
              </div>
            </div>

            {/* Synopsis */}
            <div className="glass-card p-6 rounded-3xl space-y-2 border border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Synopsis</h3>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300">{movie.synopsis}</p>
            </div>

            {/* Cast Carousel */}
            {movie.cast?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Starring Cast</h3>
                <div className="flex gap-4 overflow-x-auto pb-3">
                  {movie.cast.map((c) => (
                    <div key={c.id} className="w-24 shrink-0 text-center space-y-2">
                      <img 
                        src={c.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80'} 
                        alt={c.name} 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80';
                        }}
                        className="w-16 h-16 rounded-2xl object-cover mx-auto glass-card border border-white/10 shadow-md"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-100 truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.characterName || 'Lead'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Showtime Selection Section */}
            <div className="pt-4 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <FiFilm className="text-purple-400" />
                    Select Showtimes
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Showing options in {selectedCity}</p>
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
                      <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                        {format(date, 'EEE')}
                      </div>
                      <div className="text-lg font-black leading-tight mt-0.5">
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
                  <FiAlertTriangle className="text-amber-400 text-3xl mx-auto opacity-70" />
                  <h4 className="text-base font-bold text-white">No Showtimes Available</h4>
                  <p className="text-xs text-slate-400">
                    There are no scheduled shows for {format(selectedDate, 'EEEE, dd MMMM')} in {selectedCity}. Try choosing another date or city.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.values(groupedShows).map(({ info: theatre, shows: tShows }) => (
                    <div key={theatre.id} className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                            <FiMapPin className="text-purple-400" />
                            {theatre.name}
                          </h3>
                          <p className="text-xs text-slate-400">{theatre.address}, {theatre.city}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 w-fit">
                          M-Ticket & Food Service Available
                        </span>
                      </div>

                      {/* Showtime Buttons Grid */}
                      <div className="flex flex-wrap gap-3">
                        {tShows.map((show) => {
                          const availableSeats = show.availableSeats ?? 50;
                          const isFillingFast = availableSeats < 15;

                          return (
                            <button
                              key={show.id}
                              onClick={() => handleShowSelection(show)}
                              className="px-4 py-3 rounded-2xl glass-card border border-white/15 hover:border-purple-500 text-left transition-all hover:scale-105 group relative overflow-hidden"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white group-hover:text-purple-300">
                                  {format(new Date(show.startTime), 'hh:mm a')}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600/30 text-purple-300">
                                  {show.format || 'IMAX 3D'}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between gap-4 mt-1 text-[11px]">
                                <span className="text-emerald-400 font-bold">₹{show.price || '250'}</span>
                                <span className={`text-[9px] font-semibold ${isFillingFast ? 'text-amber-400' : 'text-slate-400'}`}>
                                  {isFillingFast ? 'Filling Fast 🔥' : `${availableSeats} seats left`}
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

            {/* Review Section */}
            <div className="pt-8 space-y-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <FiMessageSquare className="text-pink-400" />
                User Ratings & Reviews
              </h2>

              {/* Review Submission Form */}
              {isAuthenticated ? (
                <form onSubmit={handleReviewSubmit} className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                  <h4 className="text-sm font-bold text-white">Share Your Review</h4>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-semibold">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingInput(star)}
                        className="text-lg focus:outline-none"
                      >
                        <FiStar className={star <= ratingInput ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'} />
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Review headline / title"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    className="glass-input text-xs px-4 py-2.5 rounded-xl w-full text-white outline-none"
                  />

                  <textarea
                    rows={3}
                    placeholder="What did you think of the storyline, direction, and performances?"
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    className="glass-input text-xs p-4 rounded-xl w-full text-white outline-none"
                  />

                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2"
                  >
                    <FiSend size={14} />
                    Submit Review
                  </button>
                </form>
              ) : (
                <div className="p-6 text-center glass-card rounded-3xl border border-white/10">
                  <p className="text-xs text-slate-400 mb-3">Log in to post your rating and review for this movie.</p>
                  <Link to="/login" className="btn-primary px-5 py-2 text-xs font-bold rounded-xl">Sign In to Review</Link>
                </div>
              )}

              {/* Reviews List */}
              {movie.reviews?.length > 0 && (
                <div className="space-y-4">
                  {movie.reviews.map((rev) => (
                    <div key={rev.id} className="glass-card p-5 rounded-2xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                            {rev.user?.firstName?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{rev.user?.firstName} {rev.user?.lastName}</p>
                            <div className="flex items-center gap-1">
                              {[...Array(rev.score || 5)].map((_, i) => (
                                <FiStar key={i} size={10} className="fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{rev.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Trailer Video Player Modal */}
      <AnimatePresence>
        {isPlayingTrailer && movie.trailerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setIsPlayingTrailer(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden glass-card relative border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsPlayingTrailer(false)}
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
