// src/server.ts
import 'reflect-metadata';
import 'module-alias/register';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import express, { NextFunction, Request, Response } from 'express';
import WebSocket from 'ws';
import { createServer } from 'http';
import appDataSource from './ormconfig';
import { Logger } from './utils/Logger';
import { processBlockchainEvents } from './ton/FetchAndProcessEvents';

import { checkProxyJwt } from './middleware/checkProxyJwt'; 

import UserRoutes from './routes/UserRoutes';
import CampaignRoutes from './routes/CampaignRoutes';
import CampaignRoleRoutes from './routes/CampaignRoleRoutes';
import AuthRoutes from './routes/AuthRoutes';

// 1) Load env vars
dotenv.config();

// (Optionally) if using Docker secrets, read the secret from /run/secrets/proxy_jwt_secret
// so we can set process.env.PROXY_JWT_SECRET for checkProxyJwt
try {
  const secretFile = process.env.PROXY_JWT_SECRET_FILE || '/run/secrets/proxy_jwt_secret';
  const secret = fs.readFileSync(path.resolve(secretFile), 'utf8').trim();
  process.env.PROXY_JWT_SECRET = secret;
  Logger.info('Loaded PROXY_JWT_SECRET from Docker secret file');
} catch (err) {
  Logger.warn('Could not load Docker secret, falling back to .env or direct config');
}

const PORT = process.env.PORT || 3000;
const FETCH_INTERVAL = Number(process.env.FETCH_INTERVAL_BLOCKCHAIN_EVENTS || 10000);

// 2) Create Express app & parse JSON
const app = express();
app.use(express.json());

// 3) Initialize DB
appDataSource
  .initialize()
  .then(() => {
    Logger.info('Database connected successfully');
  })
  .catch((err) => {
    Logger.error('Error during Data Source initialization', err);
    process.exit(1);
  });

// 4) Create a router and add all routes
const apiRouter = express.Router();
apiRouter.use('/users', UserRoutes);
apiRouter.use('/campaigns', CampaignRoutes);
apiRouter.use('/campaign-roles', CampaignRoleRoutes);
apiRouter.use('/auth', AuthRoutes);

// Health endpoint (open / not protected):
app.get('/api/v1/health', (req, res) => {
  Logger.debug('GET /api/v1/health - checking health');
  res.json({ status: 'OK' });
});

// 5) Protect *everything else* under /api/v1 with checkProxyJwt
app.use('/api/v1', checkProxyJwt, apiRouter);

// 6) Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  Logger.error('Express error handler caught an error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 7) Create & start HTTP server
const httpServer = createServer(app);
httpServer.listen(PORT, () => {
  Logger.info(`Server is running on port ${PORT}`);
});

// 8) Setup WebSocket server
export const wss = new WebSocket.Server({ server: httpServer });
wss.on('connection', (ws) => {
  Logger.info('WebSocket client connected.');
  ws.on('message', (message) => {
    Logger.debug('WebSocket message received', { message });
  });
  ws.on('error', (error) => {
    Logger.error('WebSocket error:', error);
  });
  ws.on('close', () => {
    Logger.info('WebSocket client disconnected.');
  });
});

// 9) Schedule blockchain event processor
const intervalId = setInterval(async () => {
  Logger.debug('Running blockchain event processor...');
  try {
    await processBlockchainEvents();
  } catch (error) {
    Logger.error('Error processing blockchain events:', error);
  }
}, FETCH_INTERVAL);

// 10) Graceful shutdown
async function shutdownGracefully(signal: string) {
  Logger.info(`Received ${signal}. Shutting down gracefully...`);
  clearInterval(intervalId);
  wss.close();
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
