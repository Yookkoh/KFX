import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { generateTokenPair } from '../utils/jwt.js';

// Initialize Google OAuth Strategy
if (config.googleClientId && config.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackUrl,
        scope: ['profile', 'email'],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: GoogleProfile,
        done: (error: Error | null, user?: Express.User) => void
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          // Find or create user
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: email.toLowerCase() },
                { provider: 'GOOGLE', providerId: profile.id },
              ],
            },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                provider: 'GOOGLE',
                providerId: profile.id,
                emailVerified: true,
              },
            });
          } else if (user.provider !== 'GOOGLE') {
            // Update existing email user with Google link
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                provider: 'GOOGLE',
                providerId: profile.id,
                avatar: user.avatar || profile.photos?.[0]?.value,
                emailVerified: true,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

/**
 * Initiate Google OAuth
 */
export function googleAuth(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
}

/**
 * Handle Google OAuth callback
 */
export function googleCallback(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate('google', { session: false }, async (err, user) => {
    try {
      if (err || !user) {
        return res.redirect(`${config.clientUrl}/auth/error?message=Authentication failed`);
      }

      // Generate tokens
      const tokens = await generateTokenPair(user.id, user.email);

      // Set refresh token cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Redirect to client with access token
      res.redirect(`${config.clientUrl}/auth/callback?token=${tokens.accessToken}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${config.clientUrl}/auth/error?message=Authentication failed`);
    }
  })(req, res, next);
}

/**
 * Apple OAuth - Initialize
 * Note: Apple OAuth requires additional setup (registered domain, Services ID, etc.)
 */
export async function appleAuth(req: Request, res: Response): Promise<void> {
  if (!config.appleClientId) {
    res.status(501).json({ success: false, error: 'Apple OAuth not configured' });
    return;
  }

  // Generate Apple authorization URL
  const params = new URLSearchParams({
    client_id: config.appleClientId,
    redirect_uri: config.appleCallbackUrl,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
  });

  res.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
}

/**
 * Apple OAuth - Callback
 */
export async function appleCallback(req: Request, res: Response): Promise<void> {
  try {
    const { id_token, user: userInfo } = req.body;

    if (!id_token) {
      res.redirect(`${config.clientUrl}/auth/error?message=Apple authentication failed`);
      return;
    }

    // Decode Apple ID token (in production, verify signature)
    const payload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());
    const email = payload.email;
    const appleId = payload.sub;

    if (!email) {
      res.redirect(`${config.clientUrl}/auth/error?message=No email from Apple`);
      return;
    }

    // Parse user info (only available on first authorization)
    let name = null;
    if (userInfo) {
      const parsedUser = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo;
      name = parsedUser.name 
        ? `${parsedUser.name.firstName || ''} ${parsedUser.name.lastName || ''}`.trim() 
        : null;
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { provider: 'APPLE', providerId: appleId },
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          provider: 'APPLE',
          providerId: appleId,
          emailVerified: true,
        },
      });
    }

    // Generate tokens
    const tokens = await generateTokenPair(user.id, user.email);

    // Set refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to client
    res.redirect(`${config.clientUrl}/auth/callback?token=${tokens.accessToken}`);
  } catch (error) {
    console.error('Apple callback error:', error);
    res.redirect(`${config.clientUrl}/auth/error?message=Apple authentication failed`);
  }
}

export { passport };
