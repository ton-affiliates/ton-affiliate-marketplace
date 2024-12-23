import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { createClient, RedisClientType } from 'redis';
import { getLatestEvents, EmitLogEvent } from './listenToEvents'; // Adjust the path as needed

const PORT: number = Number(process.env.PORT) || 3000;
const REDIS_URL: string = process.env.REDIS_URL || 'redis://0.0.0.0:6379';
const REDIS_KEY: string = 'lastProcessedEventLT'; // Key to store the latest LT in Redis

// Redis client setup
const redisClient: RedisClientType = createClient({ url: REDIS_URL });

redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err));
redisClient.connect();

// Initialize the Express app
const app = express();
const httpServer = createServer(app);

async function processEvents(events: EmitLogEvent[]) {
    for (const event of events) {
        if (event.type === 'CampaignCreatedEvent') {
            const channel = 'campaign-created';
            const message = JSON.stringify({
                campaignId: event.data.campaignId,
                createdAt: event.createdAt,
                data: event.data,
            });

            console.log(`Publishing to channel ${channel}:`, message);
            await redisPublisher.publish(channel, message);
        }
        // Add additional conditions for other events if needed
    }
}


// Server loop to fetch and process events periodically
const fetchAndProcessEvents = async (): Promise<void> => {

    try {
        const logs: EmitLogEvent[] = await getLatestEvents();
        console.log("In server");
        console.log(logs);

        // Save the latest LT to Redis
        // await setLastProcessedEventLT(currProcessedEventLT);
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
