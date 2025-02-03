// src/routes/CampaignRoutes.ts

import { Router, Request, Response } from 'express';
import { Logger } from '../utils/Logger';
import { ensureCampaign, getCampaignByIdWithAdvertiser, getAllCampaignsForWallet } from '../services/CampaignsService';
import { ensureTelegramAssetFromTelegram } from '../services/TelegramService';
import { CampaignState } from "../entity/Campaign";
import { getUnreadNotificationsForWallet, markNotificationAsRead } from '../services/NotificationsService';
import { Address } from '@ton/core';
import { RoleType } from '../entity/CampaignRole';
import dotenv from 'dotenv';
import { CampaignApiResponse, NotificationApiResponse } from '@common/ApiResponses';

dotenv.config();

const router = Router();

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    Logger.debug(`GET /campaigns/${req.params.id}`);
    const { id } = req.params;
    const campaign: CampaignApiResponse | null = await getCampaignByIdWithAdvertiser(id);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(campaign);
    return;
  } catch (err: any) {
    Logger.error('Error in GET /campaign/:id', err);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }
});

router.get('/:id/notifications', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params; // campaignId
  const { walletAddress } = req.query;
  if (!walletAddress) {
    res.status(400).json({ error: 'Missing walletAddress query parameter' });
    return;
  }
  try {
    const tonAddress = Address.parse(walletAddress.toString());
    const notifs = await getUnreadNotificationsForWallet(tonAddress, id);
    // Map the Notification entities (with Date fields) to NotificationApiResponse.
    const response: NotificationApiResponse[] = notifs.map((notif) => ({
      id: notif.id,
      message: notif.message,
      createdAt: notif.createdAt.toISOString(),
      readAt: notif.readAt ? notif.readAt.toISOString() : null,
      link: notif.link || null,
    }));
    res.json(response);
  } catch (err: any) {
    Logger.error(`Error in GET /campaigns/${id}/notifications:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.patch('/:id/notifications/:notificationId/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;
    const notifIdNum = parseInt(notificationId, 10);
    if (isNaN(notifIdNum)) {
      res.status(400).json({ error: 'Invalid notificationId parameter' });
      return;
    }
    const updatedNotif = await markNotificationAsRead(notifIdNum);
    // Convert Date fields to strings.
    const response: NotificationApiResponse = {
      id: updatedNotif.id,
      message: updatedNotif.message,
      createdAt: updatedNotif.createdAt.toISOString(),
      readAt: updatedNotif.readAt ? updatedNotif.readAt.toISOString() : null,
      link: updatedNotif.link || null,
    };
    res.json(response);
  } catch (err: any) {
    Logger.error(`Error in PATCH /campaigns/${req.params.id}/notifications/${req.params.notificationId}/read:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/byWallet/:address', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    const roleParam = req.query.role as string | undefined;
    
    let roleType: RoleType | undefined;
    if (roleParam) {
      if (roleParam.toLowerCase() === 'advertiser') {
        roleType = RoleType.ADVERTISER;
      } else if (roleParam.toLowerCase() === 'affiliate') {
        roleType = RoleType.AFFILIATE;
      }
    }
    Logger.info(`GET /campaigns/byWallet/${address}?role=${roleParam}`);
    if (!roleType) {
      res.status(400).json({ error: 'Invalid or missing role query param' });
      return;
    }
    const campaigns = await getAllCampaignsForWallet(Address.parse(address), roleType);
    res.json(campaigns);
  } catch (err: any) {
    Logger.error(`Error in GET /campaigns/byWallet/:address: ${err}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Helper function to extract a Telegram handle from an invite link.
 * For example: "https://t.me/MyPublicChannel" => "MyPublicChannel"
 */
function parseHandleFromLink(link: string): string {
  const match = link.match(/t\.me\/([^/]+)/i);
  if (match && match[1]) return match[1];
  return link;
}

/**
 * POST /api/v1/campaigns
 *
 * Creates or updates a campaign after verifying the Telegram channel & admin status.
 * This route calls:
 *  1. ensureTelegramAssetFromTelegram to create or update the Telegram asset (using the invite link)
 *  2. ensureCampaign to create or update the campaign and link it to the Telegram asset.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    Logger.debug('POST /campaigns');
    const {
      campaignId,    // Campaign ID from the blockchain
      campaignName,  // Human-readable campaign name
      category,      // (Optional) Category information (for TelegramAsset.category)
      inviteLink,    // Telegram invite link (e.g. "https://t.me/MyChannel")
    } = req.body;
    if (!campaignId || !inviteLink) {
      res.status(400).json({ error: 'Missing required fields: campaignId, inviteLink' });
      return;
    }
    // (Optional) Extract the handle if needed for logging.
    const handle = parseHandleFromLink(inviteLink);
    Logger.info(`Extracted handle: ${handle}`);
    // 1) Ensure that the Telegram asset is updated/created based on the invite link.
    const telegramAsset = await ensureTelegramAssetFromTelegram(inviteLink);
    if (!telegramAsset) {
      res.status(400).json({ error: 'Could not ensure Telegram asset' });
      return;
    }
    // 2) Prepare campaign data.
    const campaignData = {
      id: campaignId,
      name: campaignName,
      state: CampaignState.TELEGRAM_DETAILS_SET,
      telegramAsset: telegramAsset,
      category: category
    };
    Logger.debug('Campaign data about to be created:', campaignData);
    // 3) Create or update the campaign in the database.
    const newCampaign = await ensureCampaign(campaignData);
    res.status(201).json(newCampaign);
  } catch (err: any) {
    Logger.error('Error in POST /campaigns:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/:id/refresh-bot-admin', async (req: Request, res: Response): Promise<void> => {
  try {
    Logger.debug(`POST /campaigns/${req.params.id}/refresh-bot-admin`);
    const { id } = req.params;
    // Fetch the current campaign, including its Telegram asset.
    const campaign = await getCampaignByIdWithAdvertiser(id);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (!campaign.inviteLink) {
      res.status(400).json({ error: 'Campaign does not have an invite link' });
      return;
    }
    // Re-check the Telegram asset using the invite link.
    await ensureTelegramAssetFromTelegram(campaign.inviteLink);
    // Optionally, re-read the campaign from the DB if you need the updated data.
    const updatedCampaign = await getCampaignByIdWithAdvertiser(id);
    res.json(updatedCampaign);
  } catch (err: any) {
    Logger.error(`Error in POST /campaigns/${req.params.id}/refresh-bot-admin`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
