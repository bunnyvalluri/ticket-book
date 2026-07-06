import prisma from '../config/database.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// Get all movies with filters & pagination
export const getMovies = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      status,
      genre,
      language,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isFeatured,
      isTrending,
      minRating,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      deletedAt: null,
      isActive: true,
      ...(status && { status }),
      ...(isFeatured === 'true' && { isFeatured: true }),
      ...(isTrending === 'true' && { isTrending: true }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { synopsis: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(genre && {
        genres: { some: { genre: { slug: genre } } },
      }),
      ...(language && {
        languages: { some: { language: { code: language } } },
      }),
      ...(minRating && { imdbRating: { gte: parseFloat(minRating) } }),
    };

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          genres: { include: { genre: true } },
          languages: { include: { language: true } },
          _count: { select: { reviews: true, ratings: true } },
        },
      }),
      prisma.movie.count({ where }),
    ]);

    sendResponse(res, 200, {
      movies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: skip + movies.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single movie by slug
export const getMovieBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const movie = await prisma.movie.findUnique({
      where: { slug, deletedAt: null },
      include: {
        genres: { include: { genre: true } },
        languages: { include: { language: true } },
        cast: { orderBy: { order: 'asc' } },
        crew: true,
        gallery: { orderBy: { order: 'asc' } },
        reviews: {
          where: { isApproved: true },
          include: {
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reviews: true, ratings: true, wishlist: true } },
      },
    });

    if (!movie) throw new ApiError(404, 'Movie not found');

    // Avg rating
    const avgRating = await prisma.rating.aggregate({
      where: { movieId: movie.id },
      _avg: { score: true },
    });

    // User wishlist/favorite status
    let userWishlisted = false;
    let userFavorited = false;
    let userRating = null;

    if (req.user) {
      const [wish, fav, rating] = await Promise.all([
        prisma.wishlist.findUnique({
          where: { userId_movieId: { userId: req.user.id, movieId: movie.id } },
        }),
        prisma.favorite.findUnique({
          where: { userId_movieId: { userId: req.user.id, movieId: movie.id } },
        }),
        prisma.rating.findUnique({
          where: { userId_movieId: { userId: req.user.id, movieId: movie.id } },
        }),
      ]);
      userWishlisted = !!wish;
      userFavorited = !!fav;
      userRating = rating?.score || null;
    }

    sendResponse(res, 200, {
      movie: {
        ...movie,
        avgRating: avgRating._avg.score || 0,
        userWishlisted,
        userFavorited,
        userRating,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get movies by status (now showing / coming soon)
export const getNowShowing = async (req, res, next) => {
  req.query.status = 'NOW_SHOWING';
  req.query.limit = req.query.limit || 20;
  return getMovies(req, res, next);
};

export const getComingSoon = async (req, res, next) => {
  req.query.status = 'COMING_SOON';
  req.query.limit = req.query.limit || 20;
  return getMovies(req, res, next);
};

export const getTrending = async (req, res, next) => {
  req.query.isTrending = 'true';
  req.query.limit = req.query.limit || 10;
  return getMovies(req, res, next);
};

// Create movie (admin)
export const createMovie = async (req, res, next) => {
  try {
    const {
      title, synopsis, tagline, duration, releaseDate, endDate,
      imdbRating, status, ageRating, country, genres, languages,
      cast, crew, isFeatured, isTrending, metaTitle, metaDescription,
    } = req.body;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const posterUrl = req.files?.poster?.[0]?.path || req.body.posterUrl;
    const bannerUrl = req.files?.banner?.[0]?.path || req.body.bannerUrl;
    const trailerUrl = req.body.trailerUrl;

    const genresParsed = typeof genres === 'string' ? JSON.parse(genres) : genres;
    const languagesParsed = typeof languages === 'string' ? JSON.parse(languages) : languages;
    const castParsed = typeof cast === 'string' ? JSON.parse(cast) : cast;
    const crewParsed = typeof crew === 'string' ? JSON.parse(crew) : crew;

    const movie = await prisma.movie.create({
      data: {
        title,
        slug: `${slug}-${Date.now()}`,
        synopsis,
        tagline,
        posterUrl,
        bannerUrl,
        trailerUrl,
        duration: duration ? parseInt(duration) : 120,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        imdbRating: imdbRating ? parseFloat(imdbRating) : null,
        status: status || 'COMING_SOON',
        ageRating,
        country,
        isFeatured: isFeatured === 'true' || isFeatured === true,
        isTrending: isTrending === 'true' || isTrending === true,
        metaTitle: metaTitle || title,
        metaDescription,
        ...(genresParsed?.length && {
          genres: {
            create: genresParsed.map((genreId) => ({ genreId })),
          },
        }),
        ...(languagesParsed?.length && {
          languages: {
            create: languagesParsed.map((languageId) => ({ languageId })),
          },
        }),
        ...(castParsed?.length && {
          cast: {
            create: castParsed.map((c, i) => ({ ...c, order: i })),
          },
        }),
        ...(crewParsed?.length && {
          crew: {
            create: crewParsed,
          },
        }),
      },
      include: {
        genres: { include: { genre: true } },
        languages: { include: { language: true } },
      },
    });

    sendResponse(res, 201, { movie }, 'Movie created successfully');
  } catch (error) {
    next(error);
  }
};

// Update movie (admin)
export const updateMovie = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (req.files?.poster?.[0]) updates.posterUrl = req.files.poster[0].path;
    if (req.files?.banner?.[0]) updates.bannerUrl = req.files.banner[0].path;
    if (updates.duration) updates.duration = parseInt(updates.duration);
    if (updates.imdbRating) updates.imdbRating = parseFloat(updates.imdbRating);
    if (updates.releaseDate) updates.releaseDate = new Date(updates.releaseDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    if (updates.isFeatured !== undefined) updates.isFeatured = updates.isFeatured === 'true';
    if (updates.isTrending !== undefined) updates.isTrending = updates.isTrending === 'true';

    // Remove relational fields
    delete updates.genres; delete updates.languages;
    delete updates.cast; delete updates.crew;

    const movie = await prisma.movie.update({
      where: { id, deletedAt: null },
      data: updates,
    });

    sendResponse(res, 200, { movie }, 'Movie updated');
  } catch (error) {
    next(error);
  }
};

// Delete movie (admin)
export const deleteMovie = async (req, res, next) => {
  try {
    await prisma.movie.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    sendResponse(res, 200, null, 'Movie deleted');
  } catch (error) {
    next(error);
  }
};

// Get all genres
export const getGenres = async (req, res, next) => {
  try {
    const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' } });
    sendResponse(res, 200, { genres });
  } catch (error) {
    next(error);
  }
};

// Get all languages
export const getLanguages = async (req, res, next) => {
  try {
    const languages = await prisma.language.findMany({ orderBy: { name: 'asc' } });
    sendResponse(res, 200, { languages });
  } catch (error) {
    next(error);
  }
};

// Toggle wishlist
export const toggleWishlist = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const userId = req.user.id;

    const existing = await prisma.wishlist.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { userId_movieId: { userId, movieId } } });
      sendResponse(res, 200, { wishlisted: false }, 'Removed from wishlist');
    } else {
      await prisma.wishlist.create({ data: { userId, movieId } });
      sendResponse(res, 200, { wishlisted: true }, 'Added to wishlist');
    }
  } catch (error) {
    next(error);
  }
};

// Toggle favorite
export const toggleFavorite = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const userId = req.user.id;

    const existing = await prisma.favorite.findUnique({
      where: { userId_movieId: { userId, movieId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { userId_movieId: { userId, movieId } } });
      sendResponse(res, 200, { favorited: false }, 'Removed from favorites');
    } else {
      await prisma.favorite.create({ data: { userId, movieId } });
      sendResponse(res, 200, { favorited: true }, 'Added to favorites');
    }
  } catch (error) {
    next(error);
  }
};

// Add review
export const addReview = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const { title, content, score, spoiler } = req.body;
    const userId = req.user.id;

    // Upsert rating
    if (score) {
      await prisma.rating.upsert({
        where: { userId_movieId: { userId, movieId } },
        create: { userId, movieId, score: parseFloat(score) },
        update: { score: parseFloat(score) },
      });
    }

    const review = await prisma.review.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId, title, content, spoiler: spoiler || false },
      update: { title, content, spoiler: spoiler || false },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    sendResponse(res, 201, { review }, 'Review submitted');
  } catch (error) {
    next(error);
  }
};
