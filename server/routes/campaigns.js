import express from 'express';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.user.id },
      include: {
        sender: { select: { name: true, email: true } },
        template: { select: { name: true } },
        campaignClients: {
          select: {
            status: true,
            client: { select: { name: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const campaignsWithStats = campaigns.map(campaign => ({
      ...campaign,
      stats: {
        total: campaign.campaignClients.length,
        sent: campaign.campaignClients.filter(cc => cc.status === 'sent').length,
        failed: campaign.campaignClients.filter(cc => cc.status === 'failed').length,
        pending: campaign.campaignClients.filter(cc => cc.status === 'pending').length
      }
    }));

    res.json(campaignsWithStats);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create and send campaign
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, senderId, templateId, clientIds } = req.body;

    if (!name || !senderId || !templateId || !clientIds?.length) {
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

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        senderId,
        templateId,
        userId: req.user.id,
        status: 'sending'
      }
    });

    // Add clients to campaign
    const campaignClients = await Promise.all(
      clientIds.map(clientId =>
        prisma.campaignClient.create({
          data: {
            campaignId: campaign.id,
            clientId
          }
        })
      )
    );

    // Start sending emails asynchronously
    sendEmails(campaign.id, sender, template, clientIds, req.user.id);

    await prisma.log.create({
      data: {
        action: 'create_campaign',
        details: `Created campaign: ${name} with ${clientIds.length} recipients`,
        userId: req.user.id
      }
    });

    res.status(201).json({
      ...campaign,
      stats: {
        total: clientIds.length,
        sent: 0,
        failed: 0,
        pending: clientIds.length
      }
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send emails function
async function sendEmails(campaignId, sender, template, clientIds, userId) {
    const transporter = nodemailer.createTransport({
    host: sender.host,
    port: sender.port,
    secure: sender.port === 465,
    auth: {
      user: sender.username,
      pass: sender.password
    }
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const clientId of clientIds) {
    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      if (!client) continue;

      // Replace template variables
      const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return client[key] || match;
      });

      const content = template.content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return client[key] || match;
      });

      await transporter.sendMail({
        from: `${sender.name} <${sender.email}>`,
        to: client.email,
        subject,
        html: content
      });

      await prisma.campaignClient.update({
        where: {
          campaignId_clientId: {
            campaignId,
            clientId
          }
        },
        data: {
          status: 'sent',
          sentAt: new Date()
        }
      });

      sentCount++;

      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to send email to client ${clientId}:`, error);

      await prisma.campaignClient.update({
        where: {
          campaignId_clientId: {
            campaignId,
            clientId
          }
        },
        data: {
          status: 'failed',
          errorMsg: error.message
        }
      });

      failedCount++;
    }
  }

  // Update campaign status
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'completed',
      sentAt: new Date()
    }
  });

  // Log completion
  await prisma.log.create({
    data: {
      action: 'complete_campaign',
      details: `Campaign completed: ${sentCount} sent, ${failedCount} failed`,
      userId
    }
  });
}

// Get campaign details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: {
        sender: { select: { name: true, email: true } },
        template: { select: { name: true, subject: true } },
        campaignClients: {
          include: {
            client: { select: { name: true, email: true } }
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;