import express from 'express';
import { prisma } from '../server.js';

const router = express.Router();

router.get('/messages', async (req, res, next) => {
  try {
    const { unprocessed, limit } = req.query;
    const where = {
      ...(unprocessed === 'true' && { processedByLlm: false })
    };
    
    const messages = await prisma.whatsAppMessage.findMany({
      where,
      ...(limit && { take: parseInt(limit) }),
      orderBy: { timestamp: 'desc' }
    });
    
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

export { router as whatsappRouter };