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


// Wallet data
export interface WalletInfo {
    address: string;          // TON wallet address
    publicKey: string;        // Public key of the wallet
    walletName: string;       // Name of the wallet (e.g., "Tonkeeper")
    walletVersion: string;    // Version of the wallet (e.g., "2.0.1")
    network: string;          // Network (e.g., "mainnet", "testnet")
}

// campaign in telegram
export interface TelegramCampaign {
    campaignId: string;
    name: string;
    description: string;
    category: TelegramCategory;
    telegramAsset: TelegramAsset;
}

// Define the EventData type
export interface EventData {
    timestamp: number; // The timestamp when the event was logged
    userId: number;    // The ID of the user associated with the event
    chatId: number;    // The ID of the chat where the event occurred
    eventType: string; // The type of the event (e.g., 'captcha_verified', 'joined')
    additionalData: Record<string, any>; // Additional data specific to the event
}


// requests
export interface SetCampaignDetailsBody {
    advertiserTelegramId: number;
    campaignInfo: Omit<TelegramCampaign, 'campaignId' | 'status'>;
}