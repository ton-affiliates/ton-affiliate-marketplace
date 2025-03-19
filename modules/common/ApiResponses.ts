// src/common/ApiResponses.ts

export interface NotificationApiResponse {
  id: number;
  message: string;
  createdAt: string;
  readAt?: string | null;
  link?: string | null;
}

export interface CampaignApiResponse {
  id: string;
  contractAddress: string;
  name: string | null;  // renamed from campaignName
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  advertiserAddress?: string;
  handle?: string;
  inviteLink?: string;
  assetChatId?: string;
  assetName?: string;
  assetDescription?: string;
  assetType?: string;
  isAssetPublic?: boolean;
  memberCount?: number;
  eventsToVerify?: number[];
  verifyUserIsHumanOnReferral?: boolean;
  botStatus?: string;
  adminPrivileges?: string[];
  assetPhotoBase64?: string;
  requiresAdminPrivileges?: boolean;
  requiresToBeMember?: boolean;
  canBotVerify?: boolean;
  requiredPrivileges?: string[];
  requiredInternalPrivileges?: string[];
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
