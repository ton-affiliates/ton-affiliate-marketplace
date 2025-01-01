import express, { Router, Request, Response } from 'express';
import { createTelegramAssetAndVerifyAdminPrivileges } from '../telegram/telegramService';

const router: Router = express.Router();

/**
 * Verify Admin Privileges and Create TelegramAsset
 */
router.post('/verify-and-create', async (req: Request, res: Response): Promise<void> => {
    const { channelName } = req.body;

    if (!channelName) {
        res.status(400).json({ error: 'Missing required parameter: channelName' });
        return;
    }

    try {
        const result = await createTelegramAssetAndVerifyAdminPrivileges(channelName);

        if (typeof result === 'string') {
            // If the function returned an error message
            res.status(400).json({ error: result });
        } else {
            // Success - Return the TelegramAsset object
            res.status(200).json({
                telegramAsset: result
            });
        }
    } catch (error) {
        console.error('Error verifying admin privileges or creating TelegramAsset:', error);
        res.status(500).json({ error: 'Failed to process the request' });
    }
});

export default router;
