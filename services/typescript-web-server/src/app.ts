import 'module-alias/register';
import dotenv from 'dotenv';
import { createServer } from 'http';
import express from 'express';
import campaignsRouter from './api/campaign';
import usersRouter from './api/user';
import walletRouter from './api/wallet';
import telegramRouter from './api/telegram';
import { processBlockchainEvents } from './ton/fetchAndProcessEvents';
import WebSocket from 'ws';

// Load environment variables
dotenv.config();

const PORT: number = Number(process.env.PORT) || 3000;
const HOST: string = process.env.HOST || "localhost";

// Initialize Express app
const app = express();
app.use(express.json());

// Initialize the API router with '/api/v1' as the prefix
const apiRouter = express.Router();

apiRouter.use('/campaign', campaignsRouter);
apiRouter.use('/user', usersRouter);
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/telegram', telegramRouter);

// Mount the API router
app.use('/api/v1', apiRouter);

// Create HTTP server from Express
const httpServer = createServer(app);

// Create a WebSocket server on top of the same HTTP server
const wss = new WebSocket.Server({ server: httpServer });

// On each new WebSocket connection
wss.on('connection', (ws) => {
  console.log('WebSocket client connected.');

  ws.on('close', () => {
    console.log('WebSocket client disconnected.');
  });
});

// Start the combined HTTP + WebSocket server
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});

// Schedule the event fetcher to run periodically
setInterval(processBlockchainEvents, 10 * 1000);

// Export the wss so you can use it in `fetchAndProcessEvents`
export { wss };
