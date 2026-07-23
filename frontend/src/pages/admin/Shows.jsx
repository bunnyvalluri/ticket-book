import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { showAPI, movieAPI, theatreAPI } from '../../services/api.js';
import toast from 'react-hot-toast';
import { 
  FiCalendar, FiClock, FiPlus, FiTrash2, FiSearch, 
  FiLoader, FiX, FiFilm, FiMapPin, FiDollarSign, FiTv 
} from 'react-icons/fi';

export default function AdminShows() {
  const queryClient = useQueryClient();
  const [selectedMovie, setSelectedMovie] = useState('');
  const [selectedTheatre, setSelectedTheatre] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    movieId: '',
    theatreId: '',
    screenId: '',
    startTime: '',
    normalPrice: 220,
    vipPrice: 380,
  });

  // Queries
  const { data: moviesData } = useQuery({
    queryKey: ['movies-select'],
    queryFn: () => movieAPI.getAll({ limit: 100 }),
  });
  const movies = moviesData?.data?.data?.movies || [];

  const { data: theatresData } = useQuery({
    queryKey: ['theatres-select'],
    queryFn: () => theatreAPI.getAll({ limit: 100 }),
  });
  const theatres = theatresData?.data?.data?.theatres || [];

  const { data: showsData, isLoading } = useQuery({
    queryKey: ['admin-shows', selectedMovie, selectedTheatre],
    queryFn: () => showAPI.getAll({ movieId: selectedMovie || undefined, theatreId: selectedTheatre || undefined }),
  });
  const shows = showsData?.data?.data?.shows || [];

  // Get screens for selected theatre in form
  const activeTheatreObj = theatres.find(t => t.id === formData.theatreId);
  const availableScreens = activeTheatreObj?.screens || [];

  // Mutations
  const createShowMutation = useMutation({
    mutationFn: showAPI.create,
    onSuccess: () => {
      toast.success('Show scheduled successfully! 🎬');
      queryClient.invalidateQueries({ queryKey: ['admin-shows'] });
      setIsModalOpen(false);
      setFormData({ movieId: '', theatreId: '', screenId: '', startTime: '', normalPrice: 220, vipPrice: 380 });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to schedule show'),
  });

  const deleteShowMutation = useMutation({
    mutationFn: showAPI.delete,
    onSuccess: () => {
      toast.success('Show removed from schedule');
      queryClient.invalidateQueries({ queryKey: ['admin-shows'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.movieId || !formData.screenId || !formData.startTime) {
      return toast.error('Please select Movie, Screen, and Start Time');
    }

    createShowMutation.mutate({
      movieId: formData.movieId,
      screenId: formData.screenId,
      startTime: formData.startTime,
      pricing: [
        { category: 'NORMAL', price: Number(formData.normalPrice) },
        { category: 'VIP', price: Number(formData.vipPrice) },
      ],
    });
  };

  return (
    <div className="space-y-8 text-slate-100 selection:bg-purple-500 selection:text-white">
      
      {/* Header Banner */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            📅 Showtime & Screen Scheduling
          </h1>
          <p className="text-xs text-slate-400">Schedule movie showtimes across multiplex screens and configure ticket pricing</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary px-5 py-3 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xl glow-purple hover:scale-[1.02] transition-transform"
        >
          <FiPlus size={16} /> Schedule New Show
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Movie Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <FiFilm className="text-purple-400 shrink-0" size={14} />
          <select
            value={selectedMovie}
            onChange={(e) => setSelectedMovie(e.target.value)}
            className="glass-input text-xs px-3 py-2.5 rounded-xl outline-none bg-slate-900 text-slate-300 font-semibold w-full"
          >
            <option value="">All Movies ({movies.length})</option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>

        {/* Theatre Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <FiMapPin className="text-pink-400 shrink-0" size={14} />
          <select
            value={selectedTheatre}
            onChange={(e) => setSelectedTheatre(e.target.value)}
            className="glass-input text-xs px-3 py-2.5 rounded-xl outline-none bg-slate-900 text-slate-300 font-semibold w-full"
          >
            <option value="">All Theatres ({theatres.length})</option>
            {theatres.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
            ))}
          </select>
        </div>

      </div>

      {/* Shows List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl shimmer" />
          ))}
        </div>
      ) : shows.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-3xl border border-white/10 space-y-3">
          <FiCalendar className="text-4xl text-purple-400 mx-auto opacity-50" />
          <h3 className="text-base font-bold text-white">No Scheduled Shows</h3>
          <p className="text-xs text-slate-400">Click "Schedule New Show" to add showtimes for your theatres.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shows.map((show) => {
            const movie = show.movie;
            const screen = show.screen;
            const theatre = screen?.theatre;
            const startTime = new Date(show.startTime);

            return (
              <motion.div
                key={show.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 rounded-2xl border border-white/15 shadow-xl flex items-start justify-between gap-4"
              >
                <div className="flex gap-4 items-center">
                  <img
                    src={movie?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200'}
                    alt={movie?.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200';
                    }}
                    className="w-14 h-20 object-cover rounded-xl border border-white/10 shrink-0"
                  />
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-500/20 text-purple-300">
                      {screen?.name} ({screen?.type || '2D'})
                    </span>
                    <h4 className="text-base font-black text-white">{movie?.title}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <FiMapPin size={12} className="text-pink-400" /> {theatre?.name}, {theatre?.city}
                    </p>
                    <p className="text-xs text-amber-300 font-extrabold flex items-center gap-1">
                      <FiClock size={12} /> {startTime.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between h-full space-y-3">
                  <button
                    onClick={() => {
                      if (confirm(`Remove this showtime for ${movie?.title}?`)) deleteShowMutation.mutate(show.id);
                    }}
                    className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors"
                    title="Delete Show"
                  >
                    <FiTrash2 size={14} />
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                    Pricing: ₹220+
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal: Schedule Show */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 md:p-8 rounded-3xl border border-white/15 max-w-lg w-full shadow-2xl space-y-6 bg-slate-900/95"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-black text-white">Schedule New Showtime</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white">
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Select Movie</label>
                  <select
                    value={formData.movieId}
                    onChange={(e) => setFormData({ ...formData, movieId: e.target.value })}
                    className="glass-input text-xs px-4 py-3 rounded-2xl w-full outline-none bg-slate-900"
                    required
                  >
                    <option value="">Choose Movie...</option>
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Select Theatre</label>
                    <select
                      value={formData.theatreId}
                      onChange={(e) => setFormData({ ...formData, theatreId: e.target.value, screenId: '' })}
                      className="glass-input text-xs px-4 py-3 rounded-2xl w-full outline-none bg-slate-900"
                      required
                    >
                      <option value="">Choose Cinema...</option>
                      {theatres.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Select Screen</label>
                    <select
                      value={formData.screenId}
                      onChange={(e) => setFormData({ ...formData, screenId: e.target.value })}
                      className="glass-input text-xs px-4 py-3 rounded-2xl w-full outline-none bg-slate-900"
                      required
                      disabled={!formData.theatreId}
                    >
                      <option value="">Choose Screen...</option>
                      {availableScreens.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.type || '2D'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Show Start Time & Date</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="glass-input text-xs px-4 py-3 rounded-2xl w-full outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">Normal Seat Price (₹)</label>
                    <input
                      type="number"
                      value={formData.normalPrice}
                      onChange={(e) => setFormData({ ...formData, normalPrice: e.target.value })}
                      className="glass-input text-xs px-4 py-3 rounded-2xl w-full outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1.5 block">VIP Seat Price (₹)</label>
                    <input
                      type="number"
                      value={formData.vipPrice}
                      onChange={(e) => setFormData({ ...formData, vipPrice: e.target.value })}
                      className="glass-input text-xs px-4 py-3 rounded-2xl w-full outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createShowMutation.isPending}
                  className="btn-primary w-full py-3.5 text-xs font-bold rounded-2xl shadow-xl glow-purple flex items-center justify-center gap-2"
                >
                  {createShowMutation.isPending ? <FiLoader className="animate-spin" /> : 'Confirm Show Schedule'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
