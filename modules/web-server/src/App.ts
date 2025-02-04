// src/App.ts
import 'reflect-metadata';
import 'module-alias/register';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import express from 'express';
import WebSocket from 'ws';
import { createServer } from 'http';

import appDataSource from './ormconfig';
import { Logger } from './utils/Logger';
import { bot } from './bot/bot';
import { TelegramAssetsScheduler } from './schedulers/TelegramAssetsScheduler';
import { BlockchainEventsScheduler } from './schedulers/BlockchainEventsScheduler';

import { checkProxyJwt } from './middleware/checkProxyJwt';
import UserRoutes from './routes/UserRoutes';
import CampaignRoutes from './routes/CampaignRoutes';
import CampaignRoleRoutes from './routes/CampaignRoleRoutes';
import AuthRoutes from './routes/AuthRoutes';

dotenv.config();

// Possibly load Docker secrets for PROXY_JWT_SECRET
try {
  const secretFile = process.env.PROXY_JWT_SECRET_FILE || '/run/secrets/proxy_jwt_secret';
  const secret = fs.readFileSync(path.resolve(secretFile), 'utf8').trim();
  process.env.PROXY_JWT_SECRET = secret;
  Logger.info('Loaded PROXY_JWT_SECRET from Docker secret file');
} catch (err) {
  Logger.warn('Could not load Docker secret, falling back to .env or direct config');
}

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

// 1) Initialize DB, then launch the Telegram bot in the same process
appDataSource
  .initialize()
  .then(async () => {
    Logger.info('Database connected successfully');

    // Now we can launch the bot
    await bot.launch();
    Logger.info('Telegram bot is running...');
  })
  .catch((err) => {
    Logger.error('Error during Data Source initialization', err);
    process.exit(1);
  });

// 2) Define your routes
const apiRouter = express.Router();
apiRouter.use('/users', UserRoutes);
apiRouter.use('/campaigns', CampaignRoutes);
apiRouter.use('/campaign-roles', CampaignRoleRoutes);
apiRouter.use('/auth', AuthRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  Logger.debug('GET /api/v1/health - checking health');
  res.json({ status: 'OK' });
});

// Secure them with checkProxyJwt (if you have your own auth)
app.use('/api/v1', checkProxyJwt, apiRouter);

// 4) Create & start the HTTP server
const httpServer = createServer(app);
httpServer.listen(PORT, () => {
  Logger.info(`Server is running on port ${PORT}`);
});

// 5) Setup WebSocket server (if needed)
export const wss = new WebSocket.Server({ server: httpServer });
wss.on('connection', (ws) => {
  Logger.info('WebSocket client connected.');
  ws.on('message', (message) => {
    Logger.debug('WS message received', { message });
  });
  ws.on('error', (error) => {
    Logger.error('WebSocket error:', error);
  });
  ws.on('close', () => {
    Logger.info('WebSocket client disconnected.');
  });
});

// 6) Schedule the periodic tasks
const blockchainScheduler = new BlockchainEventsScheduler();
blockchainScheduler.start();

const telegramAssetsScheduler = new TelegramAssetsScheduler();
telegramAssetsScheduler.start()


// 7) Graceful shutdown
async function shutdownGracefully(signal: string) {
  Logger.info(`Received ${signal}. Shutting down gracefully...`);

  // Stop the blockchain events scheduler
  blockchainScheduler.stop();

  // Stop the WebSocket server
  wss.close();

  // Stop the bot
  bot.stop(signal);

  // Destroy DB connection
  await appDataSource.destroy();

  Logger.info('Graceful shutdown complete.');
  process.exit(0);
}

process.on('SIGINT', () => shutdownGracefully('SIGINT'));
process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));

process.on('uncaughtException', (err) => {
  Logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
