import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLoader, FiFilm, FiShield, FiZap, FiCheckCircle, FiCheck, FiArrowRight } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api.js';
import { useAuthStore } from '../../store/index.js';

import { auth } from '../../config/firebase.js';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

const getFriendlyErrorMessage = (err) => {
  if (!err) return 'Authentication failed';
  const code = err.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Please sign in.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Pop-up blocked by browser. Please allow popups for Google Sign-In.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain is not authorized in Firebase Console.';
  }
  return err.response?.data?.message || err.message?.replace(/^Firebase:\s*/, '') || 'Login failed';
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    // 1. Try Firebase Auth first
    try {
      const userCred = await signInWithEmailAndPassword(auth, data.email, data.password);
      const fbUser = userCred.user;
      const names = (fbUser.displayName || fbUser.email.split('@')[0]).split(' ');
      const authUser = {
        id: fbUser.uid,
        email: fbUser.email,
        firstName: names[0] || 'User',
        lastName: names.slice(1).join(' ') || '',
        role: fbUser.email === 'admin@cinemax.com' ? 'SUPER_ADMIN' : 'CUSTOMER',
        avatarUrl: fbUser.photoURL,
        isEmailVerified: fbUser.emailVerified,
        status: 'ACTIVE',
      };
      const token = await fbUser.getIdToken();
      setAuth(authUser, token);
      toast.success(`Welcome back, ${authUser.firstName}! 🎬`);
      navigate(from, { replace: true });
      return;
    } catch (fbErr) {
      // 2. If Firebase fails, fallback to backend API / Demo users
      try {
        const res = await authAPI.login(data);
        const { user, accessToken } = res.data.data;
        setAuth(user, accessToken);
        toast.success(`Welcome back, ${user.firstName}! 🎬`);
        navigate(from, { replace: true });
      } catch (backendErr) {
        toast.error(getFriendlyErrorMessage(fbErr));
      }
    } finally {
      setLoading(false);
    }
  };

  const DEMO_USERS = {
    user: {
      user: {
        id: 'demo-customer-001',
        email: 'customer@cinemax.com',
        firstName: 'Demo',
        lastName: 'Customer',
        role: 'CUSTOMER',
        phone: '+91 98765 43210',
        avatarUrl: null,
        isEmailVerified: true,
        status: 'ACTIVE',
      },
      accessToken: 'demo-token-customer-cinemax-2026',
    },
    admin: {
      user: {
        id: 'demo-admin-001',
        email: 'admin@cinemax.com',
        firstName: 'Admin',
        lastName: 'CineMax',
        role: 'SUPER_ADMIN',
        phone: '+91 98765 00000',
        avatarUrl: null,
        isEmailVerified: true,
        status: 'ACTIVE',
      },
      accessToken: 'demo-token-admin-cinemax-2026',
    },
  };

  const handleDemoLogin = async (role = 'user') => {
    setLoading(true);
    const credentials = role === 'admin'
      ? { email: 'admin@cinemax.com', password: 'Admin@1234' }
      : { email: 'customer@cinemax.com', password: 'Test@1234' };

    try {
      const res = await authAPI.login(credentials);
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.firstName}! 🎬`);
      navigate(from, { replace: true });
    } catch {
      // Backend not reachable — use local mock user for Vercel demo
      const demo = DEMO_USERS[role];
      setAuth(demo.user, demo.accessToken);
      toast.success(role === 'admin'
        ? '👑 Admin Demo Login — Welcome Admin!'
        : '🍿 Customer Demo Login — Welcome to CineMax!');
      navigate(from, { replace: true });
    } finally {
      setLoading(false);
    }
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
      navigate(from, { replace: true });
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
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

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
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-purple-600/30 text-purple-300 border border-purple-500/40">
                VIP Cinema Membership
              </span>
              <span className="text-xs font-mono text-slate-400">#CINEMAX-2026</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Unlimited Blockbuster Access</h3>
              <p className="text-xs text-slate-300">Book premium seats in IMAX 3D, Dolby Atmos, and 4DX theaters with zero convenience surcharge.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                <FiZap className="text-amber-400" size={16} />
                <span className="font-bold text-slate-200">1-Click Booking</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                <FiShield className="text-emerald-400" size={16} />
                <span className="font-bold text-slate-200">Free Cancellation</span>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
            <span className="flex items-center gap-1.5"><FiCheck className="text-emerald-400" /> Instant M-Ticket Pass</span>
            <span className="flex items-center gap-1.5"><FiCheck className="text-purple-400" /> 3D Curved Seat Selection</span>
            <span className="flex items-center gap-1.5"><FiCheck className="text-pink-400" /> Secure Payments</span>
          </div>
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-card p-8 rounded-3xl border border-white/15 shadow-2xl space-y-6"
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
              <button className="py-2.5 rounded-xl text-xs font-extrabold gradient-bg text-white shadow-md">
                Sign In
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
              >
                Create Account
              </button>
            </div>

            <h2 className="text-2xl font-black text-white">Welcome Back 👋</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sign in to manage movie tickets, view seat reservations, and access saved passes.
            </p>
          </div>

          {/* Quick Demo One-Click Login Buttons */}
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">⚡ One-Click Demo Login (No Password Needed)</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('user')}
                disabled={loading}
                className="py-2 px-3 rounded-xl text-[11px] font-bold bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 border border-purple-500/40 transition-all text-center disabled:opacity-50"
              >
                🍿 Customer Demo
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="py-2 px-3 rounded-xl text-[11px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all text-center disabled:opacity-50"
              >
                👑 Admin Demo
              </button>
            </div>
          </div>

          {/* Google OAuth Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-xs font-bold text-slate-200 glass-card hover:border-purple-500/50 transition-all shadow-md"
          >
            <FcGoogle size={18} />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px bg-white/10 flex-1" />
            <span>or sign in with credentials</span>
            <span className="h-px bg-white/10 flex-1" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email address is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' } 
                  })}
                  placeholder="customer@cinemax.com"
                  className="glass-input text-xs pl-10 pr-4 py-3 rounded-2xl w-full outline-none"
                />
                <FiMail className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
              </div>
              {errors.email && <span className="text-[10px] text-pink-400 mt-1 block">{errors.email.message}</span>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-[11px] font-semibold text-purple-400 hover:text-purple-300">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  placeholder="••••••••"
                  className="glass-input text-xs pl-10 pr-10 py-3 rounded-2xl w-full outline-none"
                />
                <FiLock className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {errors.password && <span className="text-[10px] text-pink-400 mt-1 block">{errors.password.message}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-2xl glow-purple mt-2"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" size={16} />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In Now</span>
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
