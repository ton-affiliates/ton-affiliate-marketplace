// src/models/models.ts

export interface NotificationApiResponse {
  id: number;
  message: string;
  createdAt: string;
  readAt?: string | null;
  link?: string | null;
}

export interface CampaignApiResponse {
  id: string;
  handle: string;
  campaignContractAddress: string;
  advertiserAddress: string;
  campaignName: string;
  assetName: string;
  memberCount?: number;
  botIsAdmin?: boolean;
  adminPrivileges?: string[];
  assetType?: string;
  assetTitle?: string;
  assetDescription?: string;
  inviteLink?: string;
  createdAt?: string;
  assetPhotoBase64?: string;
  canBotVerify?: boolean;          
  requiredPrivileges?: string[];    
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
