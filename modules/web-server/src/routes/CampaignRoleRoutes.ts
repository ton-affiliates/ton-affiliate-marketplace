// src/routes/CampaignRoleRoutes.ts

import { Router, Request, Response } from 'express';
import {
  getAffiliatesByWallet,
  getAffiliateRolesForCampaignPaged,
  getAffiliateUsersForCampaign,
} from '../services/CampaignRolesService';
import { Logger } from '../utils/Logger';
import { Address } from '@ton/core';
import dotenv from 'dotenv';
import { CampaignRoleApiResponse, UserApiResponse } from '@common/ApiResponses';

dotenv.config();

const router = Router();

/**
 * GET /campaign-roles/affiliates/paged/:campaignId
 * Retrieve affiliate "roles" for a campaign with pagination.
 */
router.get('/affiliates/paged/:campaignId', async (req: Request, res: Response): Promise<void> => {
  try {
    Logger.debug(
      `GET /campaign-roles/affiliates/paged/${req.params.campaignId} - fetching affiliates (paged)`
    );

    const { campaignId } = req.params;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;

    const roles = await getAffiliateRolesForCampaignPaged(campaignId, offset, limit);

    // Map each raw role to CampaignRoleApiResponse.
    const response: CampaignRoleApiResponse[] = roles.map((role: any) => ({
      id: role.id,
      campaignId: role.campaignId,
      walletAddress: role.walletAddress,
      role: role.role,
      affiliateId: role.affiliateId,
      createdAt: new Date(role.createdAt).toISOString(),
      updatedAt: new Date(role.updatedAt).toISOString(),
    }));

    res.json(response);
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
 * Retrieve a single affiliate user for a campaign.
 */
router.get('/affiliates/:campaignId(\\d+)/:affiliateId(\\d+)', async (req: Request, res: Response): Promise<void> => {
  try {
    Logger.debug(
      `GET /campaign-roles/affiliates/${req.params.campaignId}/${req.params.affiliateId} - fetching single affiliate user`
    );

    const { campaignId, affiliateId } = req.params;
    // Assume getAffiliateUsersForCampaign returns an array of user objects.
    const affUsers = await getAffiliateUsersForCampaign(campaignId, parseInt(affiliateId, 10));
    if (!affUsers || affUsers.length === 0) {
      res.status(404).json({ error: 'Affiliate not found' });
      return;
    }
    
    // Map the first element of affUsers to a UserApiResponse.
    const user = affUsers[0];
    const response: UserApiResponse = {
      id: user.id,
      telegramUsername: user.telegramUsername,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
    };

    res.json(response);
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
 * Retrieve all affiliates associated with a specific wallet address.
 */
router.get('/affiliates/by-wallet/:walletAddress', async (req: Request, res: Response): Promise<void> => {
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

    const response: CampaignRoleApiResponse[] = affiliates.map((role: any) => ({
      id: role.id,
      campaignId: role.campaignId,
      walletAddress: role.walletAddress,
      role: role.role,
      affiliateId: role.affiliateId,
      createdAt: new Date(role.createdAt).toISOString(),
      updatedAt: new Date(role.updatedAt).toISOString(),
    }));

    res.json(response);
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
