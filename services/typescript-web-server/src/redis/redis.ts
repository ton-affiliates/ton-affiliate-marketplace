// redisCommon.ts - Common Redis Utilities
import { createClient, RedisClientType } from 'redis';
import {EventData, TelegramCampaign, TelegramAsset, TelegramAssetType, TelegramCategory, WalletInfo} from '@common/models';

// Initialize Redis client
const redisClient: RedisClientType = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err));
redisClient.connect();


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


export async function setTelegramCampaignDetails(
    advertiserTelegramId: number,
    campaignId: number,
    campaignInfo: Omit<TelegramCampaign, 'campaignId'>
): Promise<TelegramCampaign> {
    
    const campaignKey = `campaign:${campaignId}`;

    // Check if the campaign exists
    const campaignExists = await redisClient.exists(campaignKey);
    if (campaignExists) {
        throw new Error(`Campaign with ID ${campaignId} already exists.`);
    }

    // Update the campaign details
    const updatedCampaign: TelegramCampaign = {
        name: campaignInfo.name,
        description: campaignInfo.description || '',
        category: campaignInfo.category,
        telegramAsset: campaignInfo.telegramAsset,
    };

    await redisClient.hSet(campaignKey, {
        name: updatedCampaign.name,
        description: updatedCampaign.description,
        category: updatedCampaign.category,
        telegramAsset: JSON.stringify(updatedCampaign.telegramAsset)
    });

     // Add reverse lookup telegramChatId -> campaignId
     await redisClient.set(`chat:${campaignInfo.telegramAsset.id}`, campaignId.toString());

    console.log(`Campaign ${campaignId} details updated by user ${advertiserTelegramId}`);

    return updatedCampaign;
}

export async function getCampaignById(campaignId: number): Promise<TelegramCampaign | null> {
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
        name: campaignData.name,
        description: campaignData.description || '',
        category: campaignData.category as TelegramCategory,
        telegramAsset: JSON.parse(campaignData.telegramAsset)
    };
}

export async function getCampaignByChatId(chatId: number): Promise<TelegramCampaign | null> {
    // Fetch the campaignId associated with the chatId
    const campaignId = await redisClient.get(`chat:${chatId}`);
    if (!campaignId) {
        console.warn(`No campaign found for chat ID ${chatId}.`);
        return null;
    }

    // Use the getCampaignById function to fetch campaign details
    return await getCampaignById(Number(campaignId));
}

export async function getCampaignsForUser(userTelegramId: number): Promise<TelegramCampaign[]> {
    const userCampaignsKey = `user:${userTelegramId}:campaigns`;

    // Fetch all campaign IDs associated with the user
    const campaignIds = await redisClient.sMembers(userCampaignsKey);
    if (!campaignIds || campaignIds.length === 0) {
        return [];
    }

    // Fetch campaign details for each campaign ID using getCampaign
    const campaigns: TelegramCampaign[] = [];
    for (const campaignId of campaignIds) {
        const campaign = await getCampaignById(Number(campaignId));
        if (campaign) {
            campaigns.push(campaign);
        }
    }

    return campaigns;
}




//------------------------------------------------------------------------------------------------------



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


export async function getWalletsForUser(telegramId: number): Promise<WalletInfo[]> {
    const userWalletsKey = `user:${telegramId}:wallets`;

    try {
        // Fetch all wallet keys for the user
        const walletAddresses = await redisClient.keys(`${userWalletsKey}:*`);

        if (!walletAddresses || walletAddresses.length === 0) {
            console.log(`No wallets found for user ${telegramId}`);
            return [];
        }

        // Fetch details for each wallet
        const wallets: WalletInfo[] = [];
        for (const walletKey of walletAddresses) {
            const walletData = await redisClient.hGetAll(walletKey);
            if (Object.keys(walletData).length > 0) {
                wallets.push({
                    address: walletData.address,
                    publicKey: walletData.publicKey,
                    walletName: walletData.walletName,
                    walletVersion: walletData.walletVersion,
                    network: walletData.network,
                });
            }
        }

        return wallets;
    } catch (error) {
        console.error(`Error fetching wallets for user ${telegramId}:`, error);
        throw new Error('Failed to fetch wallets');
    }
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

//------------------------------------------------------------------

// reading events from affilaite marketplace
// Save last processed LT to Redis
export async function saveLastProcessedLt(lt: bigint): Promise<void> {
    await redisClient.set('lastProcessedLt', lt.toString());
}

// Get last processed LT from Redis
export async function getLastProcessedLt(): Promise<bigint> {
    const value = await redisClient.get('lastProcessedLt');
    return value ? BigInt(value) : BigInt(0);
}


