import { Router } from 'express';
import {
  createCampaignRole,
  getCampaignRoleById,
  getAdvertiserForCampaign,
  getAllAffiliatesForCampaign,
  updateCampaignRole,
  deleteCampaignRole,
} from '../services/CampaignRoleService';
import { Logger } from '../utils/Logger';

const router = Router();

/**
 * POST /campaign-roles
 * Create a new campaign role
 */
router.post('/', async (req, res) => {
  try {
    Logger.debug('POST /campaign-roles - creating campaign role');
    const roleData = req.body; // e.g. { campaignId, walletId, role, affiliateId }
    const role = await createCampaignRole(roleData);
    res.status(201).json(role);
  } catch (err: any) {
    Logger.error('Error in POST /campaign-roles', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * GET /campaign-roles/:id
 * Retrieve a campaign role by local ID
 */
router.get('/:id', async (req, res) => {
  try {
    Logger.debug(`GET /campaign-roles/${req.params.id} - fetching campaign role`);
    const id = Number(req.params.id);
    const role = await getCampaignRoleById(id);
    if (!role) {
      res.status(404).json({ error: 'Campaign role not found' });
    }
    res.json(role);
  } catch (err: any) {
    Logger.error(`Error in GET /campaign-roles/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * GET /campaign-roles/advertiser/:campaignId
 * Retrieve the advertiser for a campaign
 */
router.get('/advertiser/:campaignId', async (req, res) => {
  try {
    Logger.debug(`GET /campaign-roles/advertiser/${req.params.campaignId} - fetching advertiser`);
    const { campaignId } = req.params;
    const advertiser = await getAdvertiserForCampaign(campaignId);
    if (!advertiser) {
      res.status(404).json({ error: 'Advertiser not found' });
    }
    res.json(advertiser);
  } catch (err: any) {
    Logger.error(`Error in GET /campaign-roles/advertiser/${req.params.campaignId}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * GET /campaign-roles/affiliates/:campaignId
 * Retrieve all affiliates for a campaign
 */
router.get('/affiliates/:campaignId', async (req, res) => {
  try {
    Logger.debug(`GET /campaign-roles/affiliates/${req.params.campaignId} - fetching affiliates`);
    const { campaignId } = req.params;
    const affiliates = await getAllAffiliatesForCampaign(campaignId);
    res.json(affiliates);
  } catch (err: any) {
    Logger.error(`Error in GET /campaign-roles/affiliates/${req.params.campaignId}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * PATCH /campaign-roles/:id
 * Update a campaign role
 */
router.patch('/:id', async (req, res) => {
  try {
    Logger.debug(`PATCH /campaign-roles/${req.params.id} - updating campaign role`);
    const id = Number(req.params.id);
    const updates = req.body;
    const role = await updateCampaignRole(id, updates);
    if (!role) {
      res.status(404).json({ error: 'Campaign role not found' });
    }
    res.json(role);
  } catch (err: any) {
    Logger.error(`Error in PATCH /campaign-roles/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * DELETE /campaign-roles/:id
 * Delete a campaign role
 */
router.delete('/:id', async (req, res) => {
  try {
    Logger.debug(`DELETE /campaign-roles/${req.params.id} - deleting campaign role`);
    const id = Number(req.params.id);
    const success = await deleteCampaignRole(id);
    if (!success) {
      res.status(404).json({ error: 'Campaign role not found' });
    }
    res.status(204).send();
  } catch (err: any) {
    Logger.error(`Error in DELETE /campaign-roles/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

export default router;
