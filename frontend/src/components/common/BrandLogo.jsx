import React from 'react';

export function BrandLogoIcon({ className = "w-9 h-9", iconSize = "w-5 h-5" }) {
  return (
    <div className={`${className} rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500 p-[1.5px] shadow-xl glow-purple shrink-0 relative overflow-hidden group transition-transform duration-300 hover:scale-105`}>
      <div className="w-full h-full bg-[#070710] rounded-[10.5px] flex items-center justify-center relative overflow-hidden">
        {/* Inner Glow Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/30 via-pink-500/20 to-amber-500/30 opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Modern 🎟️ Cinema Ticket & Play Star Vector */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${iconSize} relative z-10 drop-shadow-lg transform group-hover:rotate-3 transition-transform duration-300`}
        >
          <defs>
            <linearGradient id="ticketGradNew" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <linearGradient id="goldAccentNew" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffe58f" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {/* Ticket Body with Notches */}
          <path
            d="M5 8C5 6.89543 5.89543 6 7 6H25C26.1046 6 27 6.89543 27 8V12C25.3431 12 24 13.3431 24 15C24 16.6569 25.3431 18 27 18V24C27 25.1046 26.1046 26 25 26H7C5.89543 26 5 25.1046 5 24V18C6.65685 18 8 16.6569 8 15C8 13.3431 6.65685 12 5 12V8Z"
            fill="url(#ticketGradNew)"
            fillOpacity="0.25"
            stroke="url(#ticketGradNew)"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Perforation Line */}
          <line
            x1="16"
            y1="7.5"
            x2="16"
            y2="24.5"
            stroke="url(#ticketGradNew)"
            strokeWidth="1.8"
            strokeDasharray="2 2"
          />

          {/* Play Triangle Icon Left */}
          <path
            d="M10.5 11.5L14 15L10.5 18.5V11.5Z"
            fill="url(#goldAccentNew)"
          />

          {/* Golden Cinema Star Right */}
          <path
            d="M20.5 11.5L21.3 13.5L23.5 13.7L21.8 15.1L22.3 17.2L20.5 16.1L18.7 17.2L19.2 15.1L17.5 13.7L19.7 13.5L20.5 11.5Z"
            fill="url(#goldAccentNew)"
          />
        </svg>
      </div>
    </div>
  );
}

export default BrandLogoIcon;

