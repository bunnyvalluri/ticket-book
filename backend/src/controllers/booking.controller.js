import prisma from '../config/database.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { paymentService } from '../services/payment.service.js';
import { emailService } from '../services/email.service.js';
import { ticketService } from '../services/ticket.service.js';
import { getIO } from '../socket/index.js';
import { createNotification } from '../services/notification.service.js';
import logger from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Create booking (initiate)
export const createBooking = async (req, res, next) => {
  try {
    const { showId, seatIds, couponCode } = req.body;
    const userId = req.user.id;
    const sessionId = uuidv4();

    // Validate seats
    if (!seatIds?.length) throw new ApiError(400, 'At least one seat required');
    if (seatIds.length > 10) throw new ApiError(400, 'Maximum 10 seats per booking');

    // Check show exists and is active
    const show = await prisma.show.findUnique({
      where: { id: showId, isActive: true },
      include: { screen: { include: { theatre: true } }, movie: true, language: true },
    });
    if (!show) throw new ApiError(404, 'Show not found or unavailable');
    if (show.startTime < new Date()) throw new ApiError(400, 'Show already started');

    // Check seat availability (prevent double booking)
    const bookedOrLocked = await prisma.$transaction(async (tx) => {
      // Check already booked
      const booked = await tx.bookingSeat.count({
        where: {
          seatId: { in: seatIds },
          booking: {
            showId,
            status: { in: ['CONFIRMED', 'PENDING'] },
          },
        },
      });

      // Check locked by others
      const locked = await tx.seatLock.count({
        where: {
          seatId: { in: seatIds },
          showId,
          isReleased: false,
          expiresAt: { gt: new Date() },
          userId: { not: userId },
        },
      });

      return booked + locked;
    });

    if (bookedOrLocked > 0) {
      throw new ApiError(409, 'One or more seats are no longer available');
    }

    // Get seat pricing
    const seatPricings = await prisma.seatPricing.findMany({
      where: { showId, seatId: { in: seatIds } },
      include: { seat: true },
    });

    // Fallback pricing if not set
    const seats = await prisma.seat.findMany({
      where: { id: { in: seatIds } },
    });

    const getPrice = (seatId) => {
      const pricing = seatPricings.find((sp) => sp.seatId === seatId);
      if (pricing) return { price: pricing.price, convenienceFee: pricing.convenienceFee };
      const seat = seats.find((s) => s.id === seatId);
      const defaultPrices = { SILVER: 150, GOLD: 200, PREMIUM: 280, PLATINUM: 350, VIP: 450, RECLINER: 500, COUPLE: 600, WHEELCHAIR: 150 };
      return { price: defaultPrices[seat?.seatType] || 200, convenienceFee: 20 };
    };

    // Calculate amounts
    let totalAmount = 0;
    let totalConvenience = 0;

    const seatBookings = seatIds.map((seatId) => {
      const { price, convenienceFee } = getPrice(seatId);
      const seat = seats.find((s) => s.id === seatId);
      totalAmount += price;
      totalConvenience += convenienceFee;
      return { seatId, price, seatType: seat?.seatType || 'SILVER' };
    });

    // Apply coupon
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          status: 'ACTIVE',
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (!coupon) throw new ApiError(400, 'Invalid or expired coupon');
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new ApiError(400, 'Coupon usage limit reached');
      }
      if (totalAmount < coupon.minOrderAmount) {
        throw new ApiError(400, `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`);
      }

      // Check user usage
      const userUsed = await prisma.booking.count({
        where: { userId, couponCode: couponCode.toUpperCase(), status: { not: 'CANCELLED' } },
      });
      if (userUsed >= coupon.userUsageLimit) {
        throw new ApiError(400, 'Coupon already used by this account');
      }

      if (coupon.type === 'PERCENTAGE') {
        discountAmount = (totalAmount * coupon.value) / 100;
        if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      } else if (coupon.type === 'FLAT') {
        discountAmount = Math.min(coupon.value, totalAmount);
      }

      appliedCoupon = coupon;
    }

    const gstAmount = ((totalAmount - discountAmount) * 0.18);
    const grandTotal = totalAmount - discountAmount + totalConvenience + gstAmount;

    // Generate booking number
    const date = new Date();
    const bookingNumber = `CMAX-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create booking in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Lock seats
      await tx.seatLock.createMany({
        data: seatIds.map((seatId) => ({
          showId,
          seatId,
          userId,
          sessionId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
        })),
        skipDuplicates: true,
      });

      // Create booking
      return tx.booking.create({
        data: {
          bookingNumber,
          userId,
          showId,
          status: 'PENDING',
          totalAmount,
          discountAmount,
          convenienceFee: totalConvenience,
          gstAmount,
          grandTotal,
          couponId: appliedCoupon?.id || null,
          couponCode: couponCode?.toUpperCase() || null,
          sessionId,
          seats: {
            create: seatBookings,
          },
        },
        include: {
          seats: { include: { seat: true } },
          show: { include: { movie: true, screen: { include: { theatre: true } }, language: true } },
        },
      });
    });

    // Create Razorpay order
    const order = await paymentService.createOrder({
      amount: grandTotal,
      currency: 'INR',
      receipt: booking.bookingNumber,
      notes: { bookingId: booking.id, userId },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        razorpayOrderId: order.id,
        amount: grandTotal,
        status: 'PENDING',
      },
    });

    // Notify via socket
    const io = getIO();
    if (io) {
      seatIds.forEach((seatId) => {
        io.to(`show:${showId}`).emit('seat:locked', {
          seatId,
          showId,
          userId,
          sessionId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
      });
    }

    sendResponse(res, 201, {
      booking,
      order: {
        id: order.id,
        amount: grandTotal,
        currency: 'INR',
        isDemoMode: order.isDemoMode || paymentService.isDemo,
      },
      razorpayKeyId: paymentService.keyId,
      sessionId,
    }, 'Booking initiated. Complete payment to confirm.');
  } catch (error) {
    next(error);
  }
};

// Confirm payment
export const confirmPayment = async (req, res, next) => {
  try {
    const {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, userId: req.user.id },
      include: {
        payment: true,
        seats: { include: { seat: true } },
        show: { include: { movie: true, screen: { include: { theatre: true } }, language: true } },
        user: true,
      },
    });

    if (!booking) throw new ApiError(404, 'Booking not found');
    if (booking.status !== 'PENDING') throw new ApiError(400, 'Booking already processed');

    // Verify payment signature
    const isValid = paymentService.verifySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });
      await prisma.payment.update({
        where: { bookingId },
        data: { status: 'FAILED', failureReason: 'Signature verification failed' },
      });
      throw new ApiError(400, 'Payment verification failed');
    }

    // Update booking and payment
    const [updatedBooking] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      }),
      prisma.payment.update({
        where: { bookingId },
        data: {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      }),
      // Release seat locks (they're booked now)
      prisma.seatLock.updateMany({
        where: { showId: booking.showId, userId: req.user.id },
        data: { isReleased: true },
      }),
      // Update coupon usage if applied
      ...(booking.couponId
        ? [prisma.coupon.update({
            where: { id: booking.couponId },
            data: { usedCount: { increment: 1 } },
          })]
        : []),
    ]);

    // Generate QR and PDF
    const qrDataUrl = await ticketService.generateQRCode({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      userId: req.user.id,
      showId: booking.showId,
      seats: booking.seats.map((s) => s.seat.label),
    });

    const pdfBuffer = await ticketService.generatePDFTicket({
      ...booking,
      payment: { razorpayPaymentId },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { qrCodeUrl: qrDataUrl },
    });

    // Send confirmation email
    emailService.sendBookingConfirmation(
      booking.user.email,
      booking.user.firstName,
      { ...booking, qrCodeUrl: qrDataUrl },
      pdfBuffer
    ).catch(() => {});

    // Notify socket
    const io = getIO();
    if (io) {
      booking.seats.forEach(({ seat }) => {
        io.to(`show:${booking.showId}`).emit('seat:booked', {
          seatId: seat.id,
          showId: booking.showId,
        });
      });
      io.to(`user:${req.user.id}`).emit('booking:confirmed', {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
      });
      io.to('admin:dashboard').emit('admin:dashboard_update', {
        type: 'BOOKING_CONFIRMED',
        booking: {
          id: booking.id,
          grandTotal: booking.grandTotal,
        }
      });
    }

    // Create notification
    await createNotification({
      userId: req.user.id,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed! 🎫',
      message: `Your booking ${booking.bookingNumber} for ${booking.show.movie.title} is confirmed.`,
      data: { bookingId: booking.id },
    }).catch((err) => logger.error('Real-time confirmation notification failed:', err));

    sendResponse(res, 200, {
      booking: { ...updatedBooking, qrCodeUrl: qrDataUrl },
      pdfUrl: `/api/bookings/${bookingId}/ticket`,
    }, 'Payment confirmed. Booking successful!');
  } catch (error) {
    next(error);
  }
};

// Get user bookings
export const getUserBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id,
      ...(status && { status }),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          seats: { include: { seat: true } },
          show: {
            include: {
              movie: { select: { title: true, posterUrl: true, slug: true } },
              screen: { include: { theatre: { select: { name: true, city: true } } } },
              language: true,
            },
          },
          payment: { select: { status: true, method: true, paidAt: true, razorpayPaymentId: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    sendResponse(res, 200, {
      bookings,
      pagination: { page: parseInt(page), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// Get single booking
export const getBookingById = async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { userId: req.user.id },
          ...(req.user.role !== 'CUSTOMER' ? [{}] : []),
        ],
      },
      include: {
        seats: { include: { seat: true } },
        show: {
          include: {
            movie: true,
            screen: { include: { theatre: true } },
            language: true,
          },
        },
        payment: true,
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    if (!booking) throw new ApiError(404, 'Booking not found');
    sendResponse(res, 200, { booking });
  } catch (error) {
    next(error);
  }
};

// Cancel booking
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { payment: true, show: { include: { movie: true } }, user: true, seats: { include: { seat: true } } },
    });

    if (!booking) throw new ApiError(404, 'Booking not found');
    if (booking.status === 'CANCELLED') throw new ApiError(400, 'Booking already cancelled');
    if (booking.status === 'CONFIRMED') {
      const hoursUntilShow = (booking.show.startTime - new Date()) / (1000 * 60 * 60);
      if (hoursUntilShow < 2) throw new ApiError(400, 'Cannot cancel within 2 hours of show');
    }

    const { reason } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
      });

      // Initiate refund if paid
      if (booking.payment?.status === 'COMPLETED' && booking.payment.razorpayPaymentId) {
        const refund = await paymentService.processRefund({
          paymentId: booking.payment.razorpayPaymentId,
          amount: booking.grandTotal,
          notes: { reason: reason || 'Customer requested cancellation' },
        });

        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: 'REFUNDED',
            refundId: refund.id,
            refundAmount: booking.grandTotal,
            refundStatus: 'PROCESSED',
            refundedAt: new Date(),
          },
        });
      }
    });

    // Notify socket — release seats
    const io = getIO();
    if (io) {
      booking.seats.forEach(({ seat }) => {
        io.to(`show:${booking.showId}`).emit('seat:released', { seatId: seat.id, showId: booking.showId });
      });
      io.to('admin:dashboard').emit('admin:dashboard_update', {
        type: 'BOOKING_CANCELLED',
        bookingId: booking.id,
      });
    }

    // Send cancellation email
    emailService.sendCancellationEmail(booking.user.email, booking.user.firstName, booking).catch(() => {});

    // Create notification
    await createNotification({
      userId: req.user.id,
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled ❌',
      message: `Your booking for ${booking.show.movie.title} has been cancelled. Refund initiated.`,
      data: { bookingId: booking.id },
    }).catch((err) => logger.error('Real-time cancellation notification failed:', err));

    sendResponse(res, 200, null, 'Booking cancelled. Refund will be processed in 3-5 business days.');
  } catch (error) {
    next(error);
  }
};

// Download PDF ticket
export const downloadTicket = async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
        status: 'CONFIRMED',
      },
      include: {
        seats: { include: { seat: true } },
        show: {
          include: {
            movie: true,
            screen: { include: { theatre: true } },
            language: true,
          },
        },
        payment: true,
        user: { select: { firstName: true, email: true } },
      },
    });

    if (!booking) throw new ApiError(404, 'Booking not found or not confirmed');

    const pdfBuffer = await ticketService.generatePDFTicket(booking);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ticket-${booking.bookingNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// Validate coupon
export const validateCoupon = async (req, res, next) => {
  try {
    const { code, totalAmount } = req.body;

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        status: 'ACTIVE',
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (!coupon) throw new ApiError(400, 'Invalid or expired coupon');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new ApiError(400, 'Coupon limit reached');
    }
    if (totalAmount < coupon.minOrderAmount) {
      throw new ApiError(400, `Minimum order ₹${coupon.minOrderAmount} required`);
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = (totalAmount * coupon.value) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else if (coupon.type === 'FLAT') {
      discount = Math.min(coupon.value, totalAmount);
    }

    sendResponse(res, 200, {
      coupon: { code: coupon.code, title: coupon.title, type: coupon.type, value: coupon.value },
      discount,
      finalAmount: totalAmount - discount,
    }, 'Coupon applied!');
  } catch (error) {
    next(error);
  }
};

// Razorpay webhook handler
export const paymentWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const isValid = paymentService.verifyWebhook(req.body, signature);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const paymentId = payload.payment.entity.id;
      const orderId = payload.payment.entity.order_id;

      await prisma.payment.updateMany({
        where: { razorpayOrderId: orderId },
        data: {
          razorpayPaymentId: paymentId,
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });
    }

    if (event === 'payment.failed') {
      const orderId = payload.payment.entity.order_id;
      await prisma.payment.updateMany({
        where: { razorpayOrderId: orderId },
        data: { status: 'FAILED', failureReason: payload.payment.entity.error_description },
      });
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};
