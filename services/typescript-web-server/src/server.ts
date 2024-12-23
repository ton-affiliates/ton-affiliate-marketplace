import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { createClient, RedisClientType } from 'redis';
import { getLatestEvents, EmitLogEvent } from './listenToEvents'; // Adjust the path as needed

const PORT: number = Number(process.env.PORT) || 3000;
const REDIS_URL: string = process.env.REDIS_URL || 'redis://0.0.0.0:6379';

// Redis client setup
const redisClient: RedisClientType = createClient({ url: REDIS_URL });

redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err));
redisClient.connect();

// Initialize the Express app
const app = express();
const httpServer = createServer(app);

const stringifyWithBigInt = (obj: any) => {
    return JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? `${value.toString()}n` : value // Append 'n' to BigInt values
    );
};

// last lt getter/setter functions
async function saveLastProcessedLt(lt: bigint): Promise<void> {
    await redisClient.set('lastProcessedLt', lt.toString());
}

async function getLastProcessedLt(): Promise<bigint> {
    const value = await redisClient.get('lastProcessedLt');
    return value ? BigInt(value) : BigInt(0); // Default to 0 if not found
}

async function processEvents(events: EmitLogEvent[]) {
    for (const event of events) {
        if (event.type === 'CampaignCreatedEvent') {
            const channel = 'CampaignCreatedEventChannel';
            const message = stringifyWithBigInt(event.data);
            console.log(`Publishing to channel ${channel}:`, message);
            console.log('Event Data (Pre-publish):', event.data);

            await redisClient.publish(channel, message);
        }
        // Add additional conditions for other events if needed
    }
}


// Server loop to fetch and process events periodically
const fetchAndProcessEvents = async (): Promise<void> => {
    try {
        const lastProcessedLt = await getLastProcessedLt(); // Fetch the last processed LT
        console.log('Last Processed LT:', lastProcessedLt);

        const events: EmitLogEvent[] = await getLatestEvents(lastProcessedLt); // Pass LT to fetch events
        if (events.length > 0) {
            await processEvents(events);

            // Update the lastProcessedLt to the highest LT from the processed events
            const maxLt = events.reduce(
                (max, event) => (event.createdLt > max ? event.createdLt : max),
                lastProcessedLt
            );
            await saveLastProcessedLt(maxLt);
            console.log('Updated Last Processed LT:', maxLt);
        }
    } catch (error) {
        console.error('Error fetching or processing events:', error);
    }
};

// Schedule the event fetcher to run periodically
setInterval(fetchAndProcessEvents, 10000); // Fetch every 10 seconds

// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
