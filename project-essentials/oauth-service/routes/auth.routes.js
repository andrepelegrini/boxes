import express from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { getToken, deleteToken } from '../services/tokenStore.js';
import { setupPassportStrategies } from '../config/passport.js';
import { credentialManager } from '../services/credentialManager.js';
import passport from 'passport';

const router = express.Router();

// Verify JWT token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    res.json({
      valid: true,
      data: decoded
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        valid: false, 
        error: 'Token expired' 
      });
    }
    
    logger.error('Token verification failed', error);
    res.status(401).json({ 
      valid: false, 
      error: 'Invalid token' 
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      ignoreExpiration: true
    });
    
    // Check if token is not too old (e.g., within 7 days)
    const tokenAge = Date.now() - (decoded.iat * 1000);
    if (tokenAge > 7 * 24 * 60 * 60 * 1000) {
      return res.status(401).json({ 
        error: 'Token too old for refresh' 
      });
    }
    
    // Generate new token
    const newToken = jwt.sign({
      ...decoded,
      iat: Math.floor(Date.now() / 1000)
    }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || '24h'
    });
    
    res.json({
      token: newToken
    });
  } catch (error) {
    logger.error('Token refresh failed', error);
    res.status(401).json({ 
      error: 'Failed to refresh token' 
    });
  }
});

// Get stored tokens for a provider
router.get('/tokens/:provider/:identifier', async (req, res) => {
  try {
    const { provider, identifier } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user has access to these tokens
    if (provider === 'slack' && decoded.teamId !== identifier) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const tokenData = await getToken(identifier);
    
    if (!tokenData) {
      return res.status(404).json({ error: 'Tokens not found' });
    }
    
    res.json({
      tokens: tokenData
    });
  } catch (error) {
    logger.error('Failed to get tokens', error);
    res.status(500).json({ error: 'Failed to retrieve tokens' });
  }
});

// Revoke tokens
router.delete('/tokens/:provider/:identifier', async (req, res) => {
  try {
    const { provider, identifier } = req.params;
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user has access to revoke these tokens
    if (provider === 'slack' && decoded.teamId !== identifier) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await deleteToken(identifier);
    
    logger.info('Tokens revoked', { provider, identifier });
    
    res.json({
      success: true,
      message: 'Tokens revoked successfully'
    });
  } catch (error) {
    logger.error('Failed to revoke tokens', error);
    res.status(500).json({ error: 'Failed to revoke tokens' });
  }
});

// Configure OAuth credentials dynamically
router.post('/configure', async (req, res) => {
  try {
    const { provider, client_id, client_secret } = req.body;
    logger.info(`[CONFIGURE] Recebendo credenciais: provider=${provider}, client_id=${client_id?.substring(0,8)}..., client_secret=${client_secret ? '***' : 'NÃO DEFINIDO'}`);
    if (!provider || !client_id || !client_secret) {
      logger.warn('[CONFIGURE] Dados incompletos recebidos');
      return res.status(400).json({ error: 'Provider, client_id, and client_secret are required' });
    }
    if (!['slack', 'google'].includes(provider)) {
      logger.warn('[CONFIGURE] Provider inválido recebido');
      return res.status(400).json({ error: 'Invalid provider' });
    }
    logger.info(`[CONFIGURE] Configurando OAuth para ${provider}`);
    
    // Update credentials using the credential manager
    credentialManager.updateCredentials(provider, client_id, client_secret);
    
    // Verify credentials were updated
    const updatedCreds = credentialManager.getCredentials(provider);
    logger.info(`[CONFIGURE] Credenciais atualizadas para ${provider}:`, {
      clientId: updatedCreds?.clientId?.substring(0, 8) + '...',
      hasSecret: !!updatedCreds?.clientSecret
    });
    
    logger.info('[CONFIGURE] Chamando setupPassportStrategies()');
    // Reinitialize Passport strategies with new credentials
    setupPassportStrategies();
    
    // Verify strategies were registered correctly
    const strategies = Object.keys(passport._strategies);
    logger.info(`[CONFIGURE] Estratégias registradas após configuração:`, strategies);
    
    if (provider === 'slack' && !passport._strategies['Slack']) {
      logger.error('[CONFIGURE] Estratégia Slack não foi registrada após configuração!');
      return res.status(500).json({ error: 'Failed to register Slack strategy' });
    }
    
    logger.info(`[CONFIGURE] OAuth credentials configuradas com sucesso para ${provider}`);
    res.json({
      success: true,
      message: `${provider} credentials configured successfully`
    });
  } catch (error) {
    logger.error('[CONFIGURE] Falha ao configurar credenciais OAuth', error);
    res.status(500).json({ error: 'Failed to configure credentials' });
  }
});

export { router as authRouter };