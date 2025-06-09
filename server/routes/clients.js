import express from 'express';
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all clients
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      userId: req.user.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.client.count({ where })
    ]);

    res.json({
      clients,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create client
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if client already exists
    const existingClient = await prisma.client.findFirst({
      where: {
        email,
        userId: req.user.id
      }
    });

    if (existingClient) {
      return res.status(400).json({ message: 'Client with this email already exists' });
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        userId: req.user.id
      }
    });

    await prisma.log.create({
      data: {
        action: 'create_client',
        details: `Created client: ${name} (${email})`,
        userId: req.user.id
      }
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Import clients from Excel
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body; // Base64 encoded Excel file

    if (!data) {
      return res.status(400).json({ message: 'Excel file data is required' });
    }

    // Parse Excel file
    const buffer = Buffer.from(data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const row of jsonData) {
      try {
        const name = row.nome || row.name || row.Name || '';
        const email = row.email || row.Email || '';

        if (!name || !email) {
          results.skipped++;
          continue;
        }

        // Check if client already exists
        const existingClient = await prisma.client.findFirst({
          where: {
            email,
            userId: req.user.id
          }
        });

        if (existingClient) {
          results.skipped++;
          continue;
        }

        await prisma.client.create({
          data: {
            name,
            email,
            userId: req.user.id
          }
        });

        results.imported++;
      } catch (error) {
        results.errors.push(`Error importing ${row.email}: ${error.message}`);
      }
    }

    await prisma.log.create({
      data: {
        action: 'import_clients',
        details: `Imported ${results.imported} clients, skipped ${results.skipped}`,
        userId: req.user.id
      }
    });

    res.json(results);
  } catch (error) {
    console.error('Import clients error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Export clients to Excel
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.user.id },
      select: { name: true, email: true, createdAt: true }
    });

    const worksheet = XLSX.utils.json_to_sheet(clients);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await prisma.log.create({
      data: {
        action: 'export_clients',
        details: `Exported ${clients.length} clients`,
        userId: req.user.id
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=clients.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Export clients error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update client
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;

    const client = await prisma.client.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const updatedClient = await prisma.client.update({
      where: { id: req.params.id },
      data: { name, email }
    });

    await prisma.log.create({
      data: {
        action: 'update_client',
        details: `Updated client: ${name} (${email})`,
        userId: req.user.id
      }
    });

    res.json(updatedClient);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete client
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    await prisma.client.delete({
      where: { id: req.params.id }
    });

    await prisma.log.create({
      data: {
        action: 'delete_client',
        details: `Deleted client: ${client.name} (${client.email})`,
        userId: req.user.id
      }
    });

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;