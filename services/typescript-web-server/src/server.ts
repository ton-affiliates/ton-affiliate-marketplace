import express from 'express';
import { createServer } from 'http';
import { createClient, RedisClientType } from 'redis';
import axios from 'axios';
import dotenv from 'dotenv';
import { getLatestEvents, EmitLogEvent } from './listenToEvents';
import { getUserInfo, saveUserInfo, addUserAddress, getUserIdByAddress, getCampaignByChatId, getCampaign } from "../../common/redisCommon"
import { EventData } from "../../common/EventLogging"

// Load environment variables
dotenv.config();

const PORT: number = Number(process.env.PORT) || 3000;
const HOST: string = process.env.HOST || "localhost";
const REDIS_URL: string = process.env.REDIS_URL || 'redis://0.0.0.0:6379';
const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

if (!TELEGRAM_BOT_TOKEN) {
    console.error('Error: TELEGRAM_BOT_TOKEN is not set in the .env file.');
    process.exit(1);
}

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


// Send message to Telegram
async function sendTelegramMessage(chatId: number, message: string): Promise<void> {
    try {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: message,
        });
        console.log(`Message sent to Telegram chat ID: ${chatId}`);
    } catch (error) {
        console.error(`Failed to send Telegram message: ${error}`);
    }
}

// Save last processed LT to Redis
async function saveLastProcessedLt(lt: bigint): Promise<void> {
    await redisClient.set('lastProcessedLt', lt.toString());
}

// Get last processed LT from Redis
async function getLastProcessedLt(): Promise<bigint> {
    const value = await redisClient.get('lastProcessedLt');
    return value ? BigInt(value) : BigInt(0);
}

// Process events and send messages
async function processEvents(events: EmitLogEvent[]) {
    for (const event of events) {
        console.log(`Processing event of type ${event.type}:`, event);

        switch (event.type) {
            case 'CampaignCreatedEvent': {
                const channel = 'CampaignCreatedEventChannel';
                const message = stringifyWithBigInt(event.data);
                await redisClient.publish(channel, message); // publish to all listeners (all mini apps).
                break;
            }

            case 'AffiliateCreatedEvent': {
                try {
                    // Get advertiser's user ID
                    const advertiserTelegramUser = await getUserIdByAddress(event.data.advertiserAddress);
                    if (!advertiserTelegramUser) {
                        console.error(`Advertiser address not found: ${event.data.advertiserAddress}`);
                        break;
                    }
            
                    // Get advertiser's user info
                    const advertiserInfo = await getUserInfo(advertiserTelegramUser);
                    if (!advertiserInfo) {
                        console.error(`Advertiser info not found for user ID: ${advertiserTelegramUser}`);
                        break;
                    }
            
                    // Get affiliate's user ID
                    const affiliateTelegramUser = await getUserIdByAddress(event.data.affiliate);
                    if (!affiliateTelegramUser) {
                        console.error(`Affiliate address not found: ${event.data.affiliate}`);
                        break;
                    }
            
                    // Get affiliate's user info
                    const affiliateInfo = await getUserInfo(affiliateTelegramUser);
                    if (!affiliateInfo) {
                        console.error(`Affiliate info not found for user ID: ${affiliateTelegramUser}`);
                        break;
                    }
            
                    // Prepare and send the message
                    const message = `A new affiliate has been created with ID: ${event.data.affiliateId}. Affiliate Telegram data: ${JSON.stringify(affiliateInfo)}`;
                    await sendTelegramMessage(advertiserInfo.telegramId, message);
                    console.log(`Message sent to advertiser: ${advertiserInfo.telegramId}`);
                } catch (error) {
                    console.error(`Error processing AffiliateCreatedEvent: ${error}`, error);
                }
                break;
            }

            case 'AffiliateAskToJoinAllowedListEvent': {
                try {
                    // Get advertiser's user ID
                    const advertiserTelegramUser = await getUserIdByAddress(event.data.advertiserAddress);
                    if (!advertiserTelegramUser) {
                        console.error(`Advertiser address not found: ${event.data.advertiserAddress}`);
                        break;
                    }
            
                    // Get advertiser's user info
                    const advertiserInfo = await getUserInfo(advertiserTelegramUser);
                    if (!advertiserInfo) {
                        console.error(`Advertiser info not found for user ID: ${advertiserTelegramUser}`);
                        break;
                    }
            
                    // Get affiliate's user ID
                    const affiliateTelegramUser = await getUserIdByAddress(event.data.affiliate);
                    if (!affiliateTelegramUser) {
                        console.error(`Affiliate address not found: ${event.data.affiliate}`);
                        break;
                    }
            
                    // Get affiliate's user info
                    const affiliateInfo = await getUserInfo(affiliateTelegramUser);
                    if (!affiliateInfo) {
                        console.error(`Affiliate info not found for user ID: ${affiliateTelegramUser}`);
                        break;
                    }
            
                    // Prepare and send the message
                    const message = `Affiliate has requested to join your allowed list: ${JSON.stringify(affiliateInfo)} on campaign: ${event.data.campaignId}`;
                    await sendTelegramMessage(advertiserInfo.telegramId, message);
                    console.log(`Message sent to advertiser: ${advertiserInfo.telegramId}`);
                } catch (error) {
                    console.error(`Error processing AffiliateCreatedEvent: ${error}`, error);
                }
                break;
            }

            case 'AdvertiserApprovedAffiliateToAllowedListEvent': {
                try {
                    // Get affiliate's user ID
                    const affiliateTelegramUser = await getUserIdByAddress(event.data.affiliate);
                    if (!affiliateTelegramUser) {
                        console.error(`Affiliate address not found: ${event.data.affiliate}`);
                        break;
                    }
            
                    // Get affiliate's user info
                    const affiliateInfo = await getUserInfo(affiliateTelegramUser);
                    if (!affiliateInfo) {
                        console.error(`Affiliate info not found for user ID: ${affiliateTelegramUser}`);
                        break;
                    }
            
                    // Get advertiser's user ID
                    const advertiserTelegramUser = await getUserIdByAddress(event.data.advertiserAddress);
                    if (!advertiserTelegramUser) {
                        console.error(`Advertiser address not found: ${event.data.advertiserAddress}`);
                        break;
                    }
            
                    // Get advertiser's user info
                    const advertiserInfo = await getUserInfo(advertiserTelegramUser);
                    if (!advertiserInfo) {
                        console.error(`Advertiser info not found for user ID: ${advertiserTelegramUser}`);
                        break;
                    }
            
                    // Prepare and send the message to the affiliate
                    const message = `Your request to join the allowed list has been approved by the advertiser: ${advertiserInfo.handle || advertiserInfo.name}. Campaign ID: ${event.data.campaignId}`;
                    await sendTelegramMessage(affiliateInfo.telegramId, message);
                    console.log(`Message sent to affiliate: ${affiliateInfo.telegramId}`);
                } catch (error) {
                    console.error(`Error processing AdvertiserApprovedAffiliateToAllowedListEvent: ${error}`, error);
                }
                break;
            }

            case 'AdvertiserRemovedAffiliateFromAllowedListEvent': {
                try {
                    // Get affiliate's user ID
                    const affiliateTelegramUser = await getUserIdByAddress(event.data.affiliate);
                    if (!affiliateTelegramUser) {
                        console.error(`Affiliate address not found: ${event.data.affiliate}`);
                        break;
                    }
            
                    // Get affiliate's user info
                    const affiliateInfo = await getUserInfo(affiliateTelegramUser);
                    if (!affiliateInfo) {
                        console.error(`Affiliate info not found for user ID: ${affiliateTelegramUser}`);
                        break;
                    }
            
                    // Get advertiser's user ID
                    const advertiserTelegramUser = await getUserIdByAddress(event.data.advertiserAddress);
                    if (!advertiserTelegramUser) {
                        console.error(`Advertiser address not found: ${event.data.advertiserAddress}`);
                        break;
                    }
            
                    // Get advertiser's user info
                    const advertiserInfo = await getUserInfo(advertiserTelegramUser);
                    if (!advertiserInfo) {
                        console.error(`Advertiser info not found for user ID: ${advertiserTelegramUser}`);
                        break;
                    }
            
                    // Prepare and send the message to the affiliate
                    const message = `You have been removed from the allowed list by the advertiser: ${advertiserInfo.handle || advertiserInfo.name}. Campaign ID: ${event.data.campaignId}`;
                    await sendTelegramMessage(affiliateInfo.telegramId, message);
                    console.log(`Message sent to affiliate: ${affiliateInfo.telegramId}`);
                } catch (error) {
                    console.error(`Error processing AdvertiserRemovedAffiliateFromAllowedListEvent: ${error}`, error);
                }
                break;
            }
            
            default:
                console.log(`No specific handling for event type ${event.type}`);
        }
    }
}

// Server loop to fetch and process events periodically
const fetchAndProcessEvents = async (): Promise<void> => {
    try {
        const lastProcessedLt = await getLastProcessedLt();
        console.log('Last Processed LT:', lastProcessedLt);

        const events: EmitLogEvent[] = await getLatestEvents(lastProcessedLt);
        if (events.length > 0) {
            await processEvents(events);

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
setInterval(fetchAndProcessEvents, 10 * 1000);  // every 10 seconds




//----------------------------------------------------------------------------------------------------


// TON Blockchain Configuration
const MNEMONIC = process.env.MNEMONIC || '';
const tonClient = new TonClient({ network: { endpoints: ["main.ton.dev"] } }); // Update with appropriate network


// Write verified event to the blockchain
async function writeEventToBlockchain(campaignId: BigInt, advertiserAddress: string, affiliateId: BigInt, userActionOpCode: BigInt, isPremium: Boolean) {

    const campaignContractAddress = await getCampaignContractAddress(campaignId); 

    try {
        // Convert mnemonic to key pair
        const seed = await mnemonicToSeed(MNEMONIC);
        const keyPair = await tonClient.crypto.mnemonic_derive_sign_keys({ phrase: MNEMONIC });

        // Example transaction logic
        console.log(`Writing event to blockchain: ${eventKey}`);
        const transaction = {
            key: eventKey,
            data: eventData,
        };

        // Replace this with the actual blockchain transaction code
        console.log('Simulated blockchain transaction:', transaction);
    } catch (error) {
        console.error('Error writing event to blockchain:', error);
    }
}

async function processVerifiedEvents() {
    try {
        const captchaKeys = await redisClient.keys('event:user:*:captcha_verified:*'); // Only look for captcha_verified events
        const userEvents: Record<string, Record<string, any[]>> = {}; // Group events by userId and chatId

        for (const key of captchaKeys) {
            const eventData = await redisClient.get(key);

            if (eventData) {
                try {
                    const parsedData = JSON.parse(eventData);
                    const userId = key.split(':')[2]; // Extract the userId
                    const chatId = parsedData.chatId; // Extract chatId from event data

                    if (!userEvents[userId]) {
                        userEvents[userId] = {};
                    }

                    if (!userEvents[userId][chatId]) {
                        userEvents[userId][chatId] = [];
                    }

                    userEvents[userId][chatId].push(parsedData);
                } catch (error) {
                    console.error(`Failed to parse event data for key ${key}:`, error);
                }
            }
        }

        for (const userId in userEvents) {
            const chats = userEvents[userId];

            for (const chatId in chats) {
                const events = chats[chatId];

                const captchaEvent = events.find(
                    (event) => event.eventType === 'captcha_verified' && event.chatId === chatId
                );
                const joinedEvent = events.find(
                    (event) => event.eventType === 'joined' && event.chatId === chatId
                );
                
                if (captchaEvent && joinedEvent) {
                    
                    console.log(`Processing verified events for user ${userId} in chat ${chatId}`);
                    const campaignId: string | null = await getCampaignByChatId(captchaEvent.chatId);
                    if (!campaignId) {
                        console.error(`Failed to extract campaign Id for ${userId} in chat ${chatId}`);
                        continue;
                    }
                    const campaignData = await getCampaign(campaignId);
                    if (!campaignData) {
                        console.error(`Failed to extract campaign data for campaign ID ${campaignId}`);
                        continue;
                    }

                    const { affiliateId, isPremiumUser } = captchaEvent.additionalData;

                    const userActionOpCode = BigInt(0);  // UserClick take from .env 
                    
                    try {
                        await writeEventToBlockchain(BigInt(campaignId), campaignData.advertiserAddress, affiliateId, userActionOpCode, isPremiumUser);
                    } catch (error) {
                        console.error(`Failed to write event to blockchain for user ${userId} in chat ${chatId}:`, error);
                        continue;
                    }
                }
            }
        }

        // move to processed events
        for (const userId in userEvents) {
            const chats = userEvents[userId];

            for (const chatId in chats) {
                const events:EventData = chats[chatId];

                for (const event in events) {
                    const eventKey = `event:user:${userId}:${event.eventType}:${chatId}`;
                    const processedKey = `processedEvents:user:${userId}:${event.eventType}:${chatId}`;

                    try {
                        await redisClient.set(processedKey, JSON.stringify(event));
                        await redisClient.del(eventKey);
                    } catch (error) {
                        console.error(`Failed to move event to processedEvents for key ${eventKey}:`, error);
                    }
            }
        }   
        } 

    } catch (error) {
        console.error('Error processing verified events:', error);
    }
}





// Periodic task to process verified events
setInterval(async () => {
    console.log('Checking for verified events...');
    await processVerifiedEvents();
}, 10 * 1000); // Run every 10 seconds





//-----------------------------------------------------------------------------------------------------








// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});


