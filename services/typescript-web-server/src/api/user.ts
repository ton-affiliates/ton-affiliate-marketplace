import express, { Request, Response } from 'express';
import { saveUserInfo, getUserInfo, getUserByTonAddress } from '../redis/redis';

const router = express.Router();

/**
 * Save or update user information
 */
router.post('/', async (req: Request, res: Response) => {
    const { telegramId, info, address } = req.body;

    if (!telegramId || !address) {
        res.status(400).json({ error: 'Missing required parameters: telegramId or address' });
        return;
    }

    try {
        await saveUserInfo(telegramId, info, address);
        res.status(200).json({ message: 'User information saved successfully' });
    } catch (error) {
        console.error('Error saving user information:', error);
        res.status(500).json({ error: 'Failed to save user information' });
    }
});

/**
 * Get user information by Telegram ID
 */
router.get('/:telegramId', async (req: Request, res: Response) => {
    const telegramId = parseInt(req.params.telegramId, 10);

    if (isNaN(telegramId)) {
        res.status(400).json({ error: 'Invalid Telegram ID' });
        return;
    }

    try {
        const userInfo = await getUserInfo(telegramId);
        if (!userInfo) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.status(200).json(userInfo);
    } catch (error) {
        console.error('Error fetching user information:', error);
        res.status(500).json({ error: 'Failed to fetch user information' });
    }
});

/**
 * Get user information by TON address
 */
router.get('/address/:tonAddress', async (req: Request, res: Response) => {
    const { tonAddress } = req.params;

    if (!tonAddress) {
        res.status(400).json({ error: 'Missing required parameter: tonAddress' });
        return;
    }

    try {
        const userInfo = await getUserByTonAddress(tonAddress);
        if (!userInfo) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.status(200).json(userInfo);
    } catch (error) {
        console.error('Error fetching user by TON address:', error);
        res.status(500).json({ error: 'Failed to fetch user by TON address' });
    }
});

export default router;

/**
 * ===================================
 * Users API Examples - Documentation
 * ===================================
 *
 * Save or Update User Information
 * ===============================
 * Endpoint: POST /
 *
 * Request:
 * ----------
 * {
 *     "telegramId": 123456789,
 *     "info": {
 *         "handle": "@userhandle",
 *         "name": "John Doe"
 *     },
 *     "address": "EQDqQwnEXk1K2Yg-9GHM_Y2Dx5rP9eZob9dF7ghQi7TY9htm"
 * }
 *
 * Response (Success):
 * --------------------
 * {
 *     "message": "User information saved successfully"
 * }
 *
 * Response (Missing Required Parameters):
 * ---------------------------------------
 * {
 *     "error": "Missing required parameters: telegramId or address"
 * }
 *
 *
 * Get User Information by Telegram ID
 * ===================================
 * Endpoint: GET /:telegramId
 *
 * Example Request:
 * -----------------
 * GET /123456789 HTTP/1.1
 * Host: example.com
 *
 * Response (Success):
 * --------------------
 * {
 *     "telegramId": 123456789,
 *     "handle": "@userhandle",
 *     "name": "John Doe"
 * }
 *
 * Response (User Not Found):
 * ---------------------------
 * {
 *     "error": "User not found"
 * }
 *
 * Response (Invalid Telegram ID):
 * --------------------------------
 * {
 *     "error": "Invalid Telegram ID"
 * }
 *
 *
 * Get User Information by TON Address
 * ====================================
 * Endpoint: GET /address/:tonAddress
 *
 * Example Request:
 * -----------------
 * GET /address/EQDqQwnEXk1K2Yg-9GHM_Y2Dx5rP9eZob9dF7ghQi7TY9htm HTTP/1.1
 * Host: example.com
 *
 * Response (Success):
 * --------------------
 * {
 *     "telegramId": 123456789,
 *     "handle": "@userhandle",
 *     "name": "John Doe"
 * }
 *
 * Response (User Not Found):
 * ---------------------------
 * {
 *     "error": "User not found"
 * }
 *
 * Response (Missing TON Address):
 * --------------------------------
 * {
 *     "error": "Missing required parameter: tonAddress"
 * }
 *
 *
 * Curl Examples
 * =============
 *
 * Save or Update User Information
 * --------------------------------
 * curl -X POST https://example.com/users \
 * -H "Content-Type: application/json" \
 * -d '{
 *     "telegramId": 123456789,
 *     "info": {
 *         "handle": "@userhandle",
 *         "name": "John Doe"
 *     },
 *     "address": "EQDqQwnEXk1K2Yg-9GHM_Y2Dx5rP9eZob9dF7ghQi7TY9htm"
 * }'
 *
 * Get User Information by Telegram ID
 * ------------------------------------
 * curl -X GET https://example.com/users/123456789
 *
 * Get User Information by TON Address
 * ------------------------------------
 * curl -X GET https://example.com/users/address/EQDqQwnEXk1K2Yg-9GHM_Y2Dx5rP9eZob9dF7ghQi7TY9htm
 *
 *
 * Postman Examples
 * =================
 *
 * Save or Update User Information
 * --------------------------------
 * Method: POST
 * URL: https://example.com/users
 * Body:
 * {
 *     "telegramId": 123456789,
 *     "info": {
 *         "handle": "@userhandle",
 *         "name": "John Doe"
 *     },
 *     "address": "EQDqQwnEXk1K2Yg-9GHM_Y2Dx5rP9eZob9dF7ghQi7TY9htm"
 * }
 *
 * Get User Information by Telegram ID
 * ------------------------------------
 * Method: GET
 * URL: https://example.com/users/123456789
 *
 * Get User Information by TON Address
 * ------------------------------------
 * Method: GET
 * URL: https://example.com/users/address/EQDqQwnEXk1K2Yg-9GHM_Y2Dx5rP9eZob9dF7ghQi7TY9htm
 *
 *
 * Testing Scenarios
 * ==================
 *
 * 1. Successful User Creation:
 *    - Ensure the user is stored correctly in Redis with both Telegram data and TON address mapping.
 * 2. Validation Error:
 *    - Test API response when telegramId or address is missing.
 * 3. Fetching User Data:
 *    - Test retrieving a user by both Telegram ID and TON address.
 * 4. Invalid Inputs:
 *    - Test responses for invalid telegramId (e.g., non-numeric) or non-existent TON address.
 */

