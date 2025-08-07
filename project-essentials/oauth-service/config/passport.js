import passport from 'passport';
import { Strategy as SlackStrategy } from 'passport-slack-oauth2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { logger } from '../utils/logger.js';
import { storeToken, getToken } from '../services/tokenStore.js';
import { credentialManager } from '../services/credentialManager.js';

export function setupPassportStrategies() {
  logger.info('[Passport] Chamando setupPassportStrategies');
  
  // Remove existing strategies to avoid conflicts
  if (passport._strategies['Slack']) {
    logger.info('[Passport] Removendo estratégia Slack existente');
    passport.unuse('Slack');
  }
  
  if (passport._strategies['google']) {
    logger.info('[Passport] Removendo estratégia Google existente');
    passport.unuse('google');
  }

  // Get credentials from credential manager
  const slackCreds = credentialManager.getCredentials('slack');
  const googleCreds = credentialManager.getCredentials('google');
  
  logger.info(`[Passport] Slack credentials: ${slackCreds?.clientId ? 'available' : 'not available'}`);
  logger.info(`[Passport] Google credentials: ${googleCreds?.clientId ? 'available' : 'not available'}`);
  
  // Debug: Log credential details
  if (slackCreds) {
    logger.info(`[Passport] Slack clientId: ${slackCreds.clientId?.substring(0, 8)}...`);
    logger.info(`[Passport] Slack clientSecret: ${slackCreds.clientSecret ? '***' : 'NÃO DEFINIDO'}`);
  }

  // Only initialize strategies if credentials are available
  if (slackCreds && slackCreds.clientId && slackCreds.clientSecret) {
    logger.info('[Passport] Inicializando estratégia do Slack...');
    // Slack OAuth2 Strategy
    const baseUrl = process.env.NODE_ENV === 'development' ? 'https://localhost:3003' : process.env.BASE_URL;
    const callbackURL = `${baseUrl}/api/oauth/slack/callback`;

    try {
      passport.use(new SlackStrategy({
        clientID: slackCreds.clientId,
        clientSecret: slackCreds.clientSecret,
        callbackURL,
        scope: ['identity.basic', 'identity.email', 'identity.avatar']
      }, async (accessToken, refreshToken, params, profile, done) => {
        try {
          logger.info('Slack OAuth successful', { 
            teamId: params.team?.id,
            userId: params.authed_user?.id 
          });
          // Store tokens securely
          const tokenData = {
            provider: 'slack',
            accessToken,
            refreshToken,
            teamId: params.team?.id,
            teamName: params.team?.name,
            userId: params.authed_user?.id,
            scope: params.scope,
            tokenType: params.token_type,
            botUserId: params.bot_user_id,
            appId: params.app_id,
            raw: params
          };
          await storeToken(params.team?.id, tokenData);
          return done(null, {
            ...profile,
            tokens: tokenData
          });
        } catch (error) {
          logger.error('Slack OAuth error', error);
          return done(error);
        }
      }));
      logger.info('[Passport] Slack OAuth strategy initialized successfully');
    } catch (error) {
      logger.error('[Passport] Failed to initialize Slack strategy:', error);
    }
  } else {
    logger.warn('[Passport] Slack OAuth credentials not available - strategy skipped');
  }

  // Google OAuth2 Strategy
  if (googleCreds && googleCreds.clientId && googleCreds.clientSecret) {
    passport.use(new GoogleStrategy({
      clientID: googleCreds.clientId,
      clientSecret: googleCreds.clientSecret,
      callbackURL: `${process.env.BASE_URL}/api/oauth/google/callback`,
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        logger.info('Google OAuth successful', { 
          userId: profile.id,
          email: profile.emails?.[0]?.value 
        });
        const tokenData = {
          provider: 'google',
          accessToken,
          refreshToken,
          userId: profile.id,
          email: profile.emails?.[0]?.value,
          displayName: profile.displayName,
          photos: profile.photos
        };
        await storeToken(profile.id, tokenData);
        return done(null, {
          ...profile,
          tokens: tokenData
        });
      } catch (error) {
        logger.error('Google OAuth error', error);
        return done(error);
      }
    }));
    logger.info('[Passport] Google OAuth strategy initialized');
  } else {
    logger.warn('[Passport] Google OAuth credentials not available - strategy skipped');
  }

  // Serialize/Deserialize user
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}