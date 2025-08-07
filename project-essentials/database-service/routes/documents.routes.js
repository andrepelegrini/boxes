import express from 'express';
import { prisma } from '../server.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { userId, projectId } = req.query;
    const where = {
      ...(userId && { userId }),
      ...(projectId && { projectId })
    };
    
    const documents = await prisma.document.findMany({ where });
    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const document = await prisma.document.create({ data: req.body });
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
});

export { router as documentRouter };