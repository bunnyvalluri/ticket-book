import { config } from '../config/index.js';
import prisma from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { sendResponse } from '../utils/ApiResponse.js';

const getHeaders = () => {
  const token = config.tmdb.readAccessToken;
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
};

export const searchMovies = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      throw new ApiError(400, 'Search query is required');
    }

    const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.status_message || 'Failed to search movies from TMDB');
    }

    const data = await response.json();
    
    // Map minimal search details for listing
    const movies = (data.results || []).map((m) => ({
      tmdbId: m.id,
      title: m.title,
      releaseDate: m.release_date,
      posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
      bannerUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
      synopsis: m.overview,
      rating: m.vote_average,
    }));

    sendResponse(res, 200, { movies }, 'Movies searched successfully');
  } catch (error) {
    next(error);
  }
};

export const getMovieDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ApiError(400, 'TMDB Movie ID is required');
    }

    const url = `https://api.themoviedb.org/3/movie/${id}?append_to_response=credits,videos&language=en-US`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.status_message || 'Failed to fetch movie details from TMDB');
    }

    const movieData = await response.json();

    // 1. Map trailer URL (look for YouTube Trailer)
    let trailerUrl = '';
    if (movieData.videos && movieData.videos.results) {
      const trailer = movieData.videos.results.find(
        (v) => v.site === 'YouTube' && v.type === 'Trailer'
      ) || movieData.videos.results.find((v) => v.site === 'YouTube');
      if (trailer) {
        trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
      }
    }

    // 2. Fetch local genres & languages from the DB to map them
    const [localGenres, localLanguages] = await Promise.all([
      prisma.genre.findMany(),
      prisma.language.findMany(),
    ]);

    // Map TMDB genres to local genres
    const genresMapped = [];
    if (movieData.genres) {
      for (const tmdbGenre of movieData.genres) {
        const nameLower = tmdbGenre.name.toLowerCase();
        // Check if there is an exact or slug match
        const matched = localGenres.find(
          (g) => g.name.toLowerCase() === nameLower || g.slug === nameLower.replace(/[^a-z0-9]/g, '-')
        );
        if (matched) {
          genresMapped.push(matched.id);
        } else {
          // If genre doesn't exist, create it dynamically
          const slug = nameLower.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
          const randomColors = ['#ef4444', '#8b5cf6', '#f59e0b', '#1d4ed8', '#7f1d1d', '#ec4899', '#06b6d4', '#10b981', '#f97316', '#6366f1'];
          const colorHex = randomColors[Math.floor(Math.random() * randomColors.length)];
          const newGenre = await prisma.genre.create({
            data: { name: tmdbGenre.name, slug, colorHex },
          });
          // Update local genres list so we don't duplicate
          localGenres.push(newGenre);
          genresMapped.push(newGenre.id);
        }
      }
    }

    // Map spoken languages to local languages
    const languagesMapped = [];
    if (movieData.spoken_languages) {
      for (const tmdbLang of movieData.spoken_languages) {
        const code = tmdbLang.iso_639_1;
        const matched = localLanguages.find((l) => l.code === code);
        if (matched) {
          languagesMapped.push(matched.id);
        } else {
          // If language doesn't exist, create it dynamically
          const newLang = await prisma.language.create({
            data: {
              name: tmdbLang.english_name || tmdbLang.name,
              code: code,
              nativeName: tmdbLang.name,
            },
          });
          localLanguages.push(newLang);
          languagesMapped.push(newLang.id);
        }
      }
    }

    // If no languages were mapped, default to English if available
    if (languagesMapped.length === 0) {
      const englishLang = localLanguages.find((l) => l.code === 'en');
      if (englishLang) languagesMapped.push(englishLang.id);
    }

    // 3. Map cast (first 10 members)
    const castMapped = [];
    if (movieData.credits && movieData.credits.cast) {
      const topCast = movieData.credits.cast.slice(0, 10);
      for (const c of topCast) {
        castMapped.push({
          name: c.name,
          character: c.character,
          photoUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        });
      }
    }

    // 4. Map crew (Director & Producer key roles)
    const crewMapped = [];
    if (movieData.credits && movieData.credits.crew) {
      const targetJobs = ['Director', 'Producer', 'Screenplay', 'Writer'];
      const keyCrew = movieData.credits.crew.filter((c) => targetJobs.includes(c.job)).slice(0, 5);
      for (const c of keyCrew) {
        crewMapped.push({
          name: c.name,
          role: c.job,
          photoUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        });
      }
    }

    // Mapped movie model
    const movieDetails = {
      title: movieData.title,
      synopsis: movieData.overview,
      tagline: movieData.tagline,
      duration: movieData.runtime || 120, // default 2h if null
      releaseDate: movieData.release_date || null,
      imdbRating: movieData.vote_average ? parseFloat(movieData.vote_average.toFixed(1)) : null,
      imdbId: movieData.imdb_id || null,
      posterUrl: movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : null,
      bannerUrl: movieData.backdrop_path ? `https://image.tmdb.org/t/p/original${movieData.backdrop_path}` : null,
      trailerUrl: trailerUrl,
      country: movieData.production_countries?.[0]?.name || movieData.origin_country?.[0] || 'USA',
      ageRating: movieData.adult ? 'A' : 'U/A', // simple default mapping
      genres: genresMapped,
      languages: languagesMapped,
      cast: castMapped,
      crew: crewMapped,
    };

    sendResponse(res, 200, { movie: movieDetails }, 'Movie details fetched and mapped successfully');
  } catch (error) {
    next(error);
  }
};
