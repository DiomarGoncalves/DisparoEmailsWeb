import express from 'express';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all senders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const senders = await prisma.sender.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    // Remove password from response
    const safeSenders = senders.map(sender => ({
      ...sender,
      password: undefined
    }));

    res.json(safeSenders);
  } catch (error) {
    console.error('Get senders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create sender
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, host, port, secure, username, password } = req.body;

    if (!name || !email || !host || !port || !username || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const sender = await prisma.sender.create({
      data: {
        name,
        email,
        host,
        port: parseInt(port),
        secure: Boolean(secure),
        username,
        password,
        userId: req.user.id
      }
    });

    // Log creation
    await prisma.log.create({
      data: {
        action: 'create_sender',
        details: `Created sender: ${name} (${email})`,
        userId: req.user.id
      }
    });

    res.status(201).json({
      ...sender,
      password: undefined
    });
  } catch (error) {
    console.error('Create sender error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test sender connection
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const sender = await prisma.sender.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    const transporter = nodemailer.createTransport({
      host: sender.host,
      port: sender.port,
      secure: sender.port === 465, // true para 465, false para outras portas
      auth: {
        user: sender.username,
        pass: sender.password
      }
    });
    await transporter.verify();

    await prisma.log.create({
      data: {
        action: 'test_sender',
        details: `Tested sender connection: ${sender.name}`,
        userId: req.user.id
      }
    });

    res.json({ message: 'Connection successful' });
  } catch (error) {
    console.error('Test sender error:', error);
    res.status(400).json({ message: 'Connection failed: ' + error.message });
  }
});

// Update sender
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email, host, port, secure, username, password } = req.body;

    const sender = await prisma.sender.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    const updatedSender = await prisma.sender.update({
      where: { id: req.params.id },
      data: {
        name,
        email,
        host,
        port: parseInt(port),
        secure: Boolean(secure),
        username,
        ...(password && { password })
      }
    });

    await prisma.log.create({
      data: {
        action: 'update_sender',
        details: `Updated sender: ${name}`,
        userId: req.user.id
      }
    });

    res.json({
      ...updatedSender,
      password: undefined
    });
  } catch (error) {
    console.error('Update sender error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete sender
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const sender = await prisma.sender.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    await prisma.sender.delete({
      where: { id: req.params.id }
    });

    await prisma.log.create({
      data: {
        action: 'delete_sender',
        details: `Deleted sender: ${sender.name}`,
        userId: req.user.id
      }
    });

    res.json({ message: 'Sender deleted successfully' });
  } catch (error) {
    console.error('Delete sender error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;