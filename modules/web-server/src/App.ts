// src/server.ts
import 'reflect-metadata';
import 'module-alias/register';

import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import WebSocket from 'ws';
import { createServer } from 'http';
import appDataSource from './ormconfig';
import { Logger } from './utils/Logger';
import { processBlockchainEvents } from './ton/FetchAndProcessEvents';

import UserRoutes from './routes/UserRoutes';
import CampaignRoutes from './routes/CampaignRoutes';
import CampaignRoleRoutes from './routes/CampaignRoleRoutes';
import AuthRoutes from './routes/AuthRoutes';

// 1) Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const FETCH_INTERVAL = Number(process.env.FETCH_INTERVAL_BLOCKCHAIN_EVENTS || 10 * 1000); // Default: 10 seconds

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

// 5) Health endpoint
apiRouter.get('/health', (req, res) => {
  Logger.debug('GET /api/v1/health - checking health');
  res.json({ status: 'OK' });
  return;
});

// 6) Prefix all routes with /api/v1
app.use('/api/v1', apiRouter);

// 7) Global error handler for Express (must be last middleware):
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  Logger.error('Express error handler caught an error:', err);
  res.status(500).json({ error: 'Internal server error' });
  return ;
});

// 8) Create & start the HTTP server
const httpServer = createServer(app);
httpServer.listen(PORT, () => {
  Logger.info(`Server is running on port ${PORT}`);
});

// 9) Setup WebSocket server
export const wss = new WebSocket.Server({ server: httpServer });
wss.on('connection', (ws) => {
  Logger.info('WebSocket client connected.');

  ws.on('message', (message) => {
    Logger.debug('WebSocket message received', { message });
    // Add any extra handling here
  });

  ws.on('error', (error) => {
    Logger.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    Logger.info('WebSocket client disconnected.');
  });
});

// 10) Schedule blockchain event processor
const intervalId = setInterval(async () => {
  Logger.debug('Running blockchain event processor...');
  try {
    await processBlockchainEvents();
  } catch (error) {
    Logger.error('Error processing blockchain events:', error);
  }
}, FETCH_INTERVAL);

// 11) Graceful shutdown handlers
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

// 12) Catch unhandled errors that could crash the server
process.on('uncaughtException', (err) => {
  Logger.error('Uncaught Exception:', err);
  // Optionally attempt graceful shutdown or let your process manager (PM2, Docker, etc.) restart.
  // For safety, we can exit to allow a restart:
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Same logic: either do something or exit. Often letting the app crash is safer than continuing in an unknown state.
});
