// src/config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from './database.js';
import { env } from './env.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const name = profile.displayName;
        const avatarUrl = profile.photos?.[0]?.value;

        if (!email) {
          return done(new Error('No email found from Google profile'), null);
        }

        // Cek apakah user sudah ada via googleId
        let user = await prisma.user.findUnique({
          where: { googleId },
        });

        if (user) {
          // User sudah ada — update avatar kalau berubah
          user = await prisma.user.update({
            where: { googleId },
            data: { avatarUrl },
          });
          return done(null, user);
        }

        // Cek apakah email sudah terdaftar via password
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          // Merge — hubungkan Google ke akun yang sudah ada
          user = await prisma.user.update({
            where: { email },
            data: { googleId, avatarUrl, isVerified: true },
          });
          return done(null, user);
        }

        // User baru — buat akun otomatis
        user = await prisma.user.create({
          data: {
            email,
            googleId,
            name,
            avatarUrl,
            isVerified: true, // Google sudah verifikasi email
            role: 'PASIEN',   // Default role untuk self-register
          },
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;