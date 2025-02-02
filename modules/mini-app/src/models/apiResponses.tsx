// src/models/models.ts

export interface NotificationApiResponse {
  id: number;
  message: string;
  createdAt: string;
  readAt?: string | null;
  link?: string | null;
}

export interface CampaignApiResponse {
  // Campaign (blockchain) fields
  id: string;                           // Campaign ID (from blockchain)
  contractAddress: string;              // Contract address of the campaign
  campaignName: string | null;          // Campaign name (nullable)
  category?: string | null;             // Campaign category (if provided)
  state: string;                        // Campaign state, e.g. "DEPLOYED", etc.
  createdAt: string;                    // Campaign creation timestamp (ISO string)
  updatedAt: string;                    // Campaign update timestamp (ISO string)

  // Fields computed from the CampaignRole for "advertiser"
  advertiserAddress?: string;           // Advertiser wallet address

  // Telegram asset fields (sourced from the associated TelegramAsset)
  handle?: string;                      // Telegram asset handle (e.g. "MyChannel")
  inviteLink?: string;                  // Canonical invite link (e.g. "https://t.me/MyChannel")
  assetName?: string;                   // Display name of the Telegram asset (channel title)
  assetDescription?: string;            // Description of the Telegram asset
  assetType?: string;                   // Telegram asset type (e.g. "channel")
  memberCount?: number;                 // Member/subscriber count
  botIsAdmin?: boolean;                 // Whether our bot is admin in this asset
  adminPrivileges?: string[];           // Array of privileges our bot has in this asset
  assetPhotoBase64?: string;            // Telegram asset photo as a Base64-encoded string

  // Computed fields based on verification logic
  canBotVerify?: boolean;               // Whether the bot can verify events for this campaign
  requiredPrivileges?: string[];        // List of privileges required for verification
}


export interface UserApiResponse {
  id: number;
  telegramUsername: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

/**
 * Represents an affiliate (or advertiser) role record from /campaign-roles/affiliates/by-wallet
 */
export interface CampaignRoleApiResponse {
  id: number;               // the DB primary key
  campaignId: string;       // e.g. "3938614347"
  walletAddress: string;    // e.g. "EQCsIGoFs0..."
  role: 'advertiser' | 'affiliate';
  affiliateId: number | null;
  createdAt: string;        // date string
  updatedAt: string;        // date string
}
