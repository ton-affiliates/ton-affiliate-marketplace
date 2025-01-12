import 'reflect-metadata';
import 'module-alias/register';

import dotenv from 'dotenv';
import express from 'express';
import WebSocket from 'ws';
import { createServer } from 'http';
import appDataSource from './ormconfig';
import { Logger } from './utils/Logger';
import { processBlockchainEvents } from './ton/FetchAndProcessEvents';

import UserRoutes from './routes/UserRoutes';
import WalletRoutes from './routes/WalletRoutes';
import CampaignRoutes from './routes/CampaignRoutes';
import CampaignRoleRoutes from './routes/CampaignRoleRoutes';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const FETCH_INTERVAL = Number(process.env.FETCH_INTERVAL || 10*1000); //default to every 10 seconds

const app = express();
app.use(express.json());

// Initialize DB
appDataSource
  .initialize()
  .then(() => {
    Logger.info('Database connected successfully');
  })
  .catch((err) => {
    Logger.error('Error during Data Source initialization', err);
    process.exit(1);
  });

// Mount entity routers
app.use('/users', UserRoutes);
app.use('/wallets', WalletRoutes);
app.use('/campaigns', CampaignRoutes);
app.use('/campaign-roles', CampaignRoleRoutes);

// Health endpoint
app.get('/health', (req, res) => {
  Logger.debug('GET /health - checking health');
  res.json({ status: 'OK' });
});


// Create and start the HTTP server
const httpServer = createServer(app);
httpServer.listen(PORT, () => {
  Logger.info(`Server is running on port ${PORT}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ server: httpServer });
wss.on('connection', (ws) => {
  Logger.info('WebSocket client connected.');

  ws.on('message', (message) => {
    Logger.debug('WebSocket message received', { message });
    // Add WebSocket message handling logic here
  });

  ws.on('error', (error) => {
    Logger.error('WebSocket error', error);
  });

  ws.on('close', () => {
    Logger.info('WebSocket client disconnected.');
  });
});

// Schedule blockchain event processor
const intervalId = setInterval(async () => {
  Logger.info('Running blockchain event processor...');
  try {
    await processBlockchainEvents();
  } catch (error) {
    Logger.error('Error processing blockchain events', error);
  }
}, FETCH_INTERVAL);

// Graceful shutdown
process.on('SIGINT', async () => {
  Logger.info('Received SIGINT. Shutting down gracefully...');
  clearInterval(intervalId);
  wss.close();
  await appDataSource.destroy();
  Logger.info('Graceful shutdown complete.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  Logger.info('Received SIGTERM. Shutting down gracefully...');
  clearInterval(intervalId);
  wss.close();
  await appDataSource.destroy();
  Logger.info('Graceful shutdown complete.');
  process.exit(0);
});

export { wss };
