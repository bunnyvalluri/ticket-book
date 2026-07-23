import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { movieAPI } from '../services/api.js';
import { useUIStore } from '../store/index.js';
import MovieCard from '../components/movies/MovieCard.jsx';
import MovieSkeleton from '../components/movies/MovieSkeleton.jsx';
import HeroBanner from '../components/home/HeroBanner.jsx';
import MovieSlider from '../components/home/MovieSlider.jsx';
import GenreFilter from '../components/home/GenreFilter.jsx';
import { FALLBACK_MOVIES, FALLBACK_GENRES, FALLBACK_LANGUAGES } from '../data/fallbackData.js';
import { FiFilter, FiSearch, FiX, FiStar, FiFilm, FiCalendar } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeGenre, setActiveGenre] = useState('');
  const [activeLanguage, setActiveLanguage] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [minRating, setMinRating] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const searchQuery = searchParams.get('search') || '';
  const { selectedCity } = useUIStore();

  // Trending movies for hero banner
  const { data: trendingData } = useQuery({
    queryKey: ['trending-movies'],
    queryFn: () => movieAPI.getTrending({ limit: 5 }),
  });

  // Now showing movies
  const { data: nowShowingData, isLoading: nsLoading } = useQuery({
    queryKey: ['now-showing', selectedCity],
    queryFn: () => movieAPI.getNowShowing({ limit: 10, city: selectedCity }),
  });

  // Coming soon movies
  const { data: comingSoonData } = useQuery({
    queryKey: ['coming-soon'],
    queryFn: () => movieAPI.getComingSoon({ limit: 8 }),
  });

  // All movies with filters
  const { data: moviesData, isLoading } = useQuery({
    queryKey: ['movies', searchQuery, activeGenre, activeLanguage, sortBy, minRating, page],
    queryFn: () => movieAPI.getAll({
      search: searchQuery,
      genre: activeGenre,
      language: activeLanguage,
      sortBy,
      minRating,
      page,
      limit: 12,
    }),
    enabled: !!(searchQuery || activeGenre || activeLanguage || minRating || page > 1),
  });

  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: movieAPI.getGenres,
    staleTime: Infinity,
  });

  const { data: languagesData } = useQuery({
    queryKey: ['languages'],
    queryFn: movieAPI.getLanguages,
    staleTime: Infinity,
  });

  // Safe fallback computed lists
  const trendingMovies = trendingData?.data?.data?.movies?.length > 0
    ? trendingData.data.data.movies
    : FALLBACK_MOVIES.filter((m) => m.isTrending);

  const nowShowingMovies = nowShowingData?.data?.data?.movies?.length > 0
    ? nowShowingData.data.data.movies
    : FALLBACK_MOVIES.filter((m) => m.status === 'NOW_SHOWING');

  const comingSoonMovies = comingSoonData?.data?.data?.movies?.length > 0
    ? comingSoonData.data.data.movies
    : FALLBACK_MOVIES.filter((m) => m.status === 'COMING_SOON');

  const genresList = genresData?.data?.data?.genres?.length > 0
    ? genresData.data.data.genres
    : FALLBACK_GENRES;

  const languagesList = languagesData?.data?.data?.languages?.length > 0
    ? languagesData.data.data.languages
    : FALLBACK_LANGUAGES;

  const isFiltered = searchQuery || activeGenre || activeLanguage || minRating;

  return (
    <div className="min-h-screen pb-20">
      
      {/* Hero Showcase Banner */}
      {!isFiltered && trendingMovies.length > 0 && (
        <HeroBanner movies={trendingMovies} />
      )}

      <div className="container-app py-10">
        
        {/* Interactive Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          
          {searchQuery && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold glass-card border border-purple-500/50 text-purple-300">
              <FiSearch size={14} />
              <span>Search: "{searchQuery}"</span>
              <button onClick={() => { setSearchParams({}); }} className="ml-1 hover:text-white">
                <FiX size={14} />
              </button>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all glass-card ${
              filterOpen ? 'bg-purple-600 text-white border-purple-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FiFilter size={14} />
            <span>Filters</span>
            {(activeGenre || activeLanguage || minRating) && (
              <span className="w-5 h-5 text-[10px] font-extrabold rounded-full flex items-center justify-center bg-pink-500 text-white shadow-md">
                {[activeGenre, activeLanguage, minRating].filter(Boolean).length}
              </span>
            )}
          </motion.button>

          {/* Quick Genre Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar flex-1">
            {genresList.map((genre) => (
              <button
                key={genre.id}
                onClick={() => setActiveGenre(activeGenre === genre.slug ? '' : genre.slug)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all glass-card ${
                  activeGenre === genre.slug
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Drawer */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-10 p-6 sm:p-8 rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-slate-800 shadow-2xl space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Languages Filter */}
                <div className="lg:col-span-5 space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 font-heading flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    Languages
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {languagesList.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setActiveLanguage(activeLanguage === lang.code ? '' : lang.code)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                          activeLanguage === lang.code
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg glow-purple scale-105'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="lg:col-span-4 space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 font-heading flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Min IMDb Score
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[6, 7, 7.5, 8, 8.5].map((r) => (
                      <button
                        key={r}
                        onClick={() => setMinRating(minRating == r ? '' : r)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 ${
                          minRating == r
                            ? 'bg-amber-400 text-slate-950 font-black shadow-lg glow-gold scale-105'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        <FiStar size={12} className={minRating == r ? 'fill-slate-950 text-slate-950' : 'fill-amber-400 text-amber-400'} />
                        <span>{r}+</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort dropdown */}
                <div className="lg:col-span-3 space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 font-heading flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 text-xs font-bold rounded-xl px-4 py-2.5 border border-slate-700/80 focus:border-purple-500 focus:outline-none shadow-md cursor-pointer"
                  >
                    <option value="createdAt" className="bg-slate-900">Recently Added</option>
                    <option value="releaseDate" className="bg-slate-900">Release Date</option>
                    <option value="imdbRating" className="bg-slate-900">Top IMDb Rating</option>
                    <option value="title" className="bg-slate-900">Title (A-Z)</option>
                  </select>
                </div>
              </div>

              {(activeGenre || activeLanguage || minRating) && (
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => { setActiveGenre(''); setActiveLanguage(''); setMinRating(''); }}
                    className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1.5 transition-colors"
                  >
                    <FiX size={14} /> Clear all active filters
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Display Movies Grid / Sections */}
        {isFiltered ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Filtered Blockbusters'}
                {moviesData?.data?.data?.pagination?.total > 0 && (
                  <span className="text-xs font-normal text-slate-400 ml-2">
                    ({moviesData.data.data.pagination.total} movies found)
                  </span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {[...Array(12)].map((_, i) => <MovieSkeleton key={i} />)}
              </div>
            ) : (moviesData?.data?.data?.movies || FALLBACK_MOVIES).length === 0 ? (
              <div className="text-center py-24 glass-card rounded-3xl border border-white/10 my-8">
                <FiFilm className="text-5xl text-purple-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-lg font-bold text-white mb-1">No movies match your criteria</h3>
                <p className="text-xs text-slate-400">Try tweaking your filters or search keywords</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {(moviesData?.data?.data?.movies || FALLBACK_MOVIES).map((movie, i) => (
                  <MovieCard key={movie.id} movie={movie} index={i} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Now Showing Section */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <HiSparkles className="text-purple-400" />
                    Now Showing
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Experience live blockbusters in {selectedCity}</p>
                </div>
              </div>

              {nsLoading && !nowShowingMovies.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {[...Array(5)].map((_, i) => <MovieSkeleton key={i} />)}
                </div>
              ) : (
                <MovieSlider movies={nowShowingMovies} />
              )}
            </section>

            {/* Genre Categories */}
            <GenreFilter genres={genresList} onSelect={setActiveGenre} active={activeGenre} />

            {/* Coming Soon Section */}
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <FiCalendar className="text-pink-400" />
                    Coming Soon
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Upcoming releases & premiere tickets</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-5">
                {comingSoonMovies.map((movie, i) => (
                  <MovieCard key={movie.id} movie={movie} index={i} />
                ))}
              </div>
            </section>
          </>
        )}

      </div>
    </div>
  );
}
