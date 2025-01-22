//
// Notification shape from your back end
//
export interface NotificationApiResponse {
    id: number;
    message: string;
    createdAt: string;
    readAt?: string | null;
  }
  
  // The API shape for the campaign from /api/v1/campaigns/:id
  export  interface CampaignApiResponse {
    id: string;
    advertiserAddress: string;
    campaignName: string;
    assetName: string;
    assetType?: string;
    assetTitle?: string;
    assetDescription?: string;
    inviteLink?: string;
    createdAt?: string;
    updatedAt?: string;
    assetPhotoBase64?: string;
  }
  
  // The shape of your User record
  export interface UserApiResponse {
    id: number;
    telegramUsername: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
  }