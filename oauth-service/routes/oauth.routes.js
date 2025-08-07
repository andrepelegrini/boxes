import express from 'express';
import passport from 'passport';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { storeOAuthState, validateOAuthState } from '../services/stateStore.js';

const router = express.Router();

// Generate OAuth URL
router.post('/generate-url', async (req, res) => {
  try {
    const { provider, redirectUri } = req.body;
    
    if (!['slack', 'google'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    // Generate state parameter for CSRF protection
    const state = uuidv4();
    await storeOAuthState(state, {
      provider,
      redirectUri,
      timestamp: Date.now()
    });
    
    let authUrl;
    if (provider === 'slack') {
      const baseUrl = process.env.NODE_ENV === 'development' ? 'https://localhost:3003' : process.env.BASE_URL;
      const params = new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        scope: 'channels:read channels:history groups:read groups:history im:read im:history mpim:read mpim:history users:read team:read chat:write',
        redirect_uri: `${baseUrl}/api/oauth/slack/callback`,
        state
      });
      authUrl = `https://slack.com/oauth/v2/authorize?${params}`;
    } else if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/google/callback`,
        response_type: 'code',
        scope: 'profile email https://www.googleapis.com/auth/calendar',
        state,
        access_type: 'offline',
        prompt: 'consent'
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    
    logger.info('Generated OAuth URL', { provider, state });
    
    res.json({
      authUrl,
      state
    });
  } catch (error) {
    logger.error('Failed to generate OAuth URL', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

// Slack OAuth routes
router.get('/slack/auth', (req, res, next) => {
  const state = uuidv4();
  req.session.oauthState = state;
  const strategies = Object.keys(passport._strategies);
  console.log(`[OAUTH] /slack/auth chamado. Estratégias registradas:`, strategies);
  if (!passport._strategies['slack']) {
    console.error('[OAUTH] Estratégia slack NÃO registrada!');
    logger.error('Slack strategy not configured');
    return res.status(503).json({ error: 'Integração com Slack não configurada. Por favor, configure as credenciais primeiro.' });
  } else {
    console.log('[OAUTH] Estratégia slack registrada!');
  }
  passport.authenticate('slack', { state })(req, res, next);
});

router.get('/slack/callback', 
  (req, res, next) => {
    const strategies = Object.keys(passport._strategies);
    console.log(`[OAUTH] /slack/callback chamado. Estratégias registradas:`, strategies);
    if (!passport._strategies['slack']) {
      console.error('[OAUTH] Estratégia slack NÃO registrada no callback!');
      logger.error('Slack strategy not configured');
      return res.status(503).json({ error: 'Integração com Slack não configurada. Por favor, configure as credenciais primeiro.' });
    } else {
      console.log('[OAUTH] Estratégia slack registrada no callback!');
    }
    next();
  },
  passport.authenticate('slack', { failureRedirect: '/api/oauth/error' }),
  async (req, res) => {
    try {
      const { state } = req.query;
      const stateData = await validateOAuthState(state);
      if (!stateData) {
        logger.warn('Invalid OAuth state', { state });
        return res.redirect('/api/oauth/error?reason=invalid_state');
      }
      // Generate JWT token with OAuth data
      const token = jwt.sign({
        provider: 'slack',
        teamId: req.user.tokens.teamId,
        userId: req.user.tokens.userId,
        accessToken: req.user.tokens.accessToken
      }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || '24h'
      });
      // Redirect to frontend with token
      const redirectUrl = new URL(stateData.redirectUri || process.env.FRONTEND_URL);
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('provider', 'slack');
      logger.info('Slack OAuth callback successful', { 
        teamId: req.user.tokens.teamId 
      });
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Slack OAuth callback error', error);
      res.redirect('/api/oauth/error?reason=callback_failed');
    }
  }
);

// Google OAuth routes
router.get('/google/auth', (req, res, next) => {
  const state = uuidv4();
  req.session.oauthState = state;
  passport.authenticate('google', { state })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/oauth/error' }),
  async (req, res) => {
    try {
      const { state } = req.query;
      const stateData = await validateOAuthState(state);
      
      if (!stateData) {
        return res.redirect('/api/oauth/error?reason=invalid_state');
      }
      
      const token = jwt.sign({
        provider: 'google',
        userId: req.user.id,
        email: req.user.emails?.[0]?.value,
        accessToken: req.user.tokens.accessToken
      }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || '24h'
      });
      
      const redirectUrl = new URL(stateData.redirectUri || process.env.FRONTEND_URL);
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('provider', 'google');
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Google OAuth callback error', error);
      res.redirect('/api/oauth/error?reason=callback_failed');
    }
  }
);

// Exchange code for token (for manual OAuth flow)
router.post('/exchange-code', async (req, res) => {
  try {
    const { provider, code, redirectUri } = req.body;
    
    logger.info('Exchanging OAuth code', { provider });
    
    // Implementation depends on provider
    // This is a simplified example
    let tokenData;
    if (provider === 'slack') {
      const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri
        })
      });
      
      tokenData = await response.json();
      
      if (!tokenData.ok) {
        throw new Error(tokenData.error);
      }
    }
    
    res.json({
      success: true,
      data: tokenData
    });
  } catch (error) {
    logger.error('Code exchange failed', error);
    res.status(400).json({ 
      error: 'Code exchange failed',
      details: error.message 
    });
  }
});

// Error handling
router.get('/error', (req, res) => {
  const { reason } = req.query;
  logger.error('OAuth error redirect', { reason });
  
  // Redirect to frontend with error
  const redirectUrl = new URL(process.env.FRONTEND_URL);
  redirectUrl.pathname = '/oauth-error';
  redirectUrl.searchParams.set('reason', reason || 'unknown');
  
  res.redirect(redirectUrl.toString());
});

export { router as oauthRouter };