// src/services/CampaignsService.ts

import appDataSource from '../ormconfig';
import { Campaign } from '../entity/Campaign';
import { Logger } from '../utils/Logger';
import { CampaignRole, RoleType } from '../entity/CampaignRole';
import { Address } from '@ton/core';
import { CampaignApiResponse } from '@common/ApiResponses';

function campaignRepository() {
  return appDataSource.getRepository(Campaign);
}

function campaignRoleRepository() {
  return appDataSource.getRepository(CampaignRole);
}

export async function ensureCampaign(data: Partial<Campaign>): Promise<Campaign> {
  try {
    const repo = campaignRepository();

    // 1) Check if a campaign with the same ID already exists
    let existing = await repo.findOne({ where: { id: data.id } });
    if (existing) {
      // 2) Merge new data into the existing entity
      Object.assign(existing, data);
      Logger.info(`Updating existing campaign with id=${data.id}`);
      return await repo.save(existing);
    } else {
      // 3) If not found, create a new campaign
      Logger.info(`Creating new campaign with id=${data.id}`);
      const newCampaign = repo.create(data);
      return await repo.save(newCampaign);
    }
  } catch (err) {
    Logger.error('Error creating/updating campaign ' + err);
    throw new Error('Could not create or update campaign');
  }
}

/** 
 * Fetch a single campaign and include extra fields from its associated Telegram asset.
 * The returned object includes:
 *   - advertiserAddress (from the CampaignRole for advertiser)
 *   - assetPhotoBase64 (from telegramAsset.assetPhoto)
 *   - canBotVerify (delegated to telegramAsset.canBotVerifyEvents)
 *   - requiredPrivileges (delegated to telegramAsset.getRequiredPrivileges)
 */
/**
 * Fetch a single campaign and flatten its associated Telegram asset fields.
 * Returns a CampaignApiResponse.
 */
export async function getCampaignByIdWithAdvertiser(
  id: string
): Promise<CampaignApiResponse | null> {
  try {
    // 1) Get the campaign including its associated Telegram asset.
    const campaign = await campaignRepository().findOne({
      where: { id },
      relations: ['telegramAsset'],
    });
    if (!campaign) {
      return null;
    }

    // 2) Find the CampaignRole for "advertiser" (if any)
    const advertiserRole = await campaignRoleRepository().findOne({
      where: {
        campaignId: id,
        role: RoleType.ADVERTISER,
      },
    });

    // 3) Flatten Telegram asset fields; if missing, provide defaults.
    const telegram = campaign.telegramAsset || {
      handle: '',
      inviteLink: '',
      name: '',
      description: '',
      assetType: '',
      type: '',
      memberCount: 0,
      botIsAdmin: false,
      adminPrivileges: [] as string[],
      photo: null as Buffer | null,
    };

    // Convert photo to Base64 if available.
    const assetPhotoBase64 = telegram.photo ? Buffer.from(telegram.photo).toString('base64') : '';

    // 4) Compute verification fields using campaign methods.
    const canBotVerify = campaign.canBotVerifyEvents();
    const requiredPrivileges = campaign.getRequiredAdminPrivilegesToVerifyEvents().external;

    // 5) Build the flattened response explicitly.
    const response: CampaignApiResponse = {
      id: campaign.id,
      contractAddress: campaign.contractAddress,
      name: campaign.name ?? '', // Map campaign.name to response.name
      category: campaign.category ?? '',
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      advertiserAddress: advertiserRole ? advertiserRole.walletAddress : '',
      // Flattened Telegram asset fields:
      handle: telegram.handle ?? '',
      inviteLink: telegram.inviteLink ?? '',
      assetName: telegram.name ?? '',
      assetDescription: telegram.description ?? '',
      assetType: telegram.type ?? '',
      memberCount: telegram.memberCount,
      eventsToVerify: campaign.eventsToVerify,
      botIsAdmin: telegram.botIsAdmin,
      adminPrivileges: telegram.adminPrivileges,
      assetPhotoBase64,
      // Verification fields:
      canBotVerify,
      requiredPrivileges,
    };

    return response;
  } catch (err) {
    Logger.error('Error fetching campaign with advertiser: ' + err);
    throw err;
  }
}

/**
 * Get all campaigns for a given wallet address.
 */
export async function getAllCampaignsForWallet(
  walletAddress: Address,
  roleType: RoleType
): Promise<Campaign[]> {
  try {
    // 1) Find all campaign roles for this wallet address, loading the related Campaign
    const roles = await campaignRoleRepository().find({
      where: { walletAddress: walletAddress.toString(), role: roleType },
      relations: ['campaign'],
    });

    // 2) Extract the Campaign entities from these roles
    const campaigns = roles.map((role) => role.campaign);

    // 3) Remove duplicates if the same wallet has multiple roles in the same campaign
    const uniqueByCampaignId = new Map<string, Campaign>();
    campaigns.forEach((camp) => {
      uniqueByCampaignId.set(camp.id, camp);
    });

    // 4) Return the unique Campaigns
    return Array.from(uniqueByCampaignId.values());
  } catch (err) {
    Logger.error(`Error fetching campaigns for wallet: ${walletAddress}\n` + err);
    throw new Error('Could not retrieve campaigns');
  }
}
