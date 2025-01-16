import { Router } from 'express';
import { createCampaign, getCampaignById } from '../services/CampaignsService';
import { fetchPublicChatInfo } from '../services/TelegramService';
import { Logger } from '../utils/Logger';
import { getUserByWalletAddress } from '../services/UsersService'; 

const router = Router();


router.get('/:id', async (req, res) => {
  try {
    Logger.debug(`GET /campaigns/${req.params.id}`);
    const { id } = req.params;
    const campaign = await getCampaignById(id);
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

router.post('/', async (req, res) => {
  try {
    Logger.debug('POST /campaigns');

    const {
      campaignId,
      walletAddress,
      campaignName,
      category,
      inviteLink,
      description,
      telegramType,
    } = req.body;

    // Validate
    if (!walletAddress) {
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
    const existingUser = await getUserByWalletAddress(walletAddress);
    if (!existingUser) {
      res.status(404).json({
        error: `No wallet found with address: ${walletAddress}. Please connect a wallet first.`,
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

    // 3) Prepare campaign data
    const campaignData = {
      id: campaignId,
      walletAddress: walletAddress, // string PK referencing "wallets"."address"
      assetType: telegramType,
      assetCategory: category,
      assetName: telegramAsset.name,
      assetTitle: campaignName,
      assetDescription: description || telegramAsset.description,
      inviteLink: inviteLink || telegramAsset.url,
      assetPhoto: telegramAsset.photo ? Buffer.from(telegramAsset.photo) : null,
    };

    Logger.debug('campaignData about to be created:', campaignData);

    // 4) Create campaign
    const newCampaign = await createCampaign(campaignData);
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