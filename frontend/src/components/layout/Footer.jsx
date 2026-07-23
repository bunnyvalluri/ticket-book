import { Link } from 'react-router-dom';
import { FiInstagram, FiTwitter, FiFacebook, FiYoutube, FiMail, FiPhone, FiFilm, FiShield, FiSend, FiAward, FiUsers, FiStar } from 'react-icons/fi';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { BrandLogoIcon } from '../common/BrandLogo.jsx';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      toast.success('🎉 Thank you for subscribing to CineMax updates!');
      setEmail('');
    }
  };

  return (
    <footer className="mt-28 bg-[#04040a] border-t border-white/10 relative overflow-hidden">
      {/* Glow ambient spots */}
      <div className="absolute -top-40 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Stats Counter Section */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl">
        <div className="container-app py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            
            <div className="flex items-center justify-center gap-3.5 p-3 rounded-2xl glass-card border border-white/5">
              <FiFilm className="text-purple-400 shrink-0" size={30} />
              <div className="flex flex-col text-left">
                <span className="text-2xl sm:text-3xl font-black gradient-text font-numeric leading-none py-1 inline-block">
                  5,000+
                </span>
                <p className="text-[11px] font-bold text-slate-400 font-heading tracking-wide mt-0.5">Movies Screened</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3.5 p-3 rounded-2xl glass-card border border-white/5">
              <FiUsers className="text-pink-400 shrink-0" size={30} />
              <div className="flex flex-col text-left">
                <span className="text-2xl sm:text-3xl font-black gradient-text font-numeric leading-none py-1 inline-block">
                  10M+
                </span>
                <p className="text-[11px] font-bold text-slate-400 font-heading tracking-wide mt-0.5">Happy Moviegoers</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3.5 p-3 rounded-2xl glass-card border border-white/5">
              <FiAward className="text-amber-400 shrink-0" size={30} />
              <div className="flex flex-col text-left">
                <span className="text-2xl sm:text-3xl font-black gradient-text font-numeric leading-none py-1 inline-block">
                  800+
                </span>
                <p className="text-[11px] font-bold text-slate-400 font-heading tracking-wide mt-0.5">Partner Cinemas</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3.5 p-3 rounded-2xl glass-card border border-white/5">
              <FiStar className="text-yellow-400 fill-yellow-400 shrink-0" size={28} />
              <div className="flex flex-col text-left">
                <span className="text-2xl sm:text-3xl font-black gradient-text font-numeric leading-none py-1 inline-block">
                  4.9 / 5.0
                </span>
                <p className="text-[11px] font-bold text-slate-400 font-heading tracking-wide mt-0.5">Average App Rating</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Footer Column Content */}
      <div className="container-app py-16 sm:py-20 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-3 group">
              <BrandLogoIcon className="w-11 h-11" iconSize="w-6 h-6" />
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight gradient-text font-heading">CineMax</span>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest -mt-0.5 font-heading">Cinema Pass</span>
              </div>
            </Link>
            
            <p className="text-xs leading-relaxed text-slate-400 max-w-sm font-sans">
              Your ultimate movie ticket booking destination. Discover trending blockbusters, select your favorite seat tiers, and enjoy instant digital tickets with Dolby Cinema experiences.
            </p>
            
            {/* Newsletter Input */}
            <form onSubmit={handleSubscribe} className="space-y-2.5 max-w-sm pt-2">
              <label className="text-xs font-bold text-slate-200 block font-heading tracking-wide">
                Get Exclusive Movie Deals & Premiere Updates
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="glass-input text-xs px-4 py-3 rounded-xl w-full text-white outline-none font-sans"
                  required
                />
                <button type="submit" className="btn-primary shrink-0 px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg font-heading">
                  <FiSend size={14} />
                  Subscribe
                </button>
              </div>
            </form>

            <div className="flex gap-3 pt-2">
              {[
                { icon: FiInstagram, color: 'hover:text-pink-400 hover:border-pink-500/50' },
                { icon: FiTwitter, color: 'hover:text-cyan-400 hover:border-cyan-500/50' },
                { icon: FiFacebook, color: 'hover:text-blue-400 hover:border-blue-500/50' },
                { icon: FiYoutube, color: 'hover:text-red-400 hover:border-red-500/50' },
              ].map(({ icon: Icon, color }, i) => (
                <a
                  key={i}
                  href="#"
                  className={`w-9 h-9 rounded-xl glass-card flex items-center justify-center text-slate-400 transition-all ${color}`}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-sm text-white border-b border-purple-500/30 pb-2.5 inline-block">
              Explore Movies
            </h4>
            <ul className="space-y-2.5 text-xs font-sans">
              {['Now Showing', 'Coming Soon', 'IMAX 3D Experience', 'Top Rated Blockbusters', 'Trending Theatres'].map((link) => (
                <li key={link}>
                  <Link to="/" className="text-slate-400 hover:text-purple-300 transition-colors font-medium hover:translate-x-1 duration-200 inline-block">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Support */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-sm text-white border-b border-pink-500/30 pb-2.5 inline-block">
              Company & Help
            </h4>
            <ul className="space-y-2.5 text-xs font-sans">
              {['About CineMax', 'Careers', 'Partner Cinema Portal', 'Privacy Policy', 'Terms of Service'].map((link) => (
                <li key={link}>
                  <Link to="/" className="text-slate-400 hover:text-pink-300 transition-colors font-medium hover:translate-x-1 duration-200 inline-block">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Apps & Support Contact */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-sm text-white border-b border-amber-500/30 pb-2.5 inline-block">
              Support & Mobile App
            </h4>
            <div className="space-y-3 text-xs text-slate-400 font-sans">
              <a href="mailto:support@cinemax.com" className="flex items-center gap-2.5 hover:text-purple-300 transition-colors font-medium">
                <FiMail className="text-purple-400 shrink-0" size={15} />
                support@cinemax.com
              </a>
              <a href="tel:+918000123456" className="flex items-center gap-2.5 hover:text-purple-300 transition-colors font-numeric font-bold">
                <FiPhone className="text-purple-400 shrink-0" size={15} />
                +91 8000 123 456
              </a>
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-heading">
                Get Mobile App
              </p>
              <div className="flex flex-col gap-2">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-white/10 hover:border-purple-500/50 transition-all text-xs font-bold text-slate-200">
                  <span> App Store</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card border border-white/10 hover:border-purple-500/50 transition-all text-xs font-bold text-slate-200">
                  <span>▶ Google Play</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright bar */}
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© 2026 CineMax Ticketing System. All rights reserved. Crafted with precision for movie lovers.</p>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1">
              <FiShield size={12} />
              256-Bit SSL Encrypted
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
              Instant Refund Guarantee
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
