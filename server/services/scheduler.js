import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Schedule monitoring service
class SchedulerService {
  constructor() {
    this.activeJobs = new Map();
    this.initializeSchedules();
  }

  async initializeSchedules() {
    try {
      const schedules = await prisma.schedule.findMany({
        where: { isActive: true },
        include: {
          sender: true,
          template: true,
          user: true
        }
      });

      schedules.forEach(schedule => {
        this.addCronJob(schedule);
      });

      console.log(`🕒 Initialized ${schedules.length} scheduled jobs`);
    } catch (error) {
      console.error('Error initializing schedules:', error);
    }
  }

  addCronJob(schedule) {
    try {
      const job = cron.schedule(schedule.cronPattern, async () => {
        await this.executeSchedule(schedule);
      }, {
        scheduled: false
      });

      this.activeJobs.set(schedule.id, job);
      job.start();

      console.log(`Added cron job for schedule: ${schedule.name}`);
    } catch (error) {
      console.error(`Error adding cron job for schedule ${schedule.id}:`, error);
    }
  }

  removeCronJob(scheduleId) {
    const job = this.activeJobs.get(scheduleId);
    if (job) {
      job.destroy();
      this.activeJobs.delete(scheduleId);
      console.log(`Removed cron job for schedule: ${scheduleId}`);
    }
  }

  async executeSchedule(schedule) {
    try {
      console.log(`Executing schedule: ${schedule.name}`);

      // Get all clients for this user
      const clients = await prisma.client.findMany({
        where: { userId: schedule.userId }
      });

      if (clients.length === 0) {
        console.log(`No clients found for schedule: ${schedule.name}`);
        return;
      }

      // Create campaign for this scheduled execution
      const campaign = await prisma.campaign.create({
        data: {
          name: `Scheduled: ${schedule.name} - ${new Date().toLocaleString()}`,
          senderId: schedule.senderId,
          templateId: schedule.templateId,
          userId: schedule.userId,
          status: 'sending'
        }
      });

      // Add all clients to campaign
      await Promise.all(
        clients.map(client =>
          prisma.campaignClient.create({
            data: {
              campaignId: campaign.id,
              clientId: client.id
            }
          })
        )
      );

      // Send emails
      await this.sendScheduledEmails(
        campaign.id,
        schedule.sender,
        schedule.template,
        clients,
        schedule.userId
      );

      // Update schedule last run
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { lastRun: new Date() }
      });

      await prisma.log.create({
        data: {
          action: 'execute_schedule',
          details: `Executed schedule: ${schedule.name} - sent to ${clients.length} clients`,
          userId: schedule.userId
        }
      });

    } catch (error) {
      console.error(`Error executing schedule ${schedule.id}:`, error);

      await prisma.log.create({
        data: {
          action: 'schedule_error',
          details: `Schedule execution failed: ${schedule.name} - ${error.message}`,
          userId: schedule.userId
        }
      });
    }
  }

  async sendScheduledEmails(campaignId, sender, template, clients, userId) {
    const transporter = nodemailer.createTransport({
      host: sender.host,
      port: sender.port,
      secure: sender.port === 465, // true para 465, false para outras portas
      auth: {
        user: sender.username,
        pass: sender.password
      }
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const client of clients) {
      try {
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
              clientId: client.id
            }
          },
          data: {
            status: 'sent',
            sentAt: new Date()
          }
        });

        sentCount++;

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to send scheduled email to ${client.email}:`, error);

        await prisma.campaignClient.update({
          where: {
            campaignId_clientId: {
              campaignId,
              clientId: client.id
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

    console.log(`Scheduled emails completed: ${sentCount} sent, ${failedCount} failed`);
  }
}

// Initialize scheduler service
const schedulerService = new SchedulerService();

export default schedulerService;