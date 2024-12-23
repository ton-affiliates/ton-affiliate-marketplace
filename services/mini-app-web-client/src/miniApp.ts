import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { createClient, RedisClientType } from 'redis';
import { EmitLogEvent } from '../../typescript-web-server/src/listenToEvents';
import { Address } from '@ton/core';

const PORT: number = Number(process.env.PORT) || 3001;
const REDIS_URL: string = process.env.REDIS_URL || 'redis://0.0.0.0:6379';

// Redis client setup
const redisClient: RedisClientType = createClient({ url: REDIS_URL });

redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err));
redisClient.connect();

// Initialize the Express app
const app = express();
const httpServer = createServer(app);

const currentUserInTonConnect = Address.parse('0QCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL5kn');  // from TON-connect

console.log('Subscribing to campaign-created events...');


const parseWithBigInt = (json: string) => {
    return JSON.parse(json, (key, value) =>
        typeof value === 'string' && /^\d+n$/.test(value) ? BigInt(value.slice(0, -1)) : value
    );
};

function translateRawAddress(rawAddress: { workChain: number; hash: { type: string; data: number[] } }): Address {
    if (!rawAddress || rawAddress.hash.type !== 'Buffer') {
        throw new Error('Invalid raw address format');
    }

    const workChain = rawAddress.workChain;
    const hashBuffer = Buffer.from(rawAddress.hash.data);

    if (hashBuffer.length !== 32) {
        throw new Error(`Invalid address hash length: ${hashBuffer.length}`);
    }

    return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
}


// Subscribe to the Redis channel
redisClient.subscribe('CampaignCreatedEventChannel', (message) => {
    const event = parseWithBigInt(message);

    // Filter by advertiser address
    if (translateRawAddress(event.advertiser).toString() === currentUserInTonConnect.toString()) {
        console.log('Relevant event:', event);

        // Handle the event (e.g., update UI)
        handleCampaignCreatedEvent(event);
    }
});


// Example event handler
function handleCampaignCreatedEvent(event: any) {
    console.log('Handling CampaignCreatedEvent...');
    
    console.log('Campaign ID:', event.campaignId);
    console.log('advertiser:', translateRawAddress(event.advertiser).toString());
    console.log('campaignContractAddress:', translateRawAddress(event.campaignContractAddress).toString());

    // TODO: Add your logic here (e.g., updating the mini-app UI)
}

// Start the server
httpServer.listen(PORT, () => {
    console.log(`Mini app is running on http://localhost:${PORT}`);
});
