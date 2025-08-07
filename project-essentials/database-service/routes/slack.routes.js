import express from 'express';
import { prisma } from '../server.js';

const router = express.Router();

router.get('/channels', async (req, res, next) => {
  try {
    const channels = await prisma.slackChannel.findMany();
    res.json({ success: true, data: channels });
  } catch (error) {
    next(error);
  }
});

router.get('/messages', async (req, res, next) => {
  try {
    const { channelId, unprocessed } = req.query;
    const where = {
      ...(channelId && { channelId }),
      ...(unprocessed === 'true' && { processedByLlm: false })
    };
    
    const messages = await prisma.slackMessage.findMany({ where });
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

export { router as slackRouter };