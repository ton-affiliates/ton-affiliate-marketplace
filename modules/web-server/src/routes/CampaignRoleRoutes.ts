import { Router } from 'express';
import {
  getSingleAffiliateUserForCampaign,
  getAffiliateUsersForCampaignPaged,
  getAffiliatesByWallet
} from '../services/CampaignRolesService';
import { Logger } from '../utils/Logger';
import { Address } from '@ton/core';

const router = Router();


/**
 * GET /campaign-roles/affiliates/paged/:campaignId
 * Retrieve affiliates for a campaign with pagination
 */
router.get('/affiliates/paged/:campaignId', async (req, res) => {
  try {
    Logger.debug(`GET /campaign-roles/affiliates/paged/${req.params.campaignId} - fetching affiliates (paged)`);

    const { campaignId } = req.params;

    // Use query params for offset & limit, or defaults if not provided
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    const affiliates = await getAffiliateUsersForCampaignPaged(campaignId, offset, limit);
    res.json(affiliates);
    return;
  } catch (err: any) {
    Logger.error(`Error in GET /campaign-roles/affiliates/paged/${req.params.campaignId}: ${err}`);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});


router.get('/affiliates/:campaignId(\\d+)/:affiliateId(\\d+)', async (req, res) => {
  try {
    Logger.debug(
      `GET /campaign-roles/affiliates/${req.params.campaignId}/${req.params.affiliateId} - fetching single affiliate`
    );

    const { campaignId, affiliateId } = req.params;
    const affiliate = await getSingleAffiliateUserForCampaign(campaignId, parseInt(affiliateId as string));

    if (!affiliate) {
      res.status(404).json({ error: 'Affiliate not found' });
      return;
    }

    res.json(affiliate);
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
    Logger.debug(`GET /campaign-roles/affiliates/by-wallet/${req.params.walletAddress} - fetching affiliates by wallet`);

    const { walletAddress } = req.params;

    // Parse the wallet address into a TON Address object
    const tonAddress = Address.parse(walletAddress);

    // Fetch all affiliates associated with the wallet
    const affiliates = await getAffiliatesByWallet(tonAddress);

    if (affiliates.length === 0) {
      res.status(404).json({ error: 'No affiliates found for the provided wallet address' });
      return;
    }

    res.json(affiliates);
    return;
  } catch (err: any) {
    Logger.error(`Error in GET /campaign-roles/affiliates/by-wallet/${req.params.walletAddress}: ${err}`);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

export default router;
