import express, { Request, Response } from 'express';
import { saveWalletInfo, getUserByTonAddress, getWalletsForUser } from '../redis/redis';

const router = express.Router();

/**
 * Add or Update Wallet Info
 */
router.post('/save', async (req: Request, res: Response) => {
    const { telegramId, wallet } = req.body;

    if (!telegramId || !wallet) {
        res.status(400).json({ error: 'Missing required parameters: telegramId or wallet' });
        return;
    }

    try {
        await saveWalletInfo(telegramId, wallet);
        res.status(200).json({ message: 'Wallet information saved successfully' });
    } catch (error) {
        console.error('Error saving wallet information:', error);
        res.status(500).json({ error: 'Failed to save wallet information' });
    }
});

/**
 * Get Wallets for a User
 */
router.get('/user/:telegramId', async (req: Request, res: Response) => {
    const telegramId = parseInt(req.params.telegramId, 10);

    try {
        const wallets = await getWalletsForUser(telegramId);
        if (!wallets || wallets.length === 0) {
            res.status(404).json({ error: 'No wallets found for this user' });
            return;
        }

        res.status(200).json(wallets);
    } catch (error) {
        console.error('Error fetching wallets for user:', error);
        res.status(500).json({ error: 'Failed to fetch wallets' });
    }
});

/**
 * Get User by TON Address
 */
router.get('/address/:address', async (req: Request, res: Response) => {
    const address = req.params.address;

    try {
        const user = await getUserByTonAddress(address);
        if (!user) {
            res.status(404).json({ error: 'No user found for this address' });
            return;
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user by address:', error);
        res.status(500).json({ error: 'Failed to fetch user by address' });
    }
});

export default router;



// Wallet API Design

/**
 * @api {POST} /wallet Save Wallet Information
 * @apiName SaveWalletInfo
 * @apiGroup Wallet
 * 
 * @apiDescription Save wallet information for a Telegram user.
 * 
 * @apiParam {Number} telegramId Telegram ID of the user.
 * @apiParam {Object} wallet Wallet information.
 * @apiParam {String} wallet.address TON wallet address.
 * @apiParam {String} wallet.publicKey Public key of the wallet.
 * @apiParam {String} wallet.walletName Name of the wallet (e.g., "Tonkeeper").
 * @apiParam {String} wallet.walletVersion Version of the wallet (e.g., "2.0.1").
 * @apiParam {String} wallet.network Network (e.g., "mainnet", "testnet").
 * 
 * @apiSuccess {String} message Confirmation message.
 * 
 * @apiError {String} error Error message.
 * 
 * Example Request:
 * {
 *   "telegramId": 123456789,
 *   "wallet": {
 *     "address": "EQD7W...4n0",
 *     "publicKey": "e9b3...abc",
 *     "walletName": "Tonkeeper",
 *     "walletVersion": "2.0.1",
 *     "network": "mainnet"
 *   }
 * }
 * 
 * Example Response:
 * {
 *   "message": "Wallet saved successfully."
 * }
 */

/**
 * @api {GET} /wallet/:telegramId Get Wallets for User
 * @apiName GetWalletsForUser
 * @apiGroup Wallet
 * 
 * @apiDescription Fetch all wallets associated with a Telegram user.
 * 
 * @apiParam {Number} telegramId Telegram ID of the user.
 * 
 * @apiSuccess {Object[]} wallets List of wallets.
 * @apiSuccess {String} wallets.address TON wallet address.
 * @apiSuccess {String} wallets.publicKey Public key of the wallet.
 * @apiSuccess {String} wallets.walletName Name of the wallet (e.g., "Tonkeeper").
 * @apiSuccess {String} wallets.walletVersion Version of the wallet (e.g., "2.0.1").
 * @apiSuccess {String} wallets.network Network (e.g., "mainnet", "testnet").
 * 
 * @apiError {String} error Error message.
 * 
 * Example Response:
 * {
 *   "wallets": [
 *     {
 *       "address": "EQD7W...4n0",
 *       "publicKey": "e9b3...abc",
 *       "walletName": "Tonkeeper",
 *       "walletVersion": "2.0.1",
 *       "network": "mainnet"
 *     }
 *   ]
 * }
 */

/**
 * @api {GET} /wallet/reverse/:address Get User by Wallet Address
 * @apiName GetUserByWalletAddress
 * @apiGroup Wallet
 * 
 * @apiDescription Fetch the Telegram user associated with a TON wallet address.
 * 
 * @apiParam {String} address TON wallet address.
 * 
 * @apiSuccess {Number} telegramId Telegram ID of the user.
 * @apiSuccess {String} handle Telegram handle of the user.
 * @apiSuccess {String} name Telegram name of the user.
 * 
 * @apiError {String} error Error message.
 * 
 * Example Response:
 * {
 *   "telegramId": 123456789,
 *   "handle": "@username",
 *   "name": "John Doe"
 * }
 */
