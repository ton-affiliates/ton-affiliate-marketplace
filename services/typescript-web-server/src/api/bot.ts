import express, { Router, Request, Response } from 'express';
import { createTelegramAssetFromUrl } from '../telegram/telegramService';

const router: Router = express.Router();

/**
 * Verify Admin Privileges and Create TelegramAsset from URL
 */
router.post('/verify-and-create', async (req: Request, res: Response): Promise<void> => {
    const { url } = req.body;

    if (!url) {
        res.status(400).json({ error: 'Missing required parameter: url' });
        return;
    }

    try {
        const result = await createTelegramAssetFromUrl(url);

        if (typeof result === 'string') {
            res.status(400).json({ error: result });
        } else {
            res.status(200).json({ telegramAsset: result });
        }
    } catch (error) {
        console.error('Error processing the URL:', error);
        res.status(500).json({ error: 'Failed to process the request' });
    }
});

export default router;
