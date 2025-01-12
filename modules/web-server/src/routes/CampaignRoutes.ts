import { Router } from 'express';
import {
  createCampaign,
  getCampaignById,
  getAllCampaignsForUser,
  updateCampaign,
  deleteCampaign,
} from '../services/CampaignService';
import { Logger } from '../utils/Logger';

const router = Router();

/**
 * POST /campaigns
 * Create a new campaign
 */
router.post('/', async (req, res) => {
  try {
    Logger.debug('POST /campaigns - creating campaign');
    const campaignData = req.body; // e.g. { id, walletId, assetType, assetName... }
    const campaign = await createCampaign(campaignData);
    res.status(201).json(campaign);
  } catch (err: any) {
    Logger.error('Error in POST /campaigns', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
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
    }
    res.json(campaign);
  } catch (err: any) {
    Logger.error(`Error in GET /campaigns/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
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
  } catch (err: any) {
    Logger.error(`Error in GET /campaigns/forUser/${req.params.userId}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
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
    }
    res.json(campaign);
  } catch (err: any) {
    Logger.error(`Error in PATCH /campaigns/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
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
    }
    res.status(204).send();
  } catch (err: any) {
    Logger.error(`Error in DELETE /campaigns/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

export default router;
