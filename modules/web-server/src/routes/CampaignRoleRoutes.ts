import { Router } from 'express';
import {
  getSingleAffiliateUserForCampaign,
  getAffiliateUsersForCampaignPaged
} from '../services/CampaignRolesService';
import { Logger } from '../utils/Logger';

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



router.get('/affiliates/:campaignId/:affiliateId', async (req, res) => {
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


export default router;
