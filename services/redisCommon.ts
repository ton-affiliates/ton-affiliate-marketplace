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
    name: string; // Public username (e.g., "@AbuAliExpress") or "PRIVATE" for private groups/channels
    type: TelegramAssetType; // Type of the Telegram asset (channel, group, etc.)
    isPublic: boolean; // Is this asset public or private
    url: string;  // Redirect URL (e.g., https://t.me/+1dKu7kfkdudmN2Y0)
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

// Save campaign information
export async function saveCampaign(
    campaignId: string,
    campaignInfo: {
        name: string;
        description?: string;
        category: TelegramCategory;
        telegramAsset: TelegramAsset;
        advertiserAddress: string;
    }
): Promise<void> {
    const { name, description, category, telegramAsset, advertiserAddress } = campaignInfo;

    await redisClient.hSet(`campaign:${campaignId}`, {
        name,
        description: description || '',
        category,
        telegramAssetId: telegramAsset.id.toString(),
        telegramAssetName: telegramAsset.name,
        telegramAssetType: telegramAsset.type.toString(),
        telegramAssetIsPublic: telegramAsset.isPublic ? 'true' : 'false',
        advertiserAddress,
    });

    // Map chatId to campaignId for reverse lookup
    await redisClient.set(`chat:${telegramAsset.id}`, campaignId);
}

// Get campaign by chatId
export async function getCampaignByChatId(chatId: number): Promise<string | null> {
    return await redisClient.get(`chat:${chatId}`);
}

// Get campaign information
export async function getCampaign(
    campaignId: string
): Promise<{
    name: string;
    description: string;
    category: TelegramCategory;
    telegramAsset: TelegramAsset;
    advertiser: { telegramId: number; handle: string; name: string; addresses: string[] } | null;
    affiliates: Array<{ telegramId: number; handle: string; name: string; addresses: string[] }>;
} | null> {
    const campaignData = await redisClient.hGetAll(`campaign:${campaignId}`);

    if (!campaignData || Object.keys(campaignData).length === 0) {
        return null;
    }

    // Fetch advertiser user info
    const advertiserUserId = await getUserIdByAddress(campaignData.advertiserAddress);
    const advertiser = advertiserUserId ? await getUserInfo(advertiserUserId) : null;

    // Fetch affiliate user info
    const affiliateAddresses = await redisClient.sMembers(`campaign:${campaignId}:affiliates`);
    const affiliates = [];
    for (const address of affiliateAddresses) {
        const userId = await getUserIdByAddress(address);
        if (userId) {
            const userInfo = await getUserInfo(userId);
            if (userInfo) {
                affiliates.push(userInfo);
            }
        }
    }

    return {
        name: campaignData.name,
        description: campaignData.description,
        category: campaignData.category as TelegramCategory,
        telegramAsset: {
            id: Number(campaignData.telegramAssetId),
            name: campaignData.telegramAssetName,
            type: Number(campaignData.telegramAssetType) as TelegramAssetType,
            isPublic: campaignData.telegramAssetIsPublic === 'true',
            url: campaignData.url,
        },
        advertiser,
        affiliates,
    };
}

// Add an affiliate to a campaign
export async function addAffiliateToCampaign(campaignId: string, affiliateAddress: string): Promise<boolean> {
    const key = `campaign:${campaignId}:affiliates`;
    const added = await redisClient.sAdd(key, affiliateAddress) > 0; // true if added, false if already exists
    return added;
}

// Save user information
export async function saveUserInfo(
    userId: string,
    info: { telegramId: number; handle?: string; name?: string }
): Promise<void> {
    const { telegramId, handle, name } = info;

    await redisClient.hSet(`user:${userId}`, {
        telegramId: telegramId.toString(),
        handle: handle || '',
        name: name || '',
    });
}

// Get user information
export async function getUserInfo(
    userId: string
): Promise<{ telegramId: number; handle: string; name: string; addresses: string[] } | null> {
    const userInfo = await redisClient.hGetAll(`user:${userId}`);
    if (!userInfo || Object.keys(userInfo).length === 0) {
        return null;
    }

    const addresses = await redisClient.sMembers(`user:${userId}:addresses`);
    return {
        telegramId: Number(userInfo.telegramId),
        handle: userInfo.handle,
        name: userInfo.name,
        addresses,
    };
}

// Get user ID by TON address
export async function getUserIdByAddress(address: string): Promise<string | null> {
    return await redisClient.get(`address:${address}`);
}

// Add an address to an existing user
export async function addUserAddress(userId: string, address: string): Promise<void> {
    await redisClient.sAdd(`user:${userId}:addresses`, address);

    // Map TON address to user ID for quick lookup
    await redisClient.set(`address:${address}`, userId); // always set latest
}
