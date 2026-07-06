import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import * as tmdbCtrl from '../controllers/tmdb.controller.js';

const router = express.Router();

// Only Admins or Super Admins can access TMDB import features
router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/search', tmdbCtrl.searchMovies);
router.get('/details/:id', tmdbCtrl.getMovieDetails);

export default router;
