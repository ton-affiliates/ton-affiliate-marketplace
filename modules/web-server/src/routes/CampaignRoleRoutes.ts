// src/routes/CampaignRoleRoutes.ts

import { Router } from 'express';
import {
  getAffiliatesByWallet,
  getAffiliateRolesForCampaignPaged, 
  getAffiliateUsersForCampaign
} from '../services/CampaignRolesService';
import { Logger } from '../utils/Logger';
import { Address } from '@ton/core';

const router = Router();

/**
 * GET /campaign-roles/affiliates/paged/:campaignId
 * Retrieve affiliate "roles" for a campaign with pagination
 */
router.get('/affiliates/paged/:campaignId', async (req, res) => {
  try {
    Logger.debug(
      `GET /campaign-roles/affiliates/paged/${req.params.campaignId} - fetching affiliates (paged)`
    );

    const { campaignId } = req.params;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    // CHANGED to getAffiliateRolesForCampaignPaged
    const roles = await getAffiliateRolesForCampaignPaged(campaignId, offset, limit);

    // Return the raw CampaignRole[] (which includes affiliateId, walletAddress, etc.)
    res.json(roles);
    return;
  } catch (err: any) {
    Logger.error(
      `Error in GET /campaign-roles/affiliates/paged/${req.params.campaignId}: ${err}`
    );
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * GET /campaign-roles/affiliates/:campaignId/:affiliateId
 * Retrieve a single affiliate user for a campaign
 */
router.get('/affiliates/:campaignId(\\d+)/:affiliateId(\\d+)', async (req, res) => {
  try {
    Logger.debug(
      `GET /campaign-roles/affiliates/${req.params.campaignId}/${req.params.affiliateId} - fetching single affiliate`
    );

    const { campaignId, affiliateId } = req.params;
    const affUsers = await getAffiliateUsersForCampaign(
      campaignId,
      parseInt(affiliateId as string)
    );

    if (!affUsers) {
      res.status(404).json({ error: 'Affiliate not found' });
      return;
    }

    res.json(affUsers);
    return;
  } catch (err: any) {
    Logger.error(
      `Error in GET /campaign-roles/affiliates/${req.params.campaignId}/${req.params.affiliateId}: ${err}`
    );
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * GET /campaign-roles/affiliates/by-wallet/:walletAddress
 * Retrieve all affiliates associated with a specific wallet address
 */
router.get('/affiliates/by-wallet/:walletAddress', async (req, res) => {
  try {
    Logger.debug(
      `GET /campaign-roles/affiliates/by-wallet/${req.params.walletAddress} - fetching affiliates by wallet`
    );

    const { walletAddress } = req.params;
    const tonAddress = Address.parse(walletAddress);

    const affiliates = await getAffiliatesByWallet(tonAddress);
    if (affiliates.length === 0) {
      res.status(404).json({ error: 'No affiliates found for the provided wallet address' });
      return;
    }

    res.json(affiliates);
    return;
  } catch (err: any) {
    Logger.error(
      `Error in GET /campaign-roles/affiliates/by-wallet/${req.params.walletAddress}: ${err}`
    );
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

export default router;
