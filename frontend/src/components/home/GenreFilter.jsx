import { motion } from 'framer-motion';

const GENRE_ICONS = {
  'action': '⚡', 'drama': '🎭', 'comedy': '😂', 'thriller': '🔥',
  'horror': '👻', 'romance': '❤️', 'sci-fi': '🚀', 'animation': '🎨',
  'adventure': '🗺️', 'fantasy': '✨',
};

export default function GenreFilter({ genres = [], onSelect, active }) {
  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 font-heading tracking-tight">
            <span>🎬</span> Explore Movies by Genre
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">Select a category to filter live showtimes</p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3">
        {genres.map((genre, i) => {
          const isActive = active === genre.slug;
          const colorHex = genre.colorHex || '#7c3aed';
          return (
            <motion.button
              key={genre.id || genre.slug || i}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ scale: 1.06, y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(isActive ? '' : genre.slug)}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl transition-all glass-card relative overflow-hidden ${
                isActive ? 'glow-purple border-purple-500' : 'hover:border-white/20'
              }`}
              style={{
                borderColor: isActive ? colorHex : undefined,
                boxShadow: isActive ? `0 0 25px ${colorHex}40` : undefined,
              }}
            >
              {isActive && (
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{ background: colorHex }}
                />
              )}
              <span className="text-2xl">{GENRE_ICONS[genre.slug] || '🍿'}</span>
              <span
                className="text-xs font-bold truncate max-w-full font-heading tracking-wide"
                style={{ color: isActive ? '#ffffff' : '#94a3b8' }}
              >
                {genre.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
