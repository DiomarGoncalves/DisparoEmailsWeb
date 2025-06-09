import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all schedules
router.get('/', authenticateToken, async (req, res) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { userId: req.user.id },
      include: {
        sender: { select: { name: true, email: true } },
        template: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create schedule
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, senderId, templateId, cronPattern } = req.body;

    if (!name || !senderId || !templateId || !cronPattern) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate sender and template belong to user
    const [sender, template] = await Promise.all([
      prisma.sender.findFirst({
        where: { id: senderId, userId: req.user.id }
      }),
      prisma.template.findFirst({
        where: { id: templateId, userId: req.user.id }
      })
    ]);

    if (!sender || !template) {
      return res.status(404).json({ message: 'Sender or template not found' });
    }

    const schedule = await prisma.schedule.create({
      data: {
        name,
        senderId,
        templateId,
        cronPattern,
        userId: req.user.id
      }
    });

    await prisma.log.create({
      data: {
        action: 'create_schedule',
        details: `Created schedule: ${name}`,
        userId: req.user.id
      }
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update schedule
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, senderId, templateId, cronPattern, isActive } = req.body;

    const schedule = await prisma.schedule.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: {
        name,
        senderId,
        templateId,
        cronPattern,
        isActive
      }
    });

    await prisma.log.create({
      data: {
        action: 'update_schedule',
        details: `Updated schedule: ${name}`,
        userId: req.user.id
      }
    });

    res.json(updatedSchedule);
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete schedule
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const schedule = await prisma.schedule.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await prisma.schedule.delete({
      where: { id: req.params.id }
    });

    await prisma.log.create({
      data: {
        action: 'delete_schedule',
        details: `Deleted schedule: ${schedule.name}`,
        userId: req.user.id
      }
    });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;