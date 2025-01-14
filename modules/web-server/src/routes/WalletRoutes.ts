import { Router } from 'express';
import {
  createWallet,
  getWalletById,
  getWalletByAddress,
  updateWallet,
  deleteWallet,
} from '../services/WalletsService';
import { Logger } from '../utils/Logger';

const router = Router();

/**
 * POST /wallets
 * Create a new wallet
 */
router.post('/', async (req, res) => {
  try {
    Logger.debug('POST /wallets - creating wallet');
    const walletData = req.body;
    const wallet = await createWallet(walletData);
    res.status(201).json(wallet);
    return;
  } catch (err: any) {
    Logger.error('Error in POST /wallets', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * GET /wallets/:id
 * Retrieve a wallet by ID
 */
router.get('/:id', async (req, res) => {
  try {
    Logger.debug(`GET /wallets/${req.params.id} - fetching wallet by ID`);
    const walletId = Number(req.params.id);
    const wallet = await getWalletById(walletId);
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }
    res.json(wallet);
    return;
  } catch (err: any) {
    Logger.error(`Error in GET /wallets/${req.params.id}`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * GET /wallets/byAddress/:address
 * Retrieve a wallet by address
 */
router.get('/byAddress/:address', async (req, res) => {
  try {
    Logger.debug(`GET /wallets/byAddress/${req.params.address} - fetching wallet by address`);
    const { address } = req.params;
    const wallet = await getWalletByAddress(address);
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }
    res.json(wallet);
    return;
  } catch (err: any) {
    Logger.error(`Error in GET /wallets/byAddress/${req.params.address} ` + err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * PATCH /wallets/:id
 * Update a wallet
 */
router.patch('/:id', async (req, res) => {
  try {
    Logger.debug(`PATCH /wallets/${req.params.id} - updating wallet`);
    const walletId = Number(req.params.id);
    const updates = req.body;
    const wallet = await updateWallet(walletId, updates);
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }
    res.json(wallet);
    return;
  } catch (err: any) {
    Logger.error(`Error in PATCH /wallets/${req.params.id} ` + err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

/**
 * DELETE /wallets/:id
 * Delete a wallet
 */
router.delete('/:id', async (req, res) => {
  try {
    Logger.debug(`DELETE /wallets/${req.params.id} - deleting wallet`);
    const walletId = Number(req.params.id);
    const success = await deleteWallet(walletId);
    if (!success) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }
    res.status(204).send();
    return;
  } catch (err: any) {
    Logger.error(`Error in DELETE /wallets/${req.params.id} ` + err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
});

export default router;
