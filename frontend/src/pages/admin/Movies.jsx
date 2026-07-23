import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { movieAPI } from '../../services/api.js';
import toast from 'react-hot-toast';
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiStar,
  FiLoader,
  FiX,
  FiFilm,
  FiGlobe,
  FiCalendar,
  FiClock,
  FiUser,
  FiUsers,
  FiImage,
  FiCheck,
  FiTv,
} from 'react-icons/fi';

export default function AdminMovies() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Modal and Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('tmdb'); // 'tmdb' or 'form'
  const [formTab, setFormTab] = useState('basic'); // 'basic', 'genres', 'cast'
  
  // TMDB search states
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const [isFetchingTmdbDetails, setIsFetchingTmdbDetails] = useState(false);

  // Form data state
  const initialFormState = {
    title: '',
    tagline: '',
    synopsis: '',
    duration: 120,
    releaseDate: '',
    endDate: '',
    imdbRating: '',
    status: 'COMING_SOON',
    ageRating: 'U/A',
    country: 'India',
    trailerUrl: '',
    posterUrl: '',
    bannerUrl: '',
    genres: [],
    languages: [],
    cast: [],
    crew: [],
    isFeatured: false,
    isTrending: false,
  };
  const [formData, setFormData] = useState(initialFormState);

  // Cast/Crew Add Inputs
  const [newCastName, setNewCastName] = useState('');
  const [newCastCharacter, setNewCastCharacter] = useState('');
  const [newCastPhoto, setNewCastPhoto] = useState('');
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewRole, setNewCrewRole] = useState('');
  const [newCrewPhoto, setNewCrewPhoto] = useState('');

  // Fetch local genres & languages
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: () => movieAPI.getGenres(),
  });
  const genresList = genresData?.data?.data?.genres || [];

  const { data: languagesData } = useQuery({
    queryKey: ['languages'],
    queryFn: () => movieAPI.getLanguages(),
  });
  const languagesList = languagesData?.data?.data?.languages || [];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-movies', search, page],
    queryFn: () => movieAPI.getAll({ search, page, limit: 15 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => movieAPI.delete(id),
    onSuccess: () => {
      toast.success('Movie deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const createMutation = useMutation({
    mutationFn: (movieData) => movieAPI.createJson(movieData),
    onSuccess: () => {
      toast.success('Movie created successfully');
      setIsModalOpen(false);
      setFormData(initialFormState);
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create movie');
    },
  });

  const movies = data?.data?.data?.movies || [];
  const pagination = data?.data?.data?.pagination;

  // TMDB search handler
  const handleTmdbSearch = async (e) => {
    e.preventDefault();
    if (!tmdbQuery.trim()) return;
    setIsSearchingTmdb(true);
    try {
      const response = await movieAPI.tmdbSearch(tmdbQuery);
      setTmdbResults(response.data.data.movies || []);
    } catch (err) {
      toast.error('TMDB search failed');
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  // TMDB import details handler
  const handleTmdbSelect = async (tmdbId) => {
    setIsFetchingTmdbDetails(true);
    try {
      const response = await movieAPI.tmdbDetails(tmdbId);
      const movie = response.data.data.movie;
      
      // Auto-set form fields
      setFormData({
        title: movie.title || '',
        tagline: movie.tagline || '',
        synopsis: movie.synopsis || '',
        duration: movie.duration || 120,
        releaseDate: movie.releaseDate ? movie.releaseDate.split('T')[0] : '',
        endDate: movie.releaseDate ? new Date(new Date(movie.releaseDate).setMonth(new Date(movie.releaseDate).getMonth() + 3)).toISOString().split('T')[0] : '',
        imdbRating: movie.imdbRating || '',
        status: 'COMING_SOON',
        ageRating: movie.ageRating || 'U/A',
        country: movie.country || 'India',
        trailerUrl: movie.trailerUrl || '',
        posterUrl: movie.posterUrl || '',
        bannerUrl: movie.bannerUrl || '',
        genres: movie.genres || [],
        languages: movie.languages || [],
        cast: movie.cast || [],
        crew: movie.crew || [],
        isFeatured: false,
        isTrending: false,
      });

      toast.success('Movie details fetched! Switching to edit form...');
      setModalTab('form');
      setFormTab('basic');
    } catch (err) {
      toast.error('Failed to fetch details from TMDB');
    } finally {
      setIsFetchingTmdbDetails(false);
    }
  };

  // Checkbox handlers
  const handleGenreToggle = (id) => {
    setFormData((prev) => ({
      ...prev,
      genres: prev.genres.includes(id)
        ? prev.genres.filter((gId) => gId !== id)
        : [...prev.genres, id],
    }));
  };

  const handleLanguageToggle = (id) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(id)
        ? prev.languages.filter((lId) => lId !== id)
        : [...prev.languages, id],
    }));
  };

  // Add Cast / Crew lists
  const addCastMember = () => {
    if (!newCastName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      cast: [...prev.cast, { name: newCastName, character: newCastCharacter, photoUrl: newCastPhoto }],
    }));
    setNewCastName('');
    setNewCastCharacter('');
    setNewCastPhoto('');
  };

  const removeCastMember = (index) => {
    setFormData((prev) => ({
      ...prev,
      cast: prev.cast.filter((_, i) => i !== index),
    }));
  };

  const addCrewMember = () => {
    if (!newCrewName.trim() || !newCrewRole.trim()) return;
    setFormData((prev) => ({
      ...prev,
      crew: [...prev.crew, { name: newCrewName, role: newCrewRole, photoUrl: newCrewPhoto }],
    }));
    setNewCrewName('');
    setNewCrewRole('');
    setNewCrewPhoto('');
  };

  const removeCrewMember = (index) => {
    setFormData((prev) => ({
      ...prev,
      crew: prev.crew.filter((_, i) => i !== index),
    }));
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error('Title is required');
    if (!formData.duration) return toast.error('Duration is required');
    if (formData.genres.length === 0) return toast.error('Select at least one genre');
    if (formData.languages.length === 0) return toast.error('Select at least one language');

    // Parse ratings/durations
    const payload = {
      ...formData,
      duration: parseInt(formData.duration),
      imdbRating: formData.imdbRating ? parseFloat(formData.imdbRating) : null,
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ color: '#f0f0f8' }}>🎬 Movies</h1>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setModalTab('tmdb');
            setFormTab('basic');
            setFormData(initialFormState);
          }}
          className="btn-primary px-4 py-2 text-sm flex items-center gap-2 rounded-xl hover:scale-102 transition-transform"
        >
          <FiPlus size={16} />
          Add Movie
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: '#606080' }} />
        <input
          type="text"
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1a2e' }}>
                {['Movie', 'Status', 'Rating', 'Duration', 'Release', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#606080' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded shimmer w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : movies.map((movie, i) => (
                <motion.tr
                  key={movie.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="transition-colors hover:bg-white/2"
                  style={{ borderBottom: '1px solid #1a1a2e' }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80'}
                        alt={movie.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80';
                        }}
                        className="w-9 h-13 object-cover rounded-lg flex-shrink-0"
                        style={{ height: '52px' }}
                      />
                      <div>
                        <p className="font-semibold" style={{ color: '#f0f0f8' }}>{movie.title}</p>
                        <p className="text-xs" style={{ color: '#606080' }}>{movie.ageRating} • {movie.country}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge text-xs ${
                      movie.status === 'NOW_SHOWING' ? 'badge-green' :
                      movie.status === 'COMING_SOON' ? 'badge-purple' : 'badge-yellow'
                    }`}>
                      {movie.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {movie.imdbRating ? (
                      <div className="flex items-center gap-1">
                        <FiStar className="text-yellow-400 fill-yellow-400" size={12} />
                        <span style={{ color: '#f0f0f8' }}>{movie.imdbRating}</span>
                      </div>
                    ) : <span style={{ color: '#606080' }}>—</span>}
                  </td>
                  <td className="px-5 py-4" style={{ color: '#a0a0c0' }}>
                    {Math.floor(movie.duration / 60)}h {movie.duration % 60}m
                  </td>
                  <td className="px-5 py-4" style={{ color: '#a0a0c0' }}>
                    {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                        style={{ color: '#7c3aed' }}>
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this movie?')) deleteMutation.mutate(movie.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                        style={{ color: '#ef4444' }}
                      >
                        {deleteMutation.isPending ? <FiLoader size={14} className="animate-spin" /> : <FiTrash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #1a1a2e' }}>
            <p className="text-xs" style={{ color: '#606080' }}>
              Showing {movies.length} of {pagination.total} movies
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-3 py-1.5 text-xs rounded-lg" style={{ background: '#1e1e35', color: '#a0a0c0' }}>
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="btn-ghost px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              className="relative w-full max-w-4xl glass rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/10"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-black/30 border-b border-white/5">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <FiFilm className="text-purple-500 animate-pulse" />
                  Add New Movie
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Modal Tabs Selection */}
              <div className="flex px-6 border-b border-white/5 bg-black/10">
                <button
                  onClick={() => setModalTab('tmdb')}
                  className={`px-4 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                    modalTab === 'tmdb'
                      ? 'border-purple-500 text-purple-400 bg-white/2'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  🔍 TMDB Import
                </button>
                <button
                  onClick={() => setModalTab('form')}
                  className={`px-4 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                    modalTab === 'form'
                      ? 'border-purple-500 text-purple-400 bg-white/2'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  ✍️ Details Form
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-slate-950/20">
                {modalTab === 'tmdb' ? (
                  // TMDB Search Tab
                  <div className="space-y-6">
                    <form onSubmit={handleTmdbSearch} className="flex gap-2">
                      <div className="relative flex-1">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                          type="text"
                          placeholder="Search movies on TMDB (e.g. Inception)..."
                          value={tmdbQuery}
                          onChange={(e) => setTmdbQuery(e.target.value)}
                          className="input-field pl-10 w-full rounded-xl"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSearchingTmdb}
                        className="btn-primary px-6 rounded-xl flex items-center gap-2 hover:scale-102 transition-transform active:scale-98"
                      >
                        {isSearchingTmdb ? <FiLoader className="animate-spin" size={16} /> : 'Search'}
                      </button>
                    </form>

                    {/* TMDB Results Grid */}
                    {isSearchingTmdb ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                        <FiLoader className="animate-spin text-purple-500" size={32} />
                        <p className="text-sm font-semibold tracking-wider">Searching TMDB Database...</p>
                      </div>
                    ) : tmdbResults.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                        {tmdbResults.map((result) => (
                          <div
                            key={result.tmdbId}
                            onClick={() => handleTmdbSelect(result.tmdbId)}
                            className="flex gap-4 p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-purple-950/10 hover:border-purple-500/20 cursor-pointer transition-all duration-200 group"
                          >
                            <div className="w-16 h-24 rounded-lg bg-gray-900 overflow-hidden flex-shrink-0 relative shadow-md">
                              {result.posterUrl ? (
                                <img
                                  src={result.posterUrl}
                                  alt={result.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <FiImage className="w-full h-full p-4 text-gray-600" />
                              )}
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-0.5">
                              <div>
                                <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors text-sm md:text-base line-clamp-1">
                                  {result.title}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Released: {result.releaseDate ? new Date(result.releaseDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">
                                  {result.synopsis}
                                </p>
                              </div>
                              {result.rating > 0 && (
                                <div className="flex items-center gap-1 mt-1 text-yellow-400 text-xs">
                                  <FiStar size={12} className="fill-current" />
                                  <span>{result.rating.toFixed(1)} / 10</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : tmdbQuery && !isSearchingTmdb ? (
                      <div className="text-center py-16 text-gray-500 text-sm">
                        No movies found on TMDB matching "{tmdbQuery}".
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-500 text-sm flex flex-col items-center gap-3">
                        <FiTv size={42} className="text-purple-500/50" />
                        <p className="font-medium tracking-wide">Search TMDB above to quickly fetch details, cast, crew, and map genres/languages!</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Movie Details Form Tab
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Form Sub-Tabs */}
                    <div className="flex gap-1 p-1 rounded-xl bg-black/30 border border-white/5">
                      {['basic', 'genres', 'cast'].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setFormTab(tab)}
                          className={`flex-1 py-2 text-xs uppercase tracking-wider font-bold rounded-lg transition-all ${
                            formTab === tab
                              ? 'bg-purple-600 text-white shadow-lg'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {tab === 'basic' ? '1. Info' : tab === 'genres' ? '2. Genres' : '3. Cast & Crew'}
                        </button>
                      ))}
                    </div>

                    {formTab === 'basic' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Movie Title *</label>
                            <input
                              type="text"
                              value={formData.title}
                              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                              className="input-field w-full"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Tagline</label>
                            <input
                              type="text"
                              value={formData.tagline}
                              onChange={(e) => setFormData((p) => ({ ...p, tagline: e.target.value }))}
                              className="input-field w-full"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1">Synopsis</label>
                          <textarea
                            value={formData.synopsis}
                            onChange={(e) => setFormData((p) => ({ ...p, synopsis: e.target.value }))}
                            className="input-field w-full h-24 resize-none"
                            placeholder="Write movie overview here..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Duration (Mins) *</label>
                            <input
                              type="number"
                              value={formData.duration}
                              onChange={(e) => setFormData((p) => ({ ...p, duration: e.target.value }))}
                              className="input-field w-full"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Release Date</label>
                            <input
                              type="date"
                              value={formData.releaseDate}
                              onChange={(e) => setFormData((p) => ({ ...p, releaseDate: e.target.value }))}
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">End Date</label>
                            <input
                              type="date"
                              value={formData.endDate}
                              onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">IMDb Rating</label>
                            <input
                              type="number"
                              step="0.1"
                              value={formData.imdbRating}
                              onChange={(e) => setFormData((p) => ({ ...p, imdbRating: e.target.value }))}
                              className="input-field w-full"
                              placeholder="e.g. 8.4"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Status</label>
                            <select
                              value={formData.status}
                              onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                              className="input-field w-full bg-slate-900 border border-white/10"
                            >
                              <option value="COMING_SOON">Coming Soon</option>
                              <option value="NOW_SHOWING">Now Showing</option>
                              <option value="ARCHIVED">Archived</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Age Rating</label>
                            <select
                              value={formData.ageRating}
                              onChange={(e) => setFormData((p) => ({ ...p, ageRating: e.target.value }))}
                              className="input-field w-full bg-slate-900 border border-white/10"
                            >
                              <option value="U">U (Universal)</option>
                              <option value="U/A">U/A (Parental Guidance)</option>
                              <option value="A">A (Adults Only)</option>
                              <option value="S">S (Special Classes)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Country</label>
                            <input
                              type="text"
                              value={formData.country}
                              onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Trailer Embed URL</label>
                            <input
                              type="text"
                              value={formData.trailerUrl}
                              onChange={(e) => setFormData((p) => ({ ...p, trailerUrl: e.target.value }))}
                              placeholder="YouTube embed url"
                              className="input-field w-full"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Poster Image URL</label>
                            <input
                              type="text"
                              value={formData.posterUrl}
                              onChange={(e) => setFormData((p) => ({ ...p, posterUrl: e.target.value }))}
                              className="input-field w-full text-xs"
                            />
                            {formData.posterUrl && (
                              <img src={formData.posterUrl} alt="Poster preview" className="w-16 h-24 object-cover mt-2 rounded-lg border border-white/10 shadow-md" />
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Banner Image URL</label>
                            <input
                              type="text"
                              value={formData.bannerUrl}
                              onChange={(e) => setFormData((p) => ({ ...p, bannerUrl: e.target.value }))}
                              className="input-field w-full text-xs"
                            />
                            {formData.bannerUrl && (
                              <img src={formData.bannerUrl} alt="Banner preview" className="w-full h-16 object-cover mt-2 rounded-lg border border-white/10 shadow-md" />
                            )}
                          </div>
                        </div>

                        <div className="flex gap-6 pt-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.isFeatured}
                              onChange={(e) => setFormData((p) => ({ ...p, isFeatured: e.target.checked }))}
                              className="rounded border-white/10 bg-slate-900 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-xs font-bold text-gray-300">Featured Movie</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.isTrending}
                              onChange={(e) => setFormData((p) => ({ ...p, isTrending: e.target.checked }))}
                              className="rounded border-white/10 bg-slate-900 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-xs font-bold text-gray-300">Trending Movie</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {formTab === 'genres' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Select Genres *</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {genresList.map((genre) => {
                              const isChecked = formData.genres.includes(genre.id);
                              return (
                                <button
                                  key={genre.id}
                                  type="button"
                                  onClick={() => handleGenreToggle(genre.id)}
                                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                                    isChecked
                                      ? 'bg-purple-600/10 border-purple-500 text-purple-300 shadow-md glow-purple/10'
                                      : 'bg-white/2 border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                                  }`}
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-inner"
                                    style={{ backgroundColor: genre.colorHex || '#7c3aed' }}
                                  />
                                  <span className="text-xs font-semibold truncate">{genre.name}</span>
                                  {isChecked && <FiCheck className="ml-auto text-purple-400 flex-shrink-0" size={14} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Select Languages *</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {languagesList.map((lang) => {
                              const isChecked = formData.languages.includes(lang.id);
                              return (
                                <button
                                  key={lang.id}
                                  type="button"
                                  onClick={() => handleLanguageToggle(lang.id)}
                                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                                    isChecked
                                      ? 'bg-purple-600/10 border-purple-500 text-purple-300 shadow-md'
                                      : 'bg-white/2 border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                                  }`}
                                >
                                  <span className="text-xs font-black uppercase text-purple-400 flex-shrink-0 bg-purple-950/40 px-1.5 py-0.5 rounded">{lang.code}</span>
                                  <span className="text-xs font-semibold truncate">{lang.name}</span>
                                  {isChecked && <FiCheck className="ml-auto text-purple-400 flex-shrink-0" size={14} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {formTab === 'cast' && (
                      <div className="space-y-6">
                        {/* Cast Section */}
                        <div className="border border-white/5 p-4 rounded-xl bg-white/2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                            <FiUsers className="text-purple-400" />
                            Cast Members
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <input
                              type="text"
                              placeholder="Name (e.g. Leonardo DiCaprio)"
                              value={newCastName}
                              onChange={(e) => setNewCastName(e.target.value)}
                              className="input-field text-xs flex-1 min-w-[200px]"
                            />
                            <input
                              type="text"
                              placeholder="Character (e.g. Cobb)"
                              value={newCastCharacter}
                              onChange={(e) => setNewCastCharacter(e.target.value)}
                              className="input-field text-xs flex-1 min-w-[200px]"
                            />
                            <input
                              type="text"
                              placeholder="Photo URL"
                              value={newCastPhoto}
                              onChange={(e) => setNewCastPhoto(e.target.value)}
                              className="input-field text-xs flex-1 min-w-[200px]"
                            />
                            <button
                              type="button"
                              onClick={addCastMember}
                              className="btn-primary px-4 py-2 text-xs rounded-xl flex items-center gap-1 font-bold"
                            >
                              <FiPlus size={14} /> Add
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                            {formData.cast.map((c, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5 text-xs text-gray-300">
                                <div className="flex items-center gap-2.5">
                                  {c.photoUrl ? (
                                    <img src={c.photoUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-inner" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-purple-950/40 flex items-center justify-center text-purple-300"><FiUser size={12} /></div>
                                  )}
                                  <div>
                                    <span className="font-semibold text-white">{c.name}</span>
                                    {c.character && <span className="text-gray-400 block text-[10px] mt-0.5">as {c.character}</span>}
                                  </div>
                                </div>
                                <button type="button" onClick={() => removeCastMember(i)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors">
                                  <FiTrash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Crew Section */}
                        <div className="border border-white/5 p-4 rounded-xl bg-white/2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                            <FiUser className="text-purple-400" />
                            Crew Members
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <input
                              type="text"
                              placeholder="Name (e.g. Christopher Nolan)"
                              value={newCrewName}
                              onChange={(e) => setNewCrewName(e.target.value)}
                              className="input-field text-xs flex-1 min-w-[200px]"
                            />
                            <input
                              type="text"
                              placeholder="Role (e.g. Director)"
                              value={newCrewRole}
                              onChange={(e) => setNewCrewRole(e.target.value)}
                              className="input-field text-xs flex-1 min-w-[200px]"
                            />
                            <input
                              type="text"
                              placeholder="Photo URL"
                              value={newCrewPhoto}
                              onChange={(e) => setNewCrewPhoto(e.target.value)}
                              className="input-field text-xs flex-1 min-w-[200px]"
                            />
                            <button
                              type="button"
                              onClick={addCrewMember}
                              className="btn-primary px-4 py-2 text-xs rounded-xl flex items-center gap-1 font-bold"
                            >
                              <FiPlus size={14} /> Add
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                            {formData.crew.map((c, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5 text-xs text-gray-300">
                                <div className="flex items-center gap-2.5">
                                  {c.photoUrl ? (
                                    <img src={c.photoUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-inner" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-purple-950/40 flex items-center justify-center text-purple-300"><FiUser size={12} /></div>
                                  )}
                                  <div>
                                    <span className="font-semibold text-white">{c.name}</span>
                                    <span className="text-purple-400 block text-[10px] mt-0.5">{c.role}</span>
                                  </div>
                                </div>
                                <button type="button" onClick={() => removeCrewMember(i)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors">
                                  <FiTrash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 bg-black/30 border-t border-white/5 flex-shrink-0">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  {modalTab === 'form' && `Step: ${formTab === 'basic' ? 'Basic Info' : formTab === 'genres' ? 'Genres/Languages' : 'Cast/Crew'}`}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="btn-ghost px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/2"
                  >
                    Cancel
                  </button>
                  {modalTab === 'form' && (
                    <>
                      {formTab !== 'basic' && (
                        <button
                          type="button"
                          onClick={() => setFormTab(formTab === 'cast' ? 'genres' : 'basic')}
                          className="btn-ghost px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-white/5 hover:bg-white/2 text-white"
                        >
                          Back
                        </button>
                      )}
                      {formTab !== 'cast' ? (
                        <button
                          type="button"
                          onClick={() => setFormTab(formTab === 'basic' ? 'genres' : 'cast')}
                          className="btn-primary px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1 hover:scale-102 transition-transform active:scale-98"
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          disabled={createMutation.isPending}
                          className="btn-primary px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 hover:scale-102 transition-transform active:scale-98"
                        >
                          {createMutation.isPending ? <FiLoader className="animate-spin" size={16} /> : 'Save Movie'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
