import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLoader, FiUser, FiPhone, FiFilm, FiZap, FiShield, FiCheck, FiArrowRight } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api.js';

import { auth } from '../../config/firebase.js';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuthStore } from '../../store/index.js';

const getFriendlyErrorMessage = (err) => {
  if (!err) return 'Registration failed';
  const code = err.code || '';
  if (code === 'auth/email-already-in-use') {
    return 'This email address is already registered. Please sign in.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Browser blocked the popup window. Please allow popups for Google Sign-Up.';
  }
  return err.response?.data?.message || err.message?.replace(/^Firebase:\s*/, '') || 'Registration failed';
};

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors }, watch } = useForm({
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '' },
  });

  const passwordVal = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    // 1. Try Firebase Auth first
    try {
      const userCred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const fbUser = userCred.user;
      const displayName = `${data.firstName} ${data.lastName}`.trim();
      await updateProfile(fbUser, { displayName });
      
      const authUser = {
        id: fbUser.uid,
        email: fbUser.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.email === 'admin@cinemax.com' ? 'SUPER_ADMIN' : 'CUSTOMER',
        phone: data.phone || '',
        avatarUrl: null,
        isEmailVerified: fbUser.emailVerified,
        status: 'ACTIVE',
      };
      const token = await fbUser.getIdToken();
      setAuth(authUser, token);
      toast.success(`Account created! Welcome, ${data.firstName}! 🎬`);
      navigate('/');
      return;
    } catch (fbErr) {
      // 2. Fallback to backend API
      try {
        const { confirmPassword, ...registerData } = data;
        if (!registerData.phone || !registerData.phone.trim()) {
          delete registerData.phone;
        }
        await authAPI.register(registerData);
        toast.success('Registration successful! Please check your email to verify account. 🎬');
        navigate('/login');
      } catch (err) {
        toast.error(getFriendlyErrorMessage(fbErr));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    setValue('firstName', 'Alex');
    setValue('lastName', 'Morgan');
    setValue('email', `user${randomId}@cinemax.com`);
    setValue('password', 'Pass@1234');
    setValue('confirmPassword', 'Pass@1234');
    setValue('phone', '+919876543210');
    toast.success('Sample data filled! Click "Create Account Now". 🚀');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const names = (user.displayName || 'Google User').split(' ');
      const authUser = {
        id: user.uid,
        email: user.email,
        firstName: names[0] || 'Google',
        lastName: names.slice(1).join(' ') || 'User',
        role: user.email === 'admin@cinemax.com' ? 'SUPER_ADMIN' : 'CUSTOMER',
        avatarUrl: user.photoURL,
        isEmailVerified: user.emailVerified,
        status: 'ACTIVE',
      };
      const token = await user.getIdToken();
      setAuth(authUser, token);
      toast.success(`Welcome ${authUser.firstName}! Signed in with Google 🎬`);
      navigate('/');
    } catch (err) {
      console.error('Google Auth Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error(getFriendlyErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#070710] relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Left Column: Visual Showcase */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden max-w-[50%] border-r border-white/10">
        <img
          src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&q=80"
          alt="Cinema experience"
          className="w-full h-full object-cover brightness-35 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/60 via-pink-900/40 to-[#070710]" />
        
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center text-white shadow-xl glow-purple">
              <FiFilm size={22} />
            </div>
            <span className="text-2xl font-black gradient-text">CineMax Pass</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 rounded-3xl border border-white/20 shadow-2xl max-w-md mx-auto space-y-6 text-left glow-purple"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-pink-600/30 text-pink-300 border border-pink-500/40">
                New Member Benefits
              </span>
              <span className="text-xs font-mono text-slate-400">FREE JOINING</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Join 10M+ Cinema Lovers</h3>
              <p className="text-xs text-slate-300">Earn reward points on every movie booking, unlock secret coupons, and save favorite cinema locations.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                <FiZap className="text-amber-400" size={16} />
                <span className="font-bold text-slate-200">First Booking Discount</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                <FiShield className="text-emerald-400" size={16} />
                <span className="font-bold text-slate-200">Instant Digital Pass</span>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
            <span className="flex items-center gap-1.5"><FiCheck className="text-emerald-400" /> Instant M-Tickets</span>
            <span className="flex items-center gap-1.5"><FiCheck className="text-purple-400" /> 3D Seat Selection</span>
            <span className="flex items-center gap-1.5"><FiCheck className="text-pink-400" /> Member Rewards</span>
          </div>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-card p-8 rounded-3xl border border-white/15 shadow-2xl space-y-6 my-6"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <Link to="/" className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center text-white text-xs font-bold shadow-md">
                  <FiFilm size={16} />
                </div>
                <span className="text-lg font-black gradient-text">CineMax</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
              >
                Sign In
              </button>
              <button className="py-2.5 rounded-xl text-xs font-extrabold gradient-bg text-white shadow-md">
                Create Account
              </button>
            </div>

            <h2 className="text-2xl font-black text-white">Join CineMax Today ✨</h2>
            <p className="text-xs text-slate-400 mt-1">
              Create your account to unlock ticket booking, seat selection, and digital boarding passes.
            </p>
          </div>

          {/* Quick Demo Fill Trigger */}
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-300">⚡ Auto-fill Sample Data</span>
            <button
              type="button"
              onClick={handleDemoFill}
              className="py-1 px-3 rounded-xl text-[11px] font-bold bg-purple-600/40 text-purple-100 hover:bg-purple-600/60 border border-purple-500/40 transition-all"
            >
              Fill Sample Data
            </button>
          </div>

          {/* Google OAuth Register */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-xs font-bold text-slate-200 glass-card hover:border-purple-500/50 transition-all shadow-md"
          >
            <FcGoogle size={18} />
            Sign up with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px bg-white/10 flex-1" />
            <span>or registration details</span>
            <span className="h-px bg-white/10 flex-1" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">First Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('firstName', { required: 'First name is required' })}
                    placeholder="Alex"
                    className="glass-input text-xs pl-9 pr-3 py-2.5 rounded-xl w-full outline-none"
                  />
                  <FiUser className="absolute left-3 top-3 text-slate-400" size={14} />
                </div>
                {errors.firstName && <span className="text-[10px] text-pink-400 block mt-0.5">{errors.firstName.message}</span>}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Last Name *</label>
                <input
                  type="text"
                  {...register('lastName', { required: 'Last name is required' })}
                  placeholder="Morgan"
                  className="glass-input text-xs px-3 py-2.5 rounded-xl w-full outline-none"
                />
                {errors.lastName && <span className="text-[10px] text-pink-400 block mt-0.5">{errors.lastName.message}</span>}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">Email Address *</label>
              <div className="relative">
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Valid email address required' }
                  })}
                  placeholder="alex@domain.com"
                  className="glass-input text-xs pl-9 pr-3 py-2.5 rounded-xl w-full outline-none"
                />
                <FiMail className="absolute left-3 top-3 text-slate-400" size={14} />
              </div>
              {errors.email && <span className="text-[10px] text-pink-400 block mt-0.5">{errors.email.message}</span>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">Phone Number (Optional)</label>
              <div className="relative">
                <input
                  type="tel"
                  {...register('phone')}
                  placeholder="+919876543210"
                  className="glass-input text-xs pl-9 pr-3 py-2.5 rounded-xl w-full outline-none"
                />
                <FiPhone className="absolute left-3 top-3 text-slate-400" size={14} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">Password *</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  {...register('password', { 
                    required: 'Password is required', 
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    pattern: { value: /(?=.*[A-Z])(?=.*\d)/, message: 'Must contain an uppercase letter and a number' }
                  })}
                  placeholder="Pass@1234"
                  className="glass-input text-xs pl-9 pr-9 py-2.5 rounded-xl w-full outline-none"
                />
                <FiLock className="absolute left-3 top-3 text-slate-400" size={14} />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
              {errors.password && <span className="text-[10px] text-pink-400 block mt-0.5">{errors.password.message}</span>}
              <span className="text-[9px] text-slate-500 mt-0.5 block">Min 8 chars, 1 uppercase letter & 1 number (e.g. Pass@1234)</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block">Confirm Password *</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  {...register('confirmPassword', { validate: val => val === passwordVal || 'Passwords do not match' })}
                  placeholder="Pass@1234"
                  className="glass-input text-xs pl-9 pr-3 py-2.5 rounded-xl w-full outline-none"
                />
                <FiLock className="absolute left-3 top-3 text-slate-400" size={14} />
              </div>
              {errors.confirmPassword && <span className="text-[10px] text-pink-400 block mt-0.5">{errors.confirmPassword.message}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-2xl glow-purple mt-4"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" size={16} />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account Now</span>
                  <FiArrowRight size={15} />
                </>
              )}
            </button>
          </form>

        </motion.div>
      </div>

    </div>
  );
}
