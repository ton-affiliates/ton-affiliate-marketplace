// src/services/NotificationsService.ts

import appDataSource from '../ormconfig';
import { Notification } from '../entity/Notification';
import { Logger } from '../utils/Logger';
import { IsNull } from 'typeorm';
import { Address } from '@ton/core';

function notificationRepository() {
  return appDataSource.getRepository(Notification);
}

/**
 * Insert a new notification for a specific user.
 */
export async function createNotification(
    tonAddress: Address,
    message: string,
    campaignId?: string,
    link?: string
  ): Promise<Notification> {
    try {
      const walletAddress = tonAddress.toString();
      const repo = notificationRepository();
      const newNotif = repo.create({
        walletAddress,
        message,
        campaignId: campaignId || null,
        link: link || null
      });
      return await repo.save(newNotif);
    } catch (err) {
      Logger.error('Error creating notification: ' + err);
      throw new Error('Could not create notification');
    }
  }

/**
 * Retrieve a single notification by ID.
 */
export async function getNotificationById(notifId: number): Promise<Notification | null> {
  try {
    return await notificationRepository().findOneBy({ id: notifId });
  } catch (err) {
    Logger.error(`Error fetching notification by ID ${notifId}: ` + err);
    throw new Error('Could not retrieve notification');
  }
}


export async function getUnreadNotificationsForWallet(tonAddress: Address, campaignId: string) {
    const walletAddress = tonAddress.toString();
    try {
      return await notificationRepository().find({
        where: {
          walletAddress,
          campaignId,
          readAt: IsNull(),
        },
        order: { createdAt: 'DESC' },
      });
    } catch (err) {
      Logger.error(`Error fetching unread notifications for wallet=${walletAddress}: ` + err);
      throw new Error('Could not retrieve notifications');
    }
  }

/**
 * Mark a notification as read by setting `readAt` to the current time.
 * If it is already read, no change is made. Returns the updated notification.
 */
export async function markNotificationAsRead(notifId: number): Promise<Notification> {
    const repo = notificationRepository();
    const now = new Date();
  
    try {
      // find the notification
      const notif = await repo.findOneBy({ id: notifId });
      if (!notif) {
        throw new Error(`Notification with ID ${notifId} not found.`);
      }
  
      // if already read, just return
      if (notif.readAt) {
        return notif; // already read
      }
  
      // otherwise mark as read
      notif.readAt = now;
      return await repo.save(notif);
    } catch (err) {
      Logger.error(`Error marking notification ${notifId} as read: ` + err);
      throw new Error('Could not mark notification as read');
    }
  }
  


