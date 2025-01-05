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

// Guy TODO add auth. Check in production to listen on 'tonaffilaites.ocm/443'  host both mini app and web server on same dmoain

// Load environment variables
dotenv.config();

const PORT: number = Number(process.env.PORT) || 3000;
const HOST: string = process.env.HOST || "localhost";

// Initialize Express app
const app = express();
app.use(express.json());

// Routers
app.use('/campaign', campaignsRouter);
app.use('/user', usersRouter);
app.use('/wallet', walletRouter);
app.use('/telegram', telegramRouter);

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
