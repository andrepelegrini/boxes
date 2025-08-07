import express from 'express';
import { prisma } from '../server.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'on-shelf', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  userId: z.string()
});

const UpdateProjectSchema = CreateProjectSchema.partial().omit({ userId: true });

// Get all projects for a user
router.get('/', async (req, res, next) => {
  try {
    const { userId, status, includeArchived } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const where = {
      userId,
      ...(status && { status }),
      ...(includeArchived !== 'true' && { status: { not: 'archived' } })
    };
    
    const projects = await prisma.project.findMany({
      where,
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            priority: true
          }
        },
        _count: {
          select: {
            tasks: true,
            documents: true,
            events: true
          }
        }
      },
      orderBy: [
        { nextUp: 'desc' },
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ]
    });
    
    logger.info('Projects retrieved', { 
      userId, 
      count: projects.length 
    });
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    next(error);
  }
});

// Get single project
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
        documents: true,
        events: true,
        checkIns: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        slackChannels: true,
        _count: {
          select: {
            tasks: true,
            documents: true,
            events: true
          }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', async (req, res, next) => {
  try {
    const validatedData = CreateProjectSchema.parse(req.body);
    
    const project = await prisma.project.create({
      data: {
        ...validatedData,
        tags: validatedData.tags ? JSON.stringify(validatedData.tags) : null,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null
      }
    });
    
    logger.info('Project created', { 
      projectId: project.id,
      userId: project.userId 
    });
    
    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    next(error);
  }
});

// Update project
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateProjectSchema.parse(req.body);
    
    const updateData = {
      ...validatedData,
      ...(validatedData.tags && { tags: JSON.stringify(validatedData.tags) }),
      ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
      ...(validatedData.dueDate && { dueDate: new Date(validatedData.dueDate) })
    };
    
    const project = await prisma.project.update({
      where: { id },
      data: updateData
    });
    
    logger.info('Project updated', { projectId: id });
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Project not found' });
    }
    next(error);
  }
});

// Delete project
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.project.delete({
      where: { id }
    });
    
    logger.info('Project deleted', { projectId: id });
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Project not found' });
    }
    next(error);
  }
});

export { router as projectRouter };