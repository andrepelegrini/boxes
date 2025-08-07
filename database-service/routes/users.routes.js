import express from 'express';
import { prisma } from '../server.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export { router as userRouter };