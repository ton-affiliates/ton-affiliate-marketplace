// src/services/CampaignsService.ts

import appDataSource from '../ormconfig';
import { Campaign, CampaignState } from '../entity/Campaign';
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
    Logger.info(`Fetching campaign with ID: ${id}`);

    // 1) Get the campaign including its associated Telegram asset.
    const campaign = await campaignRepository().findOne({
      where: { id },
      relations: ['telegramAsset'],
    });

    if (!campaign) {
      Logger.warn(`Campaign with ID ${id} not found.`);
      return null;
    }
    Logger.info(`Campaign found: ${JSON.stringify(campaign, null, 2)}`);

    // 2) Find the CampaignRole for "advertiser" (if any)
    const advertiserRole = await campaignRoleRepository().findOne({
      where: {
        campaignId: id,
        role: RoleType.ADVERTISER,
      },
    });
    Logger.info(`Advertiser role: ${JSON.stringify(advertiserRole, null, 2)}`);

    // 3) Check if telegramAsset exists
    const telegram = campaign.telegramAsset;
    if (!telegram) {
      Logger.error(`Campaign ${id} has no associated Telegram asset.`);
      throw new Error(`Campaign ${id} has no associated Telegram asset.`);
    }
    Logger.info(`Telegram asset found: ${JSON.stringify(telegram, null, 2)}`);

    // 4) Compute verification fields using campaign methods.
    const canBotVerify = campaign.canBotVerifyEvents();
    const requiresAdminPrivileges = campaign.requiresAdminPrivileges();
    const requiresToBeMember = campaign.requiresToBeMember();
    const requiredPrivileges = campaign.getRequiredAdminPrivilegesToVerifyEvents().external;
    const requiredInternalPrivileges = campaign.getRequiredAdminPrivilegesToVerifyEvents().internal;

    Logger.info(`Verification fields calculated:
      canBotVerify: ${canBotVerify}
      requiresAdminPrivileges: ${requiresAdminPrivileges}
      requiresToBeMember: ${requiresToBeMember}
      requiredPrivileges: ${JSON.stringify(requiredPrivileges)}
      requiredInternalPrivileges: ${JSON.stringify(requiredInternalPrivileges)}
    `);

    // 5) Build the flattened response explicitly.
    const response: CampaignApiResponse = {
      id: campaign.id,
      contractAddress: campaign.contractAddress,
      name: campaign.name ?? '',
      category: campaign.category ?? '',
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      advertiserAddress: advertiserRole ? advertiserRole.walletAddress : '',
      // Flattened Telegram asset fields:
      handle: telegram.handle ?? '',
      inviteLink: telegram.inviteLink ?? '',
      assetChatId: telegram.chatId ?? '',
      assetName: telegram.name ?? '',
      assetDescription: telegram.description ?? '',
      assetType: telegram.type ?? '',
      isAssetPublic: telegram.isPublic ?? false, 
      memberCount: telegram.memberCount,
      eventsToVerify: campaign.eventsToVerify,
      verifyUserIsHumanOnReferral: campaign.verifyUserIsHumanOnReferral,
      botStatus: telegram.botStatus,
      adminPrivileges: telegram.adminPrivileges,
      assetPhotoBase64: telegram.photo ? Buffer.from(telegram.photo).toString('base64') : '',
      // Verification fields:
      requiresAdminPrivileges: requiresAdminPrivileges,
      requiresToBeMember: requiresToBeMember,
      canBotVerify: canBotVerify,
      requiredPrivileges: requiredPrivileges,
      requiredInternalPrivileges: requiredInternalPrivileges
    };

    Logger.info(`Successfully built campaign response for ID: ${id}`);
    return response;
  } catch (err) {
    Logger.error(`Error fetching campaign with advertiser (ID: ${id}): ${err}`);
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

export async function getPublicCampaignsForMarketplace(
  category: string | null,
  offset: number,
  limit: number
): Promise<CampaignApiResponse[]> {
  Logger.info(`[Marketplace] Fetching public campaigns`);
  Logger.info(`[Marketplace] Params → category: ${category}, offset: ${offset}, limit: ${limit}`);

  const repo = campaignRepository();

  const query = repo
    .createQueryBuilder('campaign')
    .leftJoinAndSelect('campaign.telegramAsset', 'telegramAsset')
    .where('campaign.state = :state', { state: CampaignState.BLOCKCHIAN_DETIALS_SET });

  if (category !== null) {
    Logger.debug(`[Marketplace] Applying category filter: ${category}`);
    query.andWhere('campaign.category = :category', { category });
  }

  query
    .orderBy('telegramAsset.memberCount', 'DESC')
    .skip(offset)
    .take(limit);

  Logger.debug('[Marketplace] Executing DB query...');
  const campaigns = await query.getMany();
  Logger.info(`[Marketplace] Retrieved ${campaigns.length} campaigns from DB`);

  const responses: CampaignApiResponse[] = [];

  for (const campaign of campaigns) {
    Logger.debug(`[Marketplace] Processing campaign ID: ${campaign.id}`);

    const advertiserRole = await campaignRoleRepository().findOne({
      where: {
        campaignId: campaign.id,
        role: RoleType.ADVERTISER,
      },
    });

    const telegram = campaign.telegramAsset;
    if (!telegram) {
      Logger.warn(`[Marketplace] Campaign ${campaign.id} has no Telegram asset. Skipping.`);
      continue;
    }

    const response: CampaignApiResponse = {
      id: campaign.id,
      contractAddress: campaign.contractAddress,
      name: campaign.name ?? '',
      category: campaign.category ?? '',
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      advertiserAddress: advertiserRole ? advertiserRole.walletAddress : '',
      handle: telegram.handle ?? '',
      inviteLink: telegram.inviteLink ?? '',
      assetChatId: telegram.chatId ?? '',
      assetName: telegram.name ?? '',
      assetDescription: telegram.description ?? '',
      assetType: telegram.type ?? '',
      isAssetPublic: telegram.isPublic ?? false,
      memberCount: telegram.memberCount,
      eventsToVerify: campaign.eventsToVerify,
      verifyUserIsHumanOnReferral: campaign.verifyUserIsHumanOnReferral,
      botStatus: telegram.botStatus,
      adminPrivileges: telegram.adminPrivileges,
      assetPhotoBase64: telegram.photo
        ? Buffer.from(telegram.photo).toString('base64')
        : '',
      requiresAdminPrivileges: campaign.requiresAdminPrivileges(),
      requiresToBeMember: campaign.requiresToBeMember(),
      canBotVerify: campaign.canBotVerifyEvents(),
      requiredPrivileges: campaign.getRequiredAdminPrivilegesToVerifyEvents().external,
      requiredInternalPrivileges: campaign.getRequiredAdminPrivilegesToVerifyEvents().internal,
    };

    responses.push(response);
  }

  Logger.info(`[Marketplace] Returning ${responses.length} enriched campaign responses`);
  return responses;
}
