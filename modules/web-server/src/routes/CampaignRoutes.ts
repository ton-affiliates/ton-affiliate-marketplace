// src/routes/CampaignRoutes.ts

import { Router, Request, Response } from 'express';
import { Logger } from '../utils/Logger';
import { ensureCampaign, getCampaignByIdWithAdvertiser, getAllCampaignsForWallet } from '../services/CampaignsService';
import { getTelegramAssetDataFromTelegram, createAndPersistTelegramAsset } from '../services/TelegramService';
import { getUnreadNotificationsForWallet, markNotificationAsRead } from '../services/NotificationsService';
import { Address } from '@ton/core';
import { RoleType } from '../entity/CampaignRole';
import dotenv from 'dotenv';
import { CampaignApiResponse, NotificationApiResponse } from '@common/ApiResponses';
import { CampaignState } from "../entity/Campaign";

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


router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    Logger.debug('POST /campaigns');

    const {
      campaignId,       // e.g. "123"
      campaignName,     // e.g. "My Campaign"
      category,         // optional
      inviteLink,       // e.g. "https://t.me/MyChannel"
      telegramEventsOpCodesArray, // e.g. [1, 3]
      // verifyUserIsHumanOnReferral // boolean
    } = req.body;

    Logger.info(telegramEventsOpCodesArray);
    Logger.info(JSON.stringify(req.body));
    

    // Validate required fields
    if (!campaignId || !inviteLink) {
      res.status(400).json({ error: 'Missing required fields: campaignId, inviteLink' });
      return;
    }

    // 1) Ensure that the Telegram asset is updated/created based on the invite link.
    const telegramAsset = await createAndPersistTelegramAsset(inviteLink);
    if (!telegramAsset) {
      res.status(400).json({ error: 'Could not ensure Telegram asset' });
      return;
    }

    // 2) Build a Set of numeric op codes from all events in regularUsers & premiumUsers
    const eventsToVerifySet = new Set<number>(telegramEventsOpCodesArray);
    // Convert the Set to an array
    const eventsToVerify = Array.from(eventsToVerifySet);
    Logger.info(`Derived eventsToVerify: ${JSON.stringify(eventsToVerify)}`);

    // 3) Build the campaign data object
    const campaignData = {
      id: campaignId,
      name: campaignName,
      category: category,
      telegramAsset: telegramAsset,
      eventsToVerify: eventsToVerify,
      // verifyUserIsHumanOnReferral: verifyUserIsHumanOnReferral,
      state: CampaignState.TELEGRAM_DETAILS_SET
    };

    Logger.info(`Campaign data about to be created/updated: ${JSON.stringify(campaignData)}`);

    // 4) Create or update the campaign in the database.
    const newCampaign = await ensureCampaign(campaignData);

    Logger.info(`New Campaign data: ${JSON.stringify(campaignData)}`);

    // 5) Return the newly created/updated campaign
    res.status(201).json(newCampaign);

  } catch (err: any) {
    Logger.error('Error in POST /campaigns:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



/**
 * POST /api/v1/campaigns/telegram-asset
 *
 * Creates or updates a Telegram asset (via `ensureTelegramAssetFromTelegram`),
 * returning the resulting asset so the user can confirm details before finalizing.
 */
router.post('/telegram-asset', async (req: Request, res: Response): Promise<void> => {
  try {
    Logger.debug('POST /api/v1/campaigns/telegram-asset');

    const { inviteLink } = req.body;
    if (!inviteLink) {
      res.status(400).json({ error: 'Missing required field: inviteLink' });
      return;
    }

    // 1) Ensure that the Telegram asset is updated/created based on the invite link.
    const telegramAsset = await getTelegramAssetDataFromTelegram(inviteLink);
    if (!telegramAsset) {
      res.status(400).json({ error: 'Could not ensure Telegram asset' });
      return;
    }

    // 2) Return the asset so the client can confirm the details (title, photo, etc.).
    res.status(200).json(telegramAsset);
  } catch (err: any) {
    Logger.error('Error in POST /campaigns/telegram-asset:', err);
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
    await createAndPersistTelegramAsset(campaign.inviteLink);
    // Optionally, re-read the campaign from the DB if you need the updated data.
    const updatedCampaign = await getCampaignByIdWithAdvertiser(id);
    res.json(updatedCampaign);
  } catch (err: any) {
    Logger.error(`Error in POST /campaigns/${req.params.id}/refresh-bot-admin`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
