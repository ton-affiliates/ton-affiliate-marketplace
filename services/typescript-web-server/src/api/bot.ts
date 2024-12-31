import express, { Router, Request, Response } from 'express';
import { isBotAdminInChatByHandle } from '../telegram/telegramService';

const router: Router = express.Router();

router.post('/is-bot-admin', async (req: Request, res: Response): Promise<void> => {
    const { handle } = req.body;

    if (!handle) {
        res.status(400).json({ error: 'Missing required parameter: handle' });
        return;
    }

    try {
        const isAdmin = await isBotAdminInChatByHandle(handle);

        res.status(200).json({
            handle,
            isAdmin,
            message: isAdmin
                ? `The bot is an admin in the chat associated with handle ${handle}.`
                : `The bot is NOT an admin in the chat associated with handle ${handle}.`,
        });
    } catch (error) {
        console.error('Error verifying bot admin status:', error);
        res.status(500).json({ error: 'Failed to verify bot admin status' });
    }
});


export default router;

/**
 * =========================================
 *              Admin Verification API
 * =========================================
 * 
 * This API provides a mechanism to check whether the bot has administrative privileges
 * in a specific Telegram chat or group.
 * 
 * -----------------------------------------
 * Endpoints:
 * -----------------------------------------
 * 
 * **1. Is Bot Admin**
 * - Endpoint: `/is-bot-admin`
 * - Method: `POST`
 * - Description: Verifies if the bot is an admin in a specified chat.
 * 
 * Request:
 * - Headers:
 *     - `Content-Type: application/json`
 * - Body:
 * ```json
 * {
 *   "chatId": "number" // ID of the Telegram chat or group
 * }
 * ```
 * 
 * Response:
 * - Success:
 * ```json
 * {
 *   "chatId": "number",
 *   "isAdmin": true,
 *   "message": "The bot is an admin in chat ID 123456789."
 * }
 * ```
 * - Failure:
 * ```json
 * {
 *   "error": "Failed to verify bot admin status"
 * }
 * ```
 * 
 * -----------------------------------------
 * Process Flow:
 * -----------------------------------------
 * 1. The client (Mini App or admin user) sends a POST request with the `chatId`.
 * 2. The backend invokes the Telegram API using the `isBotAdminInChat` function.
 * 3. A response is returned indicating whether the bot is an admin.
 * 
 */
