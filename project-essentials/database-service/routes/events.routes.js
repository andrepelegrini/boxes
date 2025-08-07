import express from 'express';
import { prisma } from '../server.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const where = {
      ...(userId && { userId }),
      ...(startDate && endDate && {
        startDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };
    
    const events = await prisma.event.findMany({ where });
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

export { router as eventRouter };