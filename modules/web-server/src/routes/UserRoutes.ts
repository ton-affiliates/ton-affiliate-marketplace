import { Router } from 'express';
import {
  createUser,
  getUserById,
  getUserByWalletAddress,
  updateUser,
  deleteUser,
} from '../services/UserService';
import { Logger } from '../utils/Logger';

const router = Router();

/**
 * POST /users
 * Create a new user
 */
router.post('/', async (req, res) => {
  try {
    Logger.debug('POST /users - creating user');
    const userData = req.body; // e.g. { id, telegramUsername, telegramLanguage }
    const user = await createUser(userData);
    res.status(201).json(user);
  } catch (err: any) {
    Logger.error('Error in POST /users', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

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
    }
    res.json(user);
  } catch (err: any) {
    Logger.error(`Error in GET /users/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
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
    const user = await getUserByWalletAddress(address);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) {
    Logger.error(`Error in GET /users/byWallet/${req.params.address}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * PATCH /users/:id
 * Update a user
 */
router.patch('/:id', async (req, res) => {
  try {
    Logger.debug(`PATCH /users/${req.params.id} - updating user`);
    const userId = Number(req.params.id);
    const updates = req.body;
    const user = await updateUser(userId, updates);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) {
    Logger.error(`Error in PATCH /users/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

/**
 * DELETE /users/:id
 * Delete a user
 */
router.delete('/:id', async (req, res) => {
  try {
    Logger.debug(`DELETE /users/${req.params.id} - deleting user`);
    const userId = Number(req.params.id);
    const success = await deleteUser(userId);
    if (!success) {
      res.status(404).json({ error: 'User not found' });
    }
    res.status(204).send();
  } catch (err: any) {
    Logger.error(`Error in DELETE /users/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

export default router;
