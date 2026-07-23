import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FiMapPin, FiSearch, FiWifi, FiInfo, FiLoader, 
  FiCompass, FiActivity, FiArrowRight 
} from 'react-icons/fi';
import { format } from 'date-fns';
import { theatreAPI, showAPI } from '../services/api.js';
import { useUIStore, useBookingStore } from '../store/index.js';
import { FALLBACK_THEATRES, FALLBACK_SHOWS } from '../data/fallbackData.js';
import toast from 'react-hot-toast';

export default function Theatres() {
  const navigate = useNavigate();
  const { selectedCity } = useUIStore();
  const { setCurrentShow, clearBooking } = useBookingStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Facilities filter state
  const [filters, setFilters] = useState({
    hasParking: false,
    hasFoodCourt: false,
    hasWifi: false,
    hasWheelchair: false,
  });

  // Fetch theatres in selected city
  const { data: theatresResponse, isLoading: theatresLoading } = useQuery({
    queryKey: ['theatres', selectedCity],
    queryFn: () => theatreAPI.getAll({ city: selectedCity }),
  });

  const apiTheatres = theatresResponse?.data?.data?.theatres;
  const theatresByCity = (apiTheatres && apiTheatres.length > 0)
    ? apiTheatres
    : FALLBACK_THEATRES.filter((t) => t.city.toLowerCase() === (selectedCity || 'hyderabad').toLowerCase());
  const theatres = theatresByCity.length > 0 ? theatresByCity : FALLBACK_THEATRES;

  // Fetch all shows today to show what is playing at each theatre
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: showsResponse, isLoading: showsLoading } = useQuery({
    queryKey: ['today-shows', selectedCity],
    queryFn: () => showAPI.getAll({ date: todayStr }),
  });

  const apiShows = showsResponse?.data?.data?.shows;
  const todayShows = (apiShows && apiShows.length > 0) ? apiShows : FALLBACK_SHOWS;

  // Filter shows by selected city
  const cityShows = (todayShows && todayShows.length > 0) ? todayShows : FALLBACK_SHOWS;

  // Group shows by Theatre and Movie
  const theatreMovies = cityShows.reduce((acc, show) => {
    const theatreId = show.screen?.theatreId;
    const movie = show.movie;
    if (!theatreId || !movie) return acc;
    
    if (!acc[theatreId]) {
      acc[theatreId] = {};
    }
    
    if (!acc[theatreId][movie.title]) {
      acc[theatreId][movie.title] = {
        movieInfo: movie,
        shows: [],
      };
    }
    
    acc[theatreId][movie.title].shows.push(show);
    return acc;
  }, {});

  // Handle facility toggle
  const toggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter theatres based on search term and facility checkboxes
  const filteredTheatres = theatres.filter((theatre) => {
    // Search filter
    const matchesSearch = theatre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      theatre.address.toLowerCase().includes(searchTerm.toLowerCase());
      
    // Facility filters
    const matchesParking = !filters.hasParking || theatre.hasParking;
    const matchesFood = !filters.hasFoodCourt || theatre.hasFoodCourt;
    const matchesWifi = !filters.hasWifi || theatre.hasWifi;
    const matchesWheelchair = !filters.hasWheelchair || theatre.hasWheelchair;

    return matchesSearch && matchesParking && matchesFood && matchesWifi && matchesWheelchair;
  });

  const handleShowClick = (show) => {
    clearBooking();
    setCurrentShow(show);
    navigate(`/shows/${show.id}/seats`);
  };

  return (
    <div className="min-h-screen pb-20 pt-8" style={{ background: '#0a0a12' }}>
      <div className="container-app space-y-8">
        
        {/* Header */}
        <div className="text-center md:text-left space-y-2">
          <span className="text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full text-purple-400" style={{ background: 'rgba(124,58,237,0.1)' }}>
            🏢 Theatres List
          </span>
          <h1 className="text-4xl font-black">Cinema Halls in {selectedCity}</h1>
          <p style={{ color: '#a0a0c0' }} className="text-sm">
            Find details of premium multiplexes and theatres near you.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="card p-6 flex flex-col md:flex-row gap-6 justify-between items-center">
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#606080' }} size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or address..."
              className="input-field pl-12"
            />
          </div>

          {/* Facility Checkboxes */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {[
              { key: 'hasParking', label: '🅿️ Parking' },
              { key: 'hasFoodCourt', label: '🍔 Food Court' },
              { key: 'hasWifi', label: '📶 Wifi' },
              { key: 'hasWheelchair', label: '♿ Wheelchair' }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => toggleFilter(f.key)}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none"
                style={{
                  background: filters[f.key] ? '#7c3aed' : '#1e1e35',
                  borderColor: filters[f.key] ? '#7c3aed' : '#2d2d4a',
                  color: filters[f.key] ? 'white' : '#a0a0c0'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theatres Grid/List */}
        {theatresLoading || showsLoading ? (
          <div className="flex justify-center py-20">
            <FiLoader size={48} className="animate-spin text-purple-500" />
          </div>
        ) : filteredTheatres.length === 0 ? (
          <div className="text-center py-16 card border border-dashed" style={{ borderColor: '#2d2d4a' }}>
            <FiCompass size={48} className="mx-auto text-purple-400 mb-4" />
            <h3 className="text-xl font-bold mb-1">No Theatres Found</h3>
            <p style={{ color: '#606080' }} className="text-sm">
              We couldn't find any theatres matching your search or filters.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTheatres.map((theatre) => {
              const moviesAtTheatre = theatreMovies[theatre.id] || {};
              const moviesList = Object.values(moviesAtTheatre);

              return (
                <div 
                  key={theatre.id} 
                  className="card p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start hover:border-purple-500 transition-all duration-300"
                >
                  {/* Theatre Details column */}
                  <div className="w-full lg:w-80 shrink-0 space-y-4">
                    <div>
                      <h3 className="text-2xl font-black text-white">{theatre.name}</h3>
                      <p className="text-xs flex items-center gap-1 mt-1.5" style={{ color: '#a0a0c0' }}>
                        <FiMapPin size={14} className="text-purple-400 shrink-0" />
                        <span>{theatre.address}, {theatre.city}</span>
                      </p>
                    </div>

                    {/* Facility Tags */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {theatre.hasParking && <span className="text-[10px] px-2.5 py-1 rounded bg-[#12121e] border font-bold" style={{ borderColor: '#2d2d4a', color: '#a0a0c0' }}>🅿️ Parking</span>}
                      {theatre.hasFoodCourt && <span className="text-[10px] px-2.5 py-1 rounded bg-[#12121e] border font-bold" style={{ borderColor: '#2d2d4a', color: '#a0a0c0' }}>🍔 Food Court</span>}
                      {theatre.hasWifi && <span className="text-[10px] px-2.5 py-1 rounded bg-[#12121e] border font-bold" style={{ borderColor: '#2d2d4a', color: '#a0a0c0' }}>📶 Free Wifi</span>}
                      {theatre.hasWheelchair && <span className="text-[10px] px-2.5 py-1 rounded bg-[#12121e] border font-bold" style={{ borderColor: '#2d2d4a', color: '#a0a0c0' }}>♿ Access</span>}
                    </div>

                    <div className="text-xs space-y-1.5 pt-2" style={{ color: '#606080' }}>
                      <p>🕒 Timing: {theatre.openingTime || '09:00 AM'} - {theatre.closingTime || '11:00 PM'}</p>
                      {theatre.phone && <p>📞 Phone: {theatre.phone}</p>}
                      {theatre.email && <p>📧 Email: {theatre.email}</p>}
                    </div>
                  </div>

                  {/* Shows / Playing today column */}
                  <div className="flex-1 w-full space-y-6">
                    <h4 className="text-sm font-extrabold uppercase tracking-widest border-b pb-2 flex items-center gap-2" style={{ borderColor: '#2d2d4a', color: '#606080' }}>
                      <FiActivity size={14} className="text-green-500 animate-pulse" /> Playing Today
                    </h4>
                    
                    {moviesList.length === 0 ? (
                      <p className="text-sm italic" style={{ color: '#606080' }}>
                        No movies scheduled for today at this theatre. Check back later!
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {moviesList.map(({ movieInfo, shows }) => (
                          <div 
                            key={movieInfo.title} 
                            className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl"
                            style={{ background: '#12121e', border: '1px solid #2d2d4a' }}
                          >
                            {/* Movie poster info */}
                            <div className="w-16 sm:w-20 shrink-0">
                              <img 
                                src={movieInfo.posterUrl || 'https://images.unsplash.com/photo-1542204172-e7052809f852?w=100&q=80'} 
                                alt={movieInfo.title}
                                className="w-full aspect-[2/3] object-cover rounded-lg border"
                                style={{ borderColor: '#2d2d4a' }}
                              />
                            </div>

                            <div className="flex-1 space-y-3">
                              <div>
                                <h5 className="font-extrabold text-white text-base leading-snug">{movieInfo.title}</h5>
                                <span className="text-[10px] font-bold text-amber-500 mr-2">{movieInfo.ageRating || 'U/A'}</span>
                                <span className="text-[10px]" style={{ color: '#606080' }}>{movieInfo.duration} mins</span>
                              </div>

                              {/* Showtime buttons */}
                              <div className="flex flex-wrap gap-2">
                                {shows.map((show) => {
                                  const showTime = format(new Date(show.startTime), 'hh:mm a');
                                  const isSoldOut = show.availability === 'SOLD_OUT';
                                  const isFilling = show.availability === 'FILLING_FAST';

                                  return (
                                    <button
                                      key={show.id}
                                      disabled={isSoldOut}
                                      onClick={() => handleShowClick(show)}
                                      className="px-3 py-1.5 rounded-lg border text-center transition-all cursor-pointer font-semibold"
                                      style={{
                                        background: '#1a1a2e',
                                        borderColor: isSoldOut ? '#2d2d2d' : isFilling ? '#f59e0b' : '#3d3d5c',
                                        opacity: isSoldOut ? 0.4 : 1,
                                      }}
                                    >
                                      <span className="text-white text-xs block">{showTime}</span>
                                      <span className="text-[8px] uppercase block tracking-wider mt-0.5" style={{
                                        color: isSoldOut ? '#ef4444' : isFilling ? '#f59e0b' : '#10b981'
                                      }}>
                                        {show.format.replace('_', ' ')}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
