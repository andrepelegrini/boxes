import express from 'express';
import { prisma } from '../server.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { key } = req.query;
    const where = key ? { key } : {};
    
    const settings = await prisma.setting.findMany({ where });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const setting = await prisma.setting.upsert({
      where: { key: req.body.key },
      update: req.body,
      create: req.body
    });
    res.json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
});

export { router as settingRouter };