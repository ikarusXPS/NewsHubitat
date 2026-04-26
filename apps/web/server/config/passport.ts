/**
 * Passport OAuth Configuration
 * Configures Google and GitHub authentication strategies
 */
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import { OAuthService } from '../services/oauthService';

// Google OAuth scopes per RESEARCH.md
const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

// GitHub OAuth scopes per RESEARCH.md
const GITHUB_SCOPES = ['user:email', 'read:user'];

export function configurePassport(): void {
  // D-05: Auth-only OAuth - we don't store refresh tokens

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
          passReqToCallback: false,
        },
        async (
          accessToken: string,
          refreshToken: string,
          profile: GoogleProfile,
          done: (error: Error | null, user?: unknown) => void
        ) => {
          try {
            const oauthService = OAuthService.getInstance();
            const result = await oauthService.processGoogleAuth(profile);
            return done(null, result);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
    console.log('passport:google configured');
  } else {
    console.warn('passport:google skipped - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
  }

  // GitHub Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: '/api/auth/github/callback',
          passReqToCallback: false,
          scope: GITHUB_SCOPES,
        },
        async (
          accessToken: string,
          refreshToken: string,
          profile: GitHubProfile,
          done: (error: Error | null, user?: unknown) => void
        ) => {
          try {
            const oauthService = OAuthService.getInstance();
            const result = await oauthService.processGitHubAuth(profile);
            return done(null, result);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
    console.log('passport:github configured');
  } else {
    console.warn('passport:github skipped - GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set');
  }
}

export { GOOGLE_SCOPES, GITHUB_SCOPES };
