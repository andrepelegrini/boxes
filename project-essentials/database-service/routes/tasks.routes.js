import express from 'express';
import { prisma } from '../server.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all tasks
router.get('/', async (req, res, next) => {
  try {
    const { userId, projectId, status } = req.query;
    
    const where = {
      ...(userId && { userId }),
      ...(projectId && { projectId }),
      ...(status && { status })
    };
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

// Create task
router.post('/', async (req, res, next) => {
  try {
    const task = await prisma.task.create({
      data: req.body
    });
    
    logger.info('Task created', { taskId: task.id });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// Basic CRUD operations would go here...
// GET /:id, PATCH /:id, DELETE /:id

export { router as taskRouter };