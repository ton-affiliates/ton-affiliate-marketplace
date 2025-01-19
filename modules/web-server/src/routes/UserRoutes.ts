import { Router } from 'express';
import {
  getUserById,
  getUserByWalletAddress,
  addUserWallet
} from '../services/UsersService';
import { Logger } from '../utils/Logger';
import { Address } from '@ton/core';

const router = Router();

/**
 * GET /users/:id
 * Retrieve a user by Telegram user ID
 */
router.get('/:id', async (req, res) => {
  try {
    Logger.debug(`GET /users/${req.params.id} - fetching user by ID`);
    const userId = Number(req.params.id);
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
    return;
  } catch (err: any) {
    Logger.error(`Error in GET /users/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * POST /api/v1/users/add
 * Body example: { userId: 1420603175, address: "EQCHn...", walletType: "ton" }
 */
router.post('/add', async (req, res) => {
  try {

    const { userId, address, walletType, publicKey } = req.body;

    if (!userId || !address) {
      res.status(400).json({ error: 'Missing required fields userId or address' });
      return;
    }

    const wallet = await addUserWallet(userId, Address.parse(address), { walletType, publicKey });
    res.json({ success: true, wallet });
    return;
  } catch (err: any) {
    Logger.error('Error adding wallet:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * GET /users/byWallet/:address
 * Retrieve user by wallet address
 */
router.get('/byWallet/:address', async (req, res) => {
  try {
    Logger.debug(`GET /users/byWallet/${req.params.address} - fetching user by wallet address`);
    const { address } = req.params;
    const user = await getUserByWalletAddress(Address.parse(address));
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
    return;
  } catch (err: any) {
    Logger.error(`Error in GET /users/byWallet/${req.params.address}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});


export default router;
