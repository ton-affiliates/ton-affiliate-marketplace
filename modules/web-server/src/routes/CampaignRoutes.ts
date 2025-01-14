import { Router } from 'express';
import {
  createCampaign,
  getCampaignById,
  getAllCampaignsForUser,
  updateCampaign,
  deleteCampaign,
} from '../services/CampaignsService';
import { Logger } from '../utils/Logger';
import { fetchPublicChatInfo } from '../telegram/TelegramService';

const router = Router();

/**
 * POST /campaigns
 * Example of required fields:
 *  {
 *    "id": "onChainID_1234",          // from your blockchain
 *    "walletId": 1,                   // or any valid wallet ID
 *    "assetType": "CHANNEL",          // "CHANNEL", "GROUP", etc.
 *    "telegramHandle": "MyPublicChan",
 *    "category": "CRYPTO"             // or any other info
 *  }
 */
router.post('/', async (req, res) => {
  try {
    Logger.debug('POST /campaigns');

    const {
      id,
      walletId,
      assetType,
      telegramHandle,
      category,
    } = req.body;

    if (!id || !walletId || !assetType || !telegramHandle) {
      res.status(400).json({
        error: 'Missing required fields: id, walletId, assetType, telegramHandle',
      });
      return;
    } else {
      let telegramAsset;
      try {
        telegramAsset = await fetchPublicChatInfo(telegramHandle);
      } catch (err: any) {
        Logger.error('Failed fetching Telegram info:', err);
        res.status(400).json({ error: err.message });
        return;
        // Stop further execution in this block by using else
      }

      // Only proceed if telegramAsset is successfully fetched
      if (!telegramAsset) {
        Logger.error('Could not fetch Telegram info');
        res.status(400).json({ error: 'Could not fetch Telegram info' });
        return;
      } else {
        const campaignData = {
          id,
          walletId,
          assetType,
          assetCategory: category,
          assetName: telegramAsset.name,
          assetTitle: telegramAsset.name,
          assetDescription: telegramAsset.description ?? undefined,
          inviteLink: telegramAsset.url,
          assetPhoto: telegramAsset.photo ? Buffer.from(telegramAsset.photo) : null,
        };

        Logger.debug('campaignData about to be created: ' + campaignData);

        const newCampaign = await createCampaign(campaignData);

        res.status(201).json(newCampaign);
        return;
      }
    }
  } catch (err: any) {
    Logger.error('Error in POST /campaigns:' + err);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }
});


  
  
  

/**
 * GET /campaigns/:id
 * Retrieve a campaign by ID
 */
router.get('/:id', async (req, res) => {
  try {
    Logger.debug(`GET /campaigns/${req.params.id} - fetching campaign by ID`);
    const { id } = req.params;
    const campaign = await getCampaignById(id);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(campaign);
    return;
  } catch (err: any) {
    Logger.error(`Error in GET /campaigns/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * GET /campaigns/forUser/:userId
 * Get all campaigns for a user
 */
router.get('/forUser/:userId', async (req, res) => {
  try {
    Logger.debug(`GET /campaigns/forUser/${req.params.userId} - fetching campaigns for user`);
    const userId = Number(req.params.userId);
    const campaigns = await getAllCampaignsForUser(userId);
    res.json(campaigns);
    return;
  } catch (err: any) {
    Logger.error(`Error in GET /campaigns/forUser/${req.params.userId}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * PATCH /campaigns/:id
 * Update a campaign
 */
router.patch('/:id', async (req, res) => {
  try {
    Logger.debug(`PATCH /campaigns/${req.params.id} - updating campaign`);
    const { id } = req.params;
    const updates = req.body;
    const campaign = await updateCampaign(id, updates);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(campaign);
    return;
  } catch (err: any) {
    Logger.error(`Error in PATCH /campaigns/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * DELETE /campaigns/:id
 * Delete a campaign
 */
router.delete('/:id', async (req, res) => {
  try {
    Logger.debug(`DELETE /campaigns/${req.params.id} - deleting campaign`);
    const { id } = req.params;
    const success = await deleteCampaign(id);
    if (!success) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.status(204).send();
    return;
  } catch (err: any) {
    Logger.error(`Error in DELETE /campaigns/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

export default router;
