import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get logs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, action = '', startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      userId: req.user.id,
      ...(action && { action: { contains: action } }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.log.count({ where })
    ]);

    res.json({
      logs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;