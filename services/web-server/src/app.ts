import 'reflect-metadata'; // Required by TypeORM
import 'module-alias/register';  // Required to use @common imports

import express from 'express';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { createServer } from 'http';
//import { processBlockchainEvents } from './ton/fetchAndProcessEvents';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.send('Hello from TypeORM migrations example! No APIs yet.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const httpServer = createServer(app);

const wss = new WebSocket.Server({ server: httpServer });

// On each new WebSocket connection
wss.on('connection', (ws) => {
  console.log('WebSocket client connected.');

  ws.on('close', () => {
    console.log('WebSocket client disconnected.');
  });
});

// Schedule the event fetcher to run periodically
// setInterval(processBlockchainEvents, 10 * 1000);

export { wss };
