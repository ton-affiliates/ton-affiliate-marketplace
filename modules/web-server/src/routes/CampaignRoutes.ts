// src/routes/CampaignRoutes.ts

import { Router } from 'express';
import { ensureCampaign, getCampaignByIdWithAdvertiser, getAllCampaignsForWallet } from '../services/CampaignsService';
import { fetchChatInfo } from '../services/TelegramService';
import { Logger } from '../utils/Logger';
import { getUnreadNotificationsForWallet, markNotificationAsRead } from '../services/NotificationsService';
import { Address } from '@ton/core';
import { RoleType } from '../entity/CampaignRole';
import { CampaignState } from '../entity/Campaign';

const router = Router();


router.get('/:id', async (req, res) => {
  try {
    Logger.debug(`GET /campaigns/${req.params.id}`);
    const { id } = req.params;
    const campaign = await getCampaignByIdWithAdvertiser(id);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(campaign);
    return;
  } catch (err) {
    Logger.error('Error in GET /campaign/:id', err);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }
});


router.get('/:id/notifications', async (req, res) => {
  const { id } = req.params; // campaignId
  const { walletAddress } = req.query;

  if (!walletAddress) {
    res.status(400).json({ error: 'Missing walletAddress query parameter' });
    return;
  }

  try {
    const tonAddress = Address.parse(walletAddress.toString());
    const notifs = await getUnreadNotificationsForWallet(tonAddress, id);
    res.json(notifs);
  } catch (err) {
    Logger.error(`Error in GET /campaigns/${id}/notifications:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.patch('/:id/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notifIdNum = parseInt(notificationId, 10);
    if (isNaN(notifIdNum)) {
      res.status(400).json({ error: 'Invalid notificationId parameter' });
      return;
    }

    const updatedNotif = await markNotificationAsRead(notifIdNum);
    res.json(updatedNotif);
  } catch (err: any) {
    Logger.error(`Error in PATCH /campaigns/${req.params.id}/notifications/${req.params.notificationId}/read:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/byWallet/:address', async (req, res) => {
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
  } catch (err) {
    Logger.error(`Error in GET /campaigns/byWallet/:address: ${err}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/campaigns
 * Creates or updates a campaign after verifying the Telegram channel & admin status
 */
router.post('/', async (req, res) => {
  try {
    Logger.debug('POST /campaigns');

    const {
      campaignId,
      campaignName,
      category,
      inviteLink,
      telegramType,
    } = req.body;

    if (!campaignId || !inviteLink || !telegramType) {
      res.status(400).json({
        error: 'Missing required fields: campaignId, inviteLink, telegramType',
      });
      return;
    }

    // 1) Parse handle from the link (e.g. "https://t.me/MyPublicChannel" => "MyPublicChannel")
    const handle = parseHandleFromLink(inviteLink);

    // 2) Fetch Telegram info, including isPublic & botIsAdmin
    const telegramAsset = await fetchChatInfo(handle);
    if (!telegramAsset) {
      res.status(400).json({ error: 'Could not fetch Telegram info' });
      return;
    }

    Logger.info(`inviteLink: ${inviteLink}, telegramAsset: ${JSON.stringify(telegramAsset)}`);
    
    // 3) Ensure it's a public channel and the bot is an admin
    if (!telegramAsset.botIsAdmin) {
      res.status(400).json({ 
        error: 'Our verifier bot is not an admin in this channel. Please grant it admin rights & try again.' 
      });
      return;
    }


    // 4) Prepare campaign data
    const campaignData = {
      id: campaignId,
      state: CampaignState.TELEGRAM_DETAILS_SET,
      handle: handle,
      inviteLink: telegramAsset.url,
      campaignName: campaignName,
      assetType: telegramType,
      assetCategory: category,
      assetName: telegramAsset.name,
      assetDescription: telegramAsset.description,
      assetPhoto: telegramAsset.photo ? Buffer.from(telegramAsset.photo) : null,
      botIsAdmin: telegramAsset.botIsAdmin,
      adminPrivileges: telegramAsset.adminPrivileges,
      memberCount: telegramAsset.memberCount
    };

    Logger.debug('campaignData about to be created:', campaignData);

    // 5) Create or update the campaign in DB
    const newCampaign = await ensureCampaign(campaignData);
    res.status(201).json(newCampaign);
    return;

  } catch (err: any) {
    Logger.error('Error in POST /campaigns:', err);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }
});

export default router;

/** 
 * e.g. "https://t.me/MyPublicChannel" => "MyPublicChannel" 
 * If the link doesn't match, fallback to the entire link 
 */
function parseHandleFromLink(link: string): string {
  const match = link.match(/t\.me\/([^/]+)/i);
  if (match && match[1]) return match[1];
  return link; 
}
