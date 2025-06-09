import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get template by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await prisma.template.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create template
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, subject, content } = req.body;

    if (!name || !subject || !content) {
      return res.status(400).json({ message: 'Name, subject and content are required' });
    }

    const template = await prisma.template.create({
      data: {
        name,
        subject,
        content,
        userId: req.user.id
      }
    });

    await prisma.log.create({
      data: {
        action: 'create_template',
        details: `Created template: ${name}`,
        userId: req.user.id
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update template
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, subject, content } = req.body;

    const template = await prisma.template.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const updatedTemplate = await prisma.template.update({
      where: { id: req.params.id },
      data: { name, subject, content }
    });

    await prisma.log.create({
      data: {
        action: 'update_template',
        details: `Updated template: ${name}`,
        userId: req.user.id
      }
    });

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete template
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await prisma.template.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    await prisma.template.delete({
      where: { id: req.params.id }
    });

    await prisma.log.create({
      data: {
        action: 'delete_template',
        details: `Deleted template: ${template.name}`,
        userId: req.user.id
      }
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Preview template with data
router.post('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const { clientData } = req.body;

    const template = await prisma.template.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Replace template variables
    let subject = template.subject;
    let content = template.content;

    if (clientData) {
      subject = subject.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return clientData[key] || match;
      });

      content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return clientData[key] || match;
      });
    }

    res.json({
      subject,
      content,
      original: {
        subject: template.subject,
        content: template.content
      }
    });
  } catch (error) {
    console.error('Preview template error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;