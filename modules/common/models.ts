export enum TelegramAssetType {
    CHANNEL = 'CHANNEL',
    GROUP = 'GROUP',
    SUPER_GROUP = 'SUPER_GROUP',
    MINI_APP = 'MINI_APP'
}
  

export interface TelegramAsset {
    id: number; // Unique numeric identifier (e.g., "-1001234567890")
    name: string; // from the API Public username (e.g., "Abu Ali Express Channel") 
    description: string;  // from the API
    type: TelegramAssetType; // Type of the Telegram asset (channel, group, etc.)
    isPublic: boolean; // Is this asset public or private
    url: string;  // invite link - which we will use as redirect URL (e.g., for private channels/groups: https://t.me/+1dKu7kfkdudmN2Y0 and for public: https://t.me/AbuAliExpress)
    photo?: Buffer;       // Actual image data (if we want to store the raw bytes)
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
    name: string;
    description: string;
    category: TelegramCategory;
    telegramAsset: TelegramAsset;  
}