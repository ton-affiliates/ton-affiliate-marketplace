import { Router } from 'express';
import { upsertCampaign, getCampaignByIdWithAdvertiser, getAllCampaignsForWallet } from '../services/CampaignsService';
import { fetchPublicChatInfo } from '../services/TelegramService';
import { Logger } from '../utils/Logger';
import { getUserByWalletAddress } from '../services/UsersService'; 
import { getUnreadNotificationsForWallet, markNotificationAsRead } from '../services/NotificationsService';
import {Address} from "@ton/core";
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

// e.g. /campaigns/:id/notifications?walletAddress=EQxyz
router.get('/:id/notifications', async (req, res) => {
  const { id } = req.params; // campaignId
  const { walletAddress } = req.query;

  if (!walletAddress) {
    res.status(400).json({ error: 'Missing walletAddress query parameter' });
    return;
  }

  // fetch
  const tonAddress = Address.parse(walletAddress.toString());
  const notifs = await getUnreadNotificationsForWallet(tonAddress, id);
  res.json(notifs);
  return;
});


router.patch('/:id/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notifIdNum = parseInt(notificationId, 10);
    if (isNaN(notifIdNum)) {
      res.status(400).json({ error: 'Invalid notificationId parameter' });
      return;
    }

    // Call your service function
    const updatedNotif = await markNotificationAsRead(notifIdNum);
    res.json(updatedNotif);
    return;
  } catch (err: any) {
    Logger.error(`Error in PATCH /campaigns/${req.params.id}/notifications/${req.params.notificationId}/read:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }
});

router.get('/byWallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const roleParam = req.query.role as string | undefined; 
    // e.g. "advertiser" or "affiliate"

    let roleType: RoleType | undefined;
    if (roleParam) {
      // Convert the incoming string to our RoleType enum
      // If you have RoleType = { ADVERTISER = 'advertiser', AFFILIATE = 'affiliate' }
      // then:
      if (roleParam.toLowerCase() === 'advertiser') {
        roleType = RoleType.ADVERTISER;
      } else if (roleParam.toLowerCase() === 'affiliate') {
        roleType = RoleType.AFFILIATE;
      }
    }

    Logger.info(`GET /campaigns/byWallet/${address}?role=${roleParam}`);

    // If roleType is undefined, decide whether to handle an error or default
    if (!roleType) {
      res.status(400).json({ error: 'Invalid or missing role query param' });
      return;
    }

    // Now call your service with both the address and role
    const campaigns = await getAllCampaignsForWallet(Address.parse(address), roleType);
    res.json(campaigns);
  } catch (err) {
    Logger.error(`Error in GET /campaigns/byWallet/:address: ${err}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    Logger.debug('POST /campaigns');

    const {
      campaignId,
      walletAddress,
      campaignName,
      category,
      inviteLink,
      telegramType,
    } = req.body;


    const tonAddress = Address.parseRaw(walletAddress); 

    // Validate
    if (!tonAddress) {
      res.status(400).json({ error: 'Missing walletAddress' });
      return;
    }
    if (!campaignId || !inviteLink || !telegramType) {
      res.status(400).json({
        error: 'Missing required fields: campaignId, inviteLink, telegramType',
      });
      return;
    }

    // 1) Confirm the wallet already exists in DB
    const existingUser = await getUserByWalletAddress(tonAddress);
    if (!existingUser) {
      res.status(404).json({
        error: `No wallet found with address: ${tonAddress}. Please connect a wallet first.`,
      });
      return;
    }

    // 2) Optionally fetch Telegram info
    const handle = parseHandleFromLink(inviteLink);
    const telegramAsset = await fetchPublicChatInfo(handle);
    if (!telegramAsset) {
      res.status(400).json({ error: 'Could not fetch Telegram info' });
      return;
    }

    Logger.info(`inviteLink: ${inviteLink}, telegramAsset.url: ${telegramAsset.url}`);

    // 3) Prepare campaign data
    const campaignData = {
      id: campaignId,
      state: CampaignState.TELEGRAM_DETAILS_SET,
      campaignName: campaignName,
      walletAddress: walletAddress, // string PK referencing "wallets"."address"
      assetType: telegramType,
      assetCategory: category,
      assetName: telegramAsset.name,
      assetDescription: telegramAsset.description,
      inviteLink: telegramAsset.url,
      assetPhoto: telegramAsset.photo ? Buffer.from(telegramAsset.photo) : null,
    };

    Logger.debug('campaignData about to be created:', campaignData);

    // 4) Create campaign
    const newCampaign = await upsertCampaign(campaignData);
    res.status(201).json(newCampaign);
    return;

  } catch (err: any) {
    Logger.error('Error in POST /campaigns:', err);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }
});

export default router;

function parseHandleFromLink(link: string): string {
  const match = link.match(/t\.me\/([^/]+)/i);
  if (match && match[1]) return match[1];
  return link; 
}