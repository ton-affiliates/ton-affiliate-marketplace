// redisCommon.ts - Common Redis Utilities
import { createClient, RedisClientType } from 'redis';

// Initialize Redis client
const redisClient: RedisClientType = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err));
redisClient.connect();

export enum TelegramAssetType {
    CHANNEL,
    GROUP,
    SUPER_GROUP,
    FORUM,
    MINI_APP,
}

export interface TelegramAsset {
    id: number; // Unique numeric identifier (e.g., "-1001234567890")
    name: string; // Public username (e.g., "Abu Ali Express Channel") 
    type: TelegramAssetType; // Type of the Telegram asset (channel, group, etc.)
    isPublic: boolean; // Is this asset public or private
    url: string;  // Redirect URL (e.g., for private channels/groups: https://t.me/+1dKu7kfkdudmN2Y0 and for public: https://t.me/AbuAliExpress)
}

export enum TelegramCategory {
    GAMING = 'Gaming',
    CRYPTO = 'Crypto',
    TECHNOLOGY = 'Technology',
    LIFESTYLE = 'Lifestyle',
    EDUCATION = 'Education',
    HEALTH = 'Health',
    TRAVEL = 'Travel',
    FINANCE = 'Finance',
    ENTERTAINMENT = 'Entertainment',
    POLITICS = 'Politics',
    SOCIAL = 'Social',
    SPORTS = 'Sports',
    NEWS = 'News',
    SCIENCE = 'Science',
    ART = 'Art',
    MUSIC = 'Music',
    OTHER = 'Other', // For uncategorized or unique cases
}

// Define the EventData type
export interface EventData {
    timestamp: number; // The timestamp when the event was logged
    userId: number;    // The ID of the user associated with the event
    chatId: number;    // The ID of the chat where the event occurred
    eventType: string; // The type of the event (e.g., 'captcha_verified', 'joined')
    additionalData: Record<string, any>; // Additional data specific to the event
}

// verified event can be - user solved captcha, user joined group/channel, user stayed 2 weeks, etc...
export async function logVerifiedEvent(userId: number, chatId: number, eventType: string, additionalData: Record<string, any> = {}): Promise<void> {
    const eventData: EventData = {
        timestamp: Date.now(),
        userId,
        chatId,
        eventType,
        additionalData
    };

    // TODO Guy - check for duplicates here in processed events
    const eventKey = `event:user:${userId}:${eventType}:${chatId}`;
    await redisClient.set(eventKey, JSON.stringify(eventData)); 
    console.log(`Logged verified event: ${eventKey}`, eventData);
}

//-------------------------------------------------------------------------------------------------------------


// campaign in telegram
export interface Campaign {
    campaignId: string;
    name: string;
    description: string;
    category: TelegramCategory;
    telegramAsset: TelegramAsset;
    status: string;
}


// flow -> 1. deploy new empty campaign and get campaignId via event. Save empty telegram campaign, 2. set campaign telegram details (via bot as admin), 3. set blockchain details 
export async function createNewEmptyCampaign(advertiserTelegramId: number, campaignId: number): Promise<Campaign> {
    const campaignKey = `campaign:${campaignId}`;
    const userCampaignsKey = `user:${advertiserTelegramId}:campaigns`;

    // Create an empty campaign
    const emptyCampaign: Campaign = {
        campaignId: campaignId.toString(),
        name: 'Empty - need to set details',
        description: '',
        category: '' as TelegramCategory, // Default empty category
        telegramAsset: {
            id: 0, // Placeholder for no asset
            name: '',
            type: TelegramAssetType.CHANNEL, // Default type, update as needed
            isPublic: false,
            url: '',
        },
        status: 'EMPTY',
    };

    await redisClient.hSet(campaignKey, {
        name: emptyCampaign.name,
        description: emptyCampaign.description,
        category: emptyCampaign.category,
        telegramAsset: JSON.stringify(emptyCampaign.telegramAsset),
        advertiserId: advertiserTelegramId,
        status: emptyCampaign.status,
    });

    // Associate campaign with the user
    await redisClient.sAdd(userCampaignsKey, campaignId.toString());

    console.log(`Campaign ${campaignId} created and associated with user ${advertiserTelegramId}`);

    return emptyCampaign;
}


export async function setCampaignDetails(
    advertiserTelegramId: number,
    campaignId: number,
    campaignInfo: Omit<Campaign, 'campaignId' | 'status'>
): Promise<Campaign> {
    const campaignKey = `campaign:${campaignId}`;

    // Check if the campaign exists
    const campaignExists = await redisClient.exists(campaignKey);
    if (!campaignExists) {
        throw new Error(`Campaign with ID ${campaignId} does not exist.`);
    }

    // Get the current status of the campaign
    const currentStatus = await redisClient.hGet(campaignKey, 'status');
    if (currentStatus !== 'EMPTY') {
        throw new Error(`Campaign with ID ${campaignId} is not empty and cannot be updated.`);
    }

    // Update the campaign details
    const updatedCampaign: Campaign = {
        campaignId: campaignId.toString(),
        name: campaignInfo.name,
        description: campaignInfo.description || '',
        category: campaignInfo.category,
        telegramAsset: campaignInfo.telegramAsset,
        status: 'COMPLETED',
    };

    await redisClient.hSet(campaignKey, {
        name: updatedCampaign.name,
        description: updatedCampaign.description,
        category: updatedCampaign.category,
        telegramAsset: JSON.stringify(updatedCampaign.telegramAsset),
        status: updatedCampaign.status,
    });

     // Add reverse lookup telegramChatId -> campaignId
     await redisClient.set(`chat:${campaignInfo.telegramAsset.id}`, campaignId.toString());

    console.log(`Campaign ${campaignId} details updated by user ${advertiserTelegramId}`);

    return updatedCampaign;
}

export async function getCampaignById(campaignId: number): Promise<Campaign | null> {
    const campaignKey = `campaign:${campaignId}`;

    // Check if the campaign exists
    const campaignExists = await redisClient.exists(campaignKey);
    if (!campaignExists) {
        console.warn(`Campaign with ID ${campaignId} does not exist.`);
        return null;
    }

    // Fetch campaign details from Redis
    const campaignData = await redisClient.hGetAll(campaignKey);

    // Parse the data into the required structure
    return {
        campaignId: campaignId.toString(),
        name: campaignData.name,
        description: campaignData.description || '',
        category: campaignData.category as TelegramCategory,
        telegramAsset: JSON.parse(campaignData.telegramAsset),
        status: campaignData.status,
    };
}

export async function getCampaignByChatId(chatId: number): Promise<Campaign | null> {
    // Fetch the campaignId associated with the chatId
    const campaignId = await redisClient.get(`chat:${chatId}`);
    if (!campaignId) {
        console.warn(`No campaign found for chat ID ${chatId}.`);
        return null;
    }

    // Use the getCampaignById function to fetch campaign details
    return await getCampaignById(Number(campaignId));
}

export async function getCampaignsForUser(userTelegramId: number): Promise<Campaign[]> {
    const userCampaignsKey = `user:${userTelegramId}:campaigns`;

    // Fetch all campaign IDs associated with the user
    const campaignIds = await redisClient.sMembers(userCampaignsKey);
    if (!campaignIds || campaignIds.length === 0) {
        return [];
    }

    // Fetch campaign details for each campaign ID using getCampaign
    const campaigns: Campaign[] = [];
    for (const campaignId of campaignIds) {
        const campaign = await getCampaign(Number(campaignId));
        if (campaign) {
            campaigns.push(campaign);
        }
    }

    return campaigns;
}




//------------------------------------------------------------------------------------------------------


// Wallet data
export interface WalletInfo {
    address: string;          // TON wallet address
    publicKey: string;        // Public key of the wallet
    walletName: string;       // Name of the wallet (e.g., "Tonkeeper")
    walletVersion: string;    // Version of the wallet (e.g., "2.0.1")
    network: string;          // Network (e.g., "mainnet", "testnet")
}

export async function saveWalletInfo(telegramId: number, wallet: WalletInfo): Promise<void> {
    const userWalletsKey = `user:${telegramId}:wallets`;

    // Save wallet info as a hash.  Each telegram user can have one or more wallets.
    await redisClient.hSet(`${userWalletsKey}:${wallet.address}`, {
        address: wallet.address,
        publicKey: wallet.publicKey,
        walletName: wallet.walletName,
        walletVersion: wallet.walletVersion,
        network: wallet.network
    });

    // Add reverse lookup address -> telegramId
    await redisClient.set(`address:${wallet.address}`, telegramId.toString());

    console.log(`Wallet ${wallet.address} saved for user ${telegramId}`);
}


//----------------------------------------------------------------------------------------------------------



// User (Telegram Data)
export async function saveUserInfo(
    telegramId: number,
    info: { handle?: string; name?: string },
    address: string
): Promise<void> {
    const userKey = `user:${telegramId}`;
    const { handle = '', name = '' } = info;

    // Save user info
    await redisClient.hSet(userKey, {
        telegramId: telegramId.toString(),
        handle,
        name,
    });

    // Save associated TON addresses and reverse lookup
    await addTonAddressToUser(telegramId, address);
    

    console.log(`User ${telegramId} info saved with address: ${address}`);
}

export async function addTonAddressToUser(telegramId: number, address: string): Promise<void> {
    const userKey = `user:${telegramId}`;
    const addressesKey = `${userKey}:addresses`;

    // Add address to user's address set
    await redisClient.sAdd(addressesKey, address);

    // Map TON address to the user's Telegram ID
    await redisClient.set(`address:${address}`, telegramId.toString());

    console.log(`Address ${address} added for user ${telegramId}`);
}

export async function getUserInfo(telegramId: number): Promise<{
    telegramId: number;
    handle: string;
    name: string;
} | null> {
    const userKey = `user:${telegramId}`;

    // Fetch user info
    const userInfo = await redisClient.hGetAll(userKey);
    if (!userInfo || Object.keys(userInfo).length === 0) {
        return null;
    }

    return {
        telegramId: Number(userInfo.telegramId),
        handle: userInfo.handle || '',
        name: userInfo.name || '',
    };
}

export async function getUserByTonAddress(address: string): Promise<{
    telegramId: number;
    handle: string;
    name: string;
} | null> {
    // Get the Telegram ID from the TON address
    const telegramId = await redisClient.get(`address:${address}`);
    if (!telegramId) {
        return null;
    }

    // Fetch user info by Telegram ID
    return await getUserInfo(Number(telegramId));
}