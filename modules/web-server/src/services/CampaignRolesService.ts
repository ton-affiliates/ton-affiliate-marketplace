import appDataSource from '../ormconfig';
import { Logger } from '../utils/Logger';
import { CampaignRole, RoleType } from '../entity/CampaignRole';
import {Address} from "@ton/core";

function campaignRoleRepository() {
  return appDataSource.getRepository(CampaignRole);
}


interface CreateCampaignRoleInput {
  campaignId: string;
  tonAddress: Address;
  role: RoleType;
  affiliateId?: number;
  isActive?: boolean;
}

/**
 * Create a new CampaignRole by receiving a Ton Address object,
 * converting it to a string internally.
 */
export async function createCampaignRole(data: CreateCampaignRoleInput): Promise<CampaignRole> {

  try {
    const repo = campaignRoleRepository();

    // Convert Ton Address => string
    const walletAddress = data.tonAddress.toString();

    // Build the partial data object for repository
    const roleData: Partial<CampaignRole> = {
      campaignId: data.campaignId,
      walletAddress,
      role: data.role,
      affiliateId: data.affiliateId,
      isActive: data.isActive ?? false,
    };

    const roleEntity = repo.create(roleData);
    return await repo.save(roleEntity);
  } catch (err) {
    Logger.error('Error creating campaign role ' + err);
    throw new Error('Could not create campaign role');
  }
}

export async function getCampaignRoleById(id: number): Promise<CampaignRole | null> {
  try {
    return await campaignRoleRepository().findOne({
      where: { id },
      relations: ['campaign', 'wallet'],
    });
  } catch (err) {
    Logger.error(`Error fetching campaign role by ID: ${id} ` + err);
    throw new Error('Could not retrieve campaign role');
  }
}

/**
 * Get the advertiser for a specific campaign.
 */
export async function getAdvertiserForCampaign(campaignId: string): Promise<CampaignRole | null> {
  try {
    return await campaignRoleRepository().findOne({
      where: {
        campaignId,
        role: RoleType.ADVERTISER,
      },
      relations: ['campaign', 'wallet'],
    });
  } catch (err) {
    Logger.error(`Error fetching advertiser for campaign: ${campaignId} ` + err);
    throw new Error('Could not retrieve advertiser');
  }
}

/**
 * Get all affiliates for a campaign.
 */
export async function getAllAffiliatesForCampaign(campaignId: string): Promise<CampaignRole[]> {
  try {
    return await campaignRoleRepository().find({
      where: {
        campaignId,
        role: RoleType.AFFILIATE,
      },
      relations: ['campaign', 'wallet'],
    });
  } catch (err) {
    Logger.error(`Error fetching affiliates for campaign: ${campaignId} ` + err);
    throw new Error('Could not retrieve affiliates');
  }
}

export async function updateCampaignRoleByCampaignAndWalletAddress(
  campaignId: string,
  tonAddress: Address,
  updates: Partial<CampaignRole>
): Promise<CampaignRole | null> {
  try {
    const repo = campaignRoleRepository();
    const walletAddress = tonAddress.toString();
    // 1) Find the row
    const role = await repo.findOne({
      where: { campaignId, walletAddress},
    });
    if (!role) return null;

    // 2) Merge and save
    Object.assign(role, updates);
    return await repo.save(role);
  } catch (err) {
    Logger.error(`Error updating campaign role for campaign=${campaignId}, wallet=${tonAddress}: ` + err);
    throw new Error('Could not update campaign role');
  }
}

export async function deleteCampaignRoleByCampaignAndWallet(
  campaignId: string,
  walletAddress: string
): Promise<boolean> {
  try {
    const repo = campaignRoleRepository();
    const result = await repo.delete({
      campaignId: campaignId,
      walletAddress: walletAddress,
    });
    return result.affected !== 0;
  } catch (err) {
    Logger.error(
      `Error deleting campaign role with campaignId=${campaignId} and walletAddress=${walletAddress}: ` + err
    );
    throw new Error('Could not delete campaign role');
  }
}

