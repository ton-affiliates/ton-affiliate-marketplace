import express, { Request, Response } from 'express';
import { setTelegramCampaignDetails, getCampaignById, getCampaignsForUser } from '../redis/redis';

const router = express.Router();

/**
 * Set campaign details
 */
router.post('/:id', async (req: Request, res: Response) => {
    const campaignId = parseInt(req.params.id, 10);
    const { advertiserTelegramId, campaignInfo } = req.body;

    if (!advertiserTelegramId || !campaignInfo) {
        res.status(400).json({ error: 'Missing required parameters: advertiserTelegramId or campaignInfo' });
        return;
    }

    try {
        const updatedCampaign = await setTelegramCampaignDetails(advertiserTelegramId, campaignId, campaignInfo);
        res.status(200).json(updatedCampaign);
    } catch (error) {
        console.error('Error updating campaign details:', error);
        res.status(500).json({ error: 'Failed to update campaign details' });
    }
});

/**
 * Get campaign by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    const campaignId = parseInt(req.params.id, 10);

    try {
        const campaign = await getCampaignById(campaignId);
        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }

        res.status(200).json(campaign);
    } catch (error) {
        console.error('Error fetching campaign by ID:', error);
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
});

/**
 * Get all campaigns for a user
 */
router.get('/user/:telegramId', async (req: Request, res: Response) => {
    const userTelegramId = parseInt(req.params.telegramId, 10);

    try {
        const campaigns = await getCampaignsForUser(userTelegramId);
        res.status(200).json(campaigns);
    } catch (error) {
        console.error('Error fetching campaigns for user:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

export default router;


/**
 * ===================================
 * Campaigns API Examples - Documentation
 * ===================================
 *
 * Set Campaign Details
 * =====================
 * Endpoint: POST /:id
 *
 * Request:
 * ---------
 * {
 *     "advertiserTelegramId": 123456789,
 *     "campaignInfo": {
 *         "name": "Crypto Campaign",
 *         "description": "A campaign for crypto enthusiasts",
 *         "category": "CRYPTO",
 *         "telegramAsset": {
 *             "id": 987654321,
 *             "name": "CryptoChannel",
 *             "type": "CHANNEL",
 *             "isPublic": true,
 *             "url": "https://t.me/CryptoChannel"
 *         }
 *     }
 * }
 *
 * Response (Success):
 * --------------------
 * {
 *     "campaignId": "1",
 *     "name": "Crypto Campaign",
 *     "description": "A campaign for crypto enthusiasts",
 *     "category": "CRYPTO",
 *     "telegramAsset": {
 *         "id": 987654321,
 *         "name": "CryptoChannel",
 *         "type": "CHANNEL",
 *         "isPublic": true,
 *         "url": "https://t.me/CryptoChannel"
 *     }
 * }
 *
 * Response (Validation Error):
 * ----------------------------
 * {
 *     "error": "Missing required parameters: advertiserTelegramId or campaignInfo"
 * }
 *
 * Response (Error Updating Campaign Details):
 * -------------------------------------------
 * {
 *     "error": "Failed to update campaign details"
 * }
 *
 *
 * Get Campaign by ID
 * ===================
 * Endpoint: GET /:id
 *
 * Example Request:
 * -----------------
 * GET /1 HTTP/1.1
 * Host: example.com
 *
 * Response (Success):
 * --------------------
 * {
 *     "campaignId": "1",
 *     "name": "Crypto Campaign",
 *     "description": "A campaign for crypto enthusiasts",
 *     "category": "CRYPTO",
 *     "telegramAsset": {
 *         "id": 987654321,
 *         "name": "CryptoChannel",
 *         "type": "CHANNEL",
 *         "isPublic": true,
 *         "url": "https://t.me/CryptoChannel"
 *     }
 * }
 *
 * Response (Campaign Not Found):
 * ------------------------------
 * {
 *     "error": "Campaign not found"
 * }
 *
 *
 * Get All Campaigns for a User
 * =============================
 * Endpoint: GET /user/:telegramId
 *
 * Example Request:
 * -----------------
 * GET /user/123456789 HTTP/1.1
 * Host: example.com
 *
 * Response (Success):
 * --------------------
 * [
 *     {
 *         "campaignId": "1",
 *         "name": "Crypto Campaign",
 *         "description": "A campaign for crypto enthusiasts",
 *         "category": "CRYPTO",
 *         "telegramAsset": {
 *             "id": 987654321,
 *             "name": "CryptoChannel",
 *             "type": "CHANNEL",
 *             "isPublic": true,
 *             "url": "https://t.me/CryptoChannel"
 *         }
 *     }
 * ]
 *
 * Response (No Campaigns Found):
 * ------------------------------
 * []
 *
 *
 * Curl Examples
 * =============
 *
 * Set Campaign Details
 * ---------------------
 * curl -X POST https://example.com/campaigns/1 \
 * -H "Content-Type: application/json" \
 * -d '{
 *     "advertiserTelegramId": 123456789,
 *     "campaignInfo": {
 *         "name": "Crypto Campaign",
 *         "description": "A campaign for crypto enthusiasts",
 *         "category": "CRYPTO",
 *         "telegramAsset": {
 *             "id": 987654321,
 *             "name": "CryptoChannel",
 *             "type": "CHANNEL",
 *             "isPublic": true,
 *             "url": "https://t.me/CryptoChannel"
 *         }
 *     }
 * }'
 *
 * Get Campaign by ID
 * -------------------
 * curl -X GET https://example.com/campaigns/1
 *
 * Get All Campaigns for a User
 * ----------------------------
 * curl -X GET https://example.com/campaigns/user/123456789
 *
 *
 * Postman Examples
 * =================
 *
 * Set Campaign Details
 * ---------------------
 * Method: POST
 * URL: https://example.com/campaigns/1
 * Body:
 * {
 *     "advertiserTelegramId": 123456789,
 *     "campaignInfo": {
 *         "name": "Crypto Campaign",
 *         "description": "A campaign for crypto enthusiasts",
 *         "category": "CRYPTO",
 *         "telegramAsset": {
 *             "id": 987654321,
 *             "name": "CryptoChannel",
 *             "type": "CHANNEL",
 *             "isPublic": true,
 *             "url": "https://t.me/CryptoChannel"
 *         }
 *     }
 * }
 *
 * Get Campaign by ID
 * -------------------
 * Method: GET
 * URL: https://example.com/campaigns/1
 *
 * Get All Campaigns for a User
 * ----------------------------
 * Method: GET
 * URL: https://example.com/campaigns/user/123456789
 *
 *
 * Testing Scenarios
 * ==================
 *
 * 1. Campaign Creation:
 *    - Test setting campaign details for an existing campaign with proper validation.
 * 2. Campaign Retrieval:
 *    - Test fetching campaigns by ID and user.
 * 3. Validation Errors:
 *    - Test API responses for missing parameters and invalid inputs.
 */
