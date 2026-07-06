import { authService } from '../services/auth.service.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { getIO } from '../socket/index.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
};

export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    const user = await authService.register({ firstName, lastName, email, password, phone });

    const io = getIO();
    if (io) {
      io.to('admin:dashboard').emit('admin:dashboard_update', {
        type: 'USER_REGISTERED',
        user: {
          id: user.id,
          firstName: user.firstName,
        }
      });
    }

    sendResponse(res, 201, { user }, 'Registration successful. Please verify your email.');
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login({ email, password, rememberMe, ipAddress, userAgent });

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    sendResponse(res, 200, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw new ApiError(401, 'Refresh token required');

    const tokens = await authService.refreshTokens(token);

    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);
    sendResponse(res, 200, { accessToken: tokens.accessToken }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logout(token);
    res.clearCookie('refreshToken');
    sendResponse(res, 200, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) throw new ApiError(400, 'Verification token required');

    const user = await authService.verifyEmail(token);
    sendResponse(res, 200, { user }, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.isEmailVerified) throw new ApiError(400, 'Email already verified');

    await authService.sendVerificationEmail(user.id, user.email, user.firstName);
    sendResponse(res, 200, null, 'Verification email sent');
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    sendResponse(res, 200, null, 'If this email exists, a reset link has been sent');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    sendResponse(res, 200, null, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    sendResponse(res, 200, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        avatarUrl: true,
        role: true,
        status: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        notificationSettings: true,
        _count: {
          select: { bookings: true, favorites: true, reviews: true },
        },
      },
    });
    sendResponse(res, 200, { user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender } = req.body;
    const avatarUrl = req.file?.path || undefined;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(avatarUrl && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        avatarUrl: true,
        role: true,
      },
    });

    sendResponse(res, 200, { user }, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

export const googleCallback = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = req.authInfo;
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    // Redirect to frontend with token
    res.redirect(
      `${config.cors.origins[0]}/auth/callback?token=${accessToken}&userId=${user.id}`
    );
  } catch (error) {
    next(error);
  }
};
