import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with rich movie data and 7-day showtimes...');

  // ============================
  // GENRES
  // ============================
  const genresMap = {};
  const genreList = [
    { name: 'Action', slug: 'action', colorHex: '#ef4444' },
    { name: 'Drama', slug: 'drama', colorHex: '#8b5cf6' },
    { name: 'Comedy', slug: 'comedy', colorHex: '#f59e0b' },
    { name: 'Thriller', slug: 'thriller', colorHex: '#1d4ed8' },
    { name: 'Horror', slug: 'horror', colorHex: '#7f1d1d' },
    { name: 'Romance', slug: 'romance', colorHex: '#ec4899' },
    { name: 'Sci-Fi', slug: 'sci-fi', colorHex: '#06b6d4' },
    { name: 'Animation', slug: 'animation', colorHex: '#10b981' },
    { name: 'Adventure', slug: 'adventure', colorHex: '#f97316' },
    { name: 'Fantasy', slug: 'fantasy', colorHex: '#6366f1' },
  ];

  for (const g of genreList) {
    const genre = await prisma.genre.upsert({
      where: { slug: g.slug },
      update: { name: g.name, colorHex: g.colorHex },
      create: g,
    });
    genresMap[g.slug] = genre;
  }
  console.log(`✅ ${Object.keys(genresMap).length} genres ready`);

  // ============================
  // LANGUAGES
  // ============================
  const languagesMap = {};
  const langList = [
    { name: 'English', code: 'en', nativeName: 'English' },
    { name: 'Hindi', code: 'hi', nativeName: 'हिंदी' },
    { name: 'Telugu', code: 'te', nativeName: 'తెలుగు' },
    { name: 'Tamil', code: 'ta', nativeName: 'தமிழ்' },
    { name: 'Malayalam', code: 'ml', nativeName: 'മലയാളം' },
    { name: 'Kannada', code: 'kn', nativeName: 'ಕನ್ನಡ' },
  ];

  for (const l of langList) {
    const lang = await prisma.language.upsert({
      where: { code: l.code },
      update: { name: l.name, nativeName: l.nativeName },
      create: l,
    });
    languagesMap[l.code] = lang;
  }
  console.log(`✅ ${Object.keys(languagesMap).length} languages ready`);

  // ============================
  // USERS
  // ============================
  const adminPass = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cinemax.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'admin@cinemax.com',
      passwordHash: adminPass,
      firstName: 'Admin',
      lastName: 'CineMax',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      notificationSettings: { create: {} },
    },
  });

  const custPass = await bcrypt.hash('Test@1234', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@cinemax.com' },
    update: {},
    create: {
      email: 'customer@cinemax.com',
      passwordHash: custPass,
      firstName: 'Test',
      lastName: 'Customer',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isEmailVerified: true,
      phone: '+919876543210',
      notificationSettings: { create: {} },
    },
  });
  console.log(`✅ Demo accounts: ${admin.email} and ${customer.email}`);

  // ============================
  // RICH REAL MOVIES DATA
  // ============================
  const realMovies = [
    {
      title: 'Oppenheimer',
      slug: 'oppenheimer',
      synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
      tagline: 'The world forever changes.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg',
      trailerUrl: 'https://www.youtube.com/embed/uYPbbksJxIg',
      duration: 180,
      releaseDate: new Date('2023-07-21'),
      imdbRating: 8.9,
      status: 'NOW_SHOWING',
      ageRating: 'A',
      country: 'USA',
      isFeatured: true,
      isTrending: true,
      genreSlugs: ['drama', 'thriller', 'action'],
      langCodes: ['en', 'hi'],
      cast: [
        { name: 'Cillian Murphy', character: 'J. Robert Oppenheimer', order: 0, photoUrl: 'https://image.tmdb.org/t/p/w185/2lKs67r7FI4bPu0AXxMUJZxmUXn.jpg' },
        { name: 'Emily Blunt', character: 'Katherine Oppenheimer', order: 1, photoUrl: 'https://image.tmdb.org/t/p/w185/5nCSG5TL1bP1geD8aaBfaLnLLCD.jpg' },
        { name: 'Matt Damon', character: 'Leslie Groves', order: 2, photoUrl: 'https://image.tmdb.org/t/p/w185/aCvBXTAR9B1qRjIRzMBYhhbm1fR.jpg' },
        { name: 'Robert Downey Jr.', character: 'Lewis Strauss', order: 3, photoUrl: 'https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
      ],
      crew: [{ name: 'Christopher Nolan', role: 'Director' }],
    },
    {
      title: 'Dune: Part Two',
      slug: 'dune-part-two',
      synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
      tagline: 'Long live the fighters.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
      trailerUrl: 'https://www.youtube.com/embed/Way9Dexny3w',
      duration: 166,
      releaseDate: new Date('2024-03-01'),
      imdbRating: 8.6,
      status: 'NOW_SHOWING',
      ageRating: 'U/A',
      country: 'USA',
      isFeatured: true,
      isTrending: true,
      genreSlugs: ['sci-fi', 'adventure', 'action'],
      langCodes: ['en', 'hi', 'te'],
      cast: [
        { name: 'Timothée Chalamet', character: 'Paul Atreides', order: 0, photoUrl: 'https://image.tmdb.org/t/p/w185/axENiFIrSz5B7UuWkMT7PDe7CaO.jpg' },
        { name: 'Zendaya', character: 'Chani', order: 1, photoUrl: 'https://image.tmdb.org/t/p/w185/1qup8tSt95HLbcy2c2xrx4iJNxv.jpg' },
        { name: 'Rebecca Ferguson', character: 'Lady Jessica', order: 2, photoUrl: 'https://image.tmdb.org/t/p/w185/ty8ZPzaCBBlqIr5qzpOXI24iC8j.jpg' },
        { name: 'Javier Bardem', character: 'Stilgar', order: 3, photoUrl: 'https://image.tmdb.org/t/p/w185/zfRID0jx8DKBluPGU9xtk9sZWUt.jpg' },
      ],
      crew: [{ name: 'Denis Villeneuve', role: 'Director' }],
    },
    {
      title: 'Kalki 2898 AD',
      slug: 'kalki-2898-ad',
      synopsis: 'A modern avatar of Lord Vishnu, believed to have descended to Earth, protects humanity against dark forces in a dystopian futuristic city.',
      tagline: 'When the world is engulfed in darkness, a force will rise.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/rstcAnBeCkxNQjNp3YXrF6IP1tW.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/o8XSR1SONnjcsv84NRu6Mwsl5io.jpg',
      trailerUrl: 'https://www.youtube.com/embed/kQDd1AhGIHk',
      duration: 180,
      releaseDate: new Date('2024-06-27'),
      imdbRating: 7.8,
      status: 'NOW_SHOWING',
      ageRating: 'U/A',
      country: 'India',
      isFeatured: true,
      isTrending: true,
      genreSlugs: ['action', 'sci-fi', 'fantasy'],
      langCodes: ['te', 'hi', 'ta', 'en'],
      cast: [
        { name: 'Prabhas', character: 'Bhairava', order: 0, photoUrl: 'https://image.tmdb.org/t/p/w185/u6RVP8ukgLaymeoi5VmX0JRAcCn.jpg' },
        { name: 'Amitabh Bachchan', character: 'Ashwatthama', order: 1, photoUrl: 'https://image.tmdb.org/t/p/w185/u69PvpWqGkywSm0YjFiw77j9eqS.jpg' },
        { name: 'Kamal Haasan', character: 'Supreme Yaskin', order: 2, photoUrl: 'https://image.tmdb.org/t/p/w185/17zscZgz4wOlGDd3Gziw4YbI3G.jpg' },
        { name: 'Deepika Padukone', character: 'SUM-80', order: 3, photoUrl: 'https://image.tmdb.org/t/p/w185/rzvvBQ0r6oiqDdzcsdTRB7jN4Rx.jpg' },
      ],
      crew: [{ name: 'Nag Ashwin', role: 'Director' }],
    },
    {
      title: 'Deadpool & Wolverine',
      slug: 'deadpool-and-wolverine',
      synopsis: 'Wolverine is recovering from his injuries when he crosses paths with the loudmouth Deadpool. They team up to defeat a common enemy.',
      tagline: 'Everyone deserves a happy ending.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/cOoVcVQ3i1m5b2xtqKBtoTSbxC1.jpg',
      trailerUrl: 'https://www.youtube.com/embed/73_1biulkYk',
      duration: 128,
      releaseDate: new Date('2024-07-26'),
      imdbRating: 8.0,
      status: 'NOW_SHOWING',
      ageRating: 'A',
      country: 'USA',
      isFeatured: true,
      isTrending: true,
      genreSlugs: ['action', 'comedy', 'sci-fi'],
      langCodes: ['en', 'hi'],
      cast: [
        { name: 'Ryan Reynolds', character: 'Wade Wilson / Deadpool', order: 0, photoUrl: 'https://image.tmdb.org/t/p/w185/trzgptffGvAlAT6MEu01fz47cLW.jpg' },
        { name: 'Hugh Jackman', character: 'Logan / Wolverine', order: 1, photoUrl: 'https://image.tmdb.org/t/p/w185/4Xujtewxqt6aU0Y81tsS9gkjizk.jpg' },
      ],
      crew: [{ name: 'Shawn Levy', role: 'Director' }],
    },
    {
      title: 'Inception',
      slug: 'inception',
      synopsis: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
      tagline: 'Your mind is the scene of the crime.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
      trailerUrl: 'https://www.youtube.com/embed/YoHD9XEInc0',
      duration: 148,
      releaseDate: new Date('2010-07-16'),
      imdbRating: 8.8,
      status: 'NOW_SHOWING',
      ageRating: 'U/A',
      country: 'USA',
      isFeatured: false,
      isTrending: true,
      genreSlugs: ['sci-fi', 'action', 'thriller'],
      langCodes: ['en', 'hi'],
      cast: [
        { name: 'Leonardo DiCaprio', character: 'Dom Cobb', order: 0, photoUrl: 'https://image.tmdb.org/t/p/w185/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg' },
        { name: 'Joseph Gordon-Levitt', character: 'Arthur', order: 1, photoUrl: 'https://image.tmdb.org/t/p/w185/z2FA8js799xqtfiFjBTicFYdfk.jpg' },
        { name: 'Elliot Page', character: 'Ariadne', order: 2, photoUrl: 'https://image.tmdb.org/t/p/w185/nXO8DE4biVXY4UDYP0NdIY1zvXS.jpg' },
        { name: 'Tom Hardy', character: 'Eames', order: 3, photoUrl: 'https://image.tmdb.org/t/p/w185/d81K0RH8UX7tZj49tZaQhZ9ewH.jpg' },
      ],
      crew: [{ name: 'Christopher Nolan', role: 'Director' }],
    },
    {
      title: 'Interstellar',
      slug: 'interstellar',
      synopsis: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.',
      tagline: 'Mankind was born on Earth. It was never meant to die here.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/2ssWTSVklAEc98frZUQhgtGHx7s.jpg',
      trailerUrl: 'https://www.youtube.com/embed/zSWdZVtXT7E',
      duration: 169,
      releaseDate: new Date('2014-11-07'),
      imdbRating: 8.7,
      status: 'NOW_SHOWING',
      ageRating: 'U/A',
      country: 'USA',
      isFeatured: false,
      isTrending: true,
      genreSlugs: ['sci-fi', 'drama', 'adventure'],
      langCodes: ['en', 'hi'],
      cast: [
        { name: 'Matthew McConaughey', character: 'Cooper', order: 0, photoUrl: 'https://image.tmdb.org/t/p/w185/lCySuYjhXix3FzQdS4oceDDrXKI.jpg' },
        { name: 'Anne Hathaway', character: 'Brand', order: 1, photoUrl: 'https://image.tmdb.org/t/p/w185/nbccV2pMoyLTCeg5DQip24Eq0Jp.jpg' },
        { name: 'Jessica Chastain', character: 'Murph', order: 2, photoUrl: 'https://image.tmdb.org/t/p/w185/eQKnihReJeB9vQEa5gySzAlKfZt.jpg' },
      ],
      crew: [{ name: 'Christopher Nolan', role: 'Director' }],
    },
    {
      title: 'Spider-Man: Across the Spider-Verse',
      slug: 'spider-man-across-the-spider-verse',
      synopsis: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
      tagline: 'With more power comes more responsibility.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/9xfDWXAUbFXQK585JvByT5pEAhe.jpg',
      trailerUrl: 'https://www.youtube.com/embed/cqGjhVJWtEg',
      duration: 140,
      releaseDate: new Date('2026-08-15'),
      imdbRating: 8.7,
      status: 'COMING_SOON',
      ageRating: 'U',
      country: 'USA',
      isFeatured: false,
      isTrending: false,
      genreSlugs: ['animation', 'action', 'adventure'],
      langCodes: ['en', 'hi', 'te', 'ta'],
      cast: [
        { name: 'Shameik Moore', character: 'Miles Morales (voice)', order: 0, photoUrl: 'https://image.tmdb.org/t/p/w185/ovUKfVOwJ7CadEHaG3NDsfA5xRq.jpg' },
        { name: 'Hailee Steinfeld', character: 'Gwen Stacy (voice)', order: 1, photoUrl: 'https://image.tmdb.org/t/p/w185/4K2dzM3odGiVZOQOD6RjVxNq2ZQ.jpg' },
      ],
      crew: [{ name: 'Joaquim Dos Santos', role: 'Director' }],
    },
    {
      title: 'Avatar: The Way of Water',
      slug: 'avatar-the-way-of-water',
      synopsis: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri.',
      tagline: 'Return to Pandora.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
      bannerUrl: 'https://image.tmdb.org/t/p/original/kJsPVzdyBrYHLomuNv5SJDXUQ2f.jpg',
      trailerUrl: 'https://www.youtube.com/embed/d9MyW72ELq0',
      duration: 192,
      releaseDate: new Date('2026-09-20'),
      imdbRating: 7.6,
      status: 'COMING_SOON',
      ageRating: 'U/A',
      country: 'USA',
      isFeatured: false,
      isTrending: false,
      genreSlugs: ['sci-fi', 'adventure', 'action'],
      langCodes: ['en', 'hi'],
      cast: [
        { name: 'Sam Worthington', character: 'Jake Sully', order: 0, photoUrl: 'https://image.tmdb.org/t/p/w185/mflBcox3T9sZ7PbuZKmYiKsbMPB.jpg' },
        { name: 'Zoe Saldana', character: 'Neytiri', order: 1, photoUrl: 'https://image.tmdb.org/t/p/w185/a5W0aY3o9n6N5gN2k42V2p22p.jpg' },
      ],
      crew: [{ name: 'James Cameron', role: 'Director' }],
    },
  ];

  // Clean old movies to prevent stale data
  await prisma.movie.deleteMany({});
  console.log('🧹 Cleaned up old movies');

  const createdMovies = [];
  for (const mData of realMovies) {
    const { genreSlugs, langCodes, cast, crew, ...movieData } = mData;

    const movie = await prisma.movie.create({
      data: {
        ...movieData,
        genres: {
          create: genreSlugs.map((gSlug) => ({
            genreId: genresMap[gSlug].id,
          })),
        },
        languages: {
          create: langCodes.map((lCode) => ({
            languageId: languagesMap[lCode].id,
          })),
        },
        cast: {
          create: cast.map((c) => ({
            name: c.name,
            character: c.character,
            order: c.order,
            photoUrl: c.photoUrl,
          })),
        },
        crew: {
          create: crew.map((cr) => ({
            name: cr.name,
            role: cr.role,
          })),
        },
      },
    });
    createdMovies.push(movie);
  }
  console.log(`✅ Seeded ${createdMovies.length} real blockbuster movies`);

  // ============================
  // THEATRES & SCREENS
  // ============================
  const theatresData = [
    {
      name: 'CineMax IMAX Hyderabad',
      slug: 'cinemax-imax-hyderabad',
      address: 'Inorbit Mall, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      phone: '+914023456789',
      email: 'hyderabad@cinemax.com',
      hasParking: true,
      hasFoodCourt: true,
      hasAtm: true,
      hasWifi: true,
    },
    {
      name: 'CineMax PVR Mumbai',
      slug: 'cinemax-pvr-mumbai',
      address: 'Phoenix Palladium, Lower Parel',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400013',
      phone: '+912222334455',
      email: 'mumbai@cinemax.com',
      hasParking: true,
      hasFoodCourt: true,
      hasAtm: true,
      hasWifi: true,
    },
  ];

  const createdTheatres = [];
  for (const theatreData of theatresData) {
    const theatre = await prisma.theatre.upsert({
      where: { slug: theatreData.slug },
      update: {},
      create: theatreData,
    });

    const screenFormats = ['IMAX', 'THREE_D', 'TWO_D'];
    for (const format of screenFormats) {
      const existingScreen = await prisma.screen.findFirst({
        where: { theatreId: theatre.id, name: `Screen ${format}` },
      });

      let screen = existingScreen;
      if (!screen) {
        const rows = format === 'IMAX' ? 15 : 12;
        const columns = format === 'IMAX' ? 20 : 16;
        screen = await prisma.screen.create({
          data: {
            theatreId: theatre.id,
            name: `Screen ${format}`,
            format,
            totalSeats: rows * columns,
            rows,
            columns,
            hasImax: format === 'IMAX',
            has3D: format.includes('THREE') || format === 'IMAX',
          },
        });

        const seatData = [];
        const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let r = 0; r < rows; r++) {
          for (let c = 1; c <= columns; c++) {
            const rowLabel = rowLabels[r];
            let seatType = 'SILVER';
            if (r >= rows * 0.4 && r < rows * 0.7) seatType = 'GOLD';
            if (r >= rows * 0.7 && r < rows * 0.85) seatType = 'PREMIUM';
            if (r >= rows * 0.85) seatType = format === 'IMAX' ? 'RECLINER' : 'PLATINUM';

            seatData.push({
              screenId: screen.id,
              row: rowLabel,
              column: c,
              label: `${rowLabel}${c}`,
              seatType,
            });
          }
        }
        await prisma.seat.createMany({ data: seatData, skipDuplicates: true });
      }
    }
    createdTheatres.push(theatre);
  }
  console.log(`✅ ${createdTheatres.length} theatres and screens initialized`);

  // ============================
  // GENERATE 7-DAY SHOWTIMES
  // ============================
  const nowShowingMovies = createdMovies.filter((m) => m.status === 'NOW_SHOWING');
  const allScreens = await prisma.screen.findMany();
  const timeslots = ['09:30', '13:00', '16:30', '20:00', '23:15'];
  let totalShows = 0;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const showDate = new Date();
    showDate.setDate(showDate.getDate() + dayOffset);

    for (const screen of allScreens) {
      // Alternate movies per screen
      const moviesForScreen = nowShowingMovies;

      for (let i = 0; i < timeslots.length; i++) {
        const movie = moviesForScreen[(dayOffset + i) % moviesForScreen.length];
        const [hours, minutes] = timeslots[i].split(':').map(Number);

        const startTime = new Date(showDate);
        startTime.setHours(hours, minutes, 0, 0);
        const endTime = new Date(startTime.getTime() + movie.duration * 60 * 1000 + 20 * 60 * 1000);

        const show = await prisma.show.create({
          data: {
            movieId: movie.id,
            screenId: screen.id,
            languageId: languagesMap['en'].id,
            startTime,
            endTime,
            format: screen.format,
          },
        });

        const seats = await prisma.seat.findMany({ where: { screenId: screen.id } });
        const prices = { SILVER: 180, GOLD: 250, PREMIUM: 320, PLATINUM: 400, RECLINER: 550 };
        const seatPricings = seats.map((s) => ({
          showId: show.id,
          seatId: s.id,
          price: prices[s.seatType] || 250,
          convenienceFee: 25,
        }));

        await prisma.seatPricing.createMany({ data: seatPricings, skipDuplicates: true });
        totalShows++;
      }
    }
  }
  console.log(`✅ Created ${totalShows} showtimes across the next 7 days!`);

  // ============================
  // REVIEWS & RATINGS
  // ============================
  for (const movie of nowShowingMovies.slice(0, 4)) {
    await prisma.rating.upsert({
      where: { movieId_userId: { userId: customer.id, movieId: movie.id } },
      update: { score: 5 },
      create: { userId: customer.id, movieId: movie.id, score: 5 },
    });

    await prisma.review.upsert({
      where: { movieId_userId: { userId: customer.id, movieId: movie.id } },
      update: {},
      create: {
        userId: customer.id,
        movieId: movie.id,
        title: 'Masterpiece Cinema Experience! 🔥',
        content: `Absolute masterpiece! The visuals, sound design, and performances in ${movie.title} are top notch. Must watch in IMAX!`,
        spoiler: false,
        isApproved: true,
      },
    });
  }
  console.log('✅ Reviews & ratings seeded');

  console.log('\n🎉 Complete Movie Data & 7-Day Showtimes Seeding Finished!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
