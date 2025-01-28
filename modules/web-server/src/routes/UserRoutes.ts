import { Router } from 'express';
import { Logger } from '../utils/Logger';
import { Address } from '@ton/core';
import {
  getUserById,
  getUsersByWalletAddress,
  ensureUser,
  ensureWallet,
  connectUserAndWallet,
} from '../services/UsersService';

const router = Router();

/**
 * GET /users/:id
 * Retrieve a user by Telegram user ID (including their linked wallets).
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
  } catch (err: any) {
    Logger.error(`Error in GET /users/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * GET /users/byWallet/:address
 * Retrieve *all* users associated with a wallet address
 */
router.get('/byWallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    Logger.debug(`GET /users/byWallet/${address} - fetching users by wallet address`);
    const users = await getUsersByWalletAddress(Address.parse(address));
    if (users.length === 0) {
      res.status(404).json({ error: 'No users found for this wallet' });
      return;
    }
    res.json(users);
  } catch (err: any) {
    Logger.error(`Error in GET /users/byWallet/${req.params.address}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * POST /users
 * Create or update a user record.
 * Example body:
 * {
 *   "id": 1420603175,
 *   "firstName": "Guy",
 *   "telegramUsername": "TelAvivGuy1",
 *   ...
 * }
 */
router.post('/', async (req, res) => {
  try {
    const userData = req.body; // { id, firstName, ... }
    if (!userData.id) {
      res.status(400).json({ error: 'Missing user ID' });
      return;
    }
    const user = await ensureUser(userData);
    res.json({ success: true, user });
    return;
  } catch (err: any) {
    Logger.error('Error creating/updating user:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * POST /wallets
 * Create or update a wallet record.
 * Example body:
 * {
 *   "address": "EQCHn...",
 *   "walletType": "ton",
 *   "publicKey": "abcd..."
 * }
 */
router.post('/wallets', async (req, res) => {
  try {
    const { address, walletType, publicKey } = req.body;
    if (!address) {
      res.status(400).json({ error: 'Missing wallet address' });
      return;
    }
    const addrString = Address.parse(address).toString();
    const wallet = await ensureWallet({
      address: addrString,
      walletType,
      publicKey,
    });
    res.json({ success: true, wallet });
    return;
  } catch (err: any) {
    Logger.error('Error creating/updating wallet:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * POST /userWallets/connect
 * Connect a user & wallet in the many-to-many join table.
 * Example body:
 * {
 *   "userId": 1420603175,
 *   "address": "EQCHn..."
 * }
 */
router.post('/userWallets/connect', async (req, res) => {
  try {
    const { userId, address } = req.body;
    if (!userId || !address) {
      res.status(400).json({ error: 'Missing userId or wallet address' });
      return;
    }

    const addrString = Address.parse(address).toString();
    const wallet = await connectUserAndWallet(userId, addrString);
    res.json({ success: true, wallet });
    return;
  } catch (err: any) {
    Logger.error('Error connecting user & wallet:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

export default router;
