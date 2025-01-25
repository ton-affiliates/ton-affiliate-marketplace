import appDataSource from '../ormconfig';
import { Logger } from '../utils/Logger';
import { CampaignRole, RoleType } from '../entity/CampaignRole';
import {Address} from "@ton/core";
import { User } from 'entity/User';

function campaignRoleRepository() {
  return appDataSource.getRepository(CampaignRole);
}


interface CreateCampaignRoleInput {
  campaignId: string;
  tonAddress: Address;
  role: RoleType;
  affiliateId?: number;
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
      affiliateId: data.affiliateId
    };

    const roleEntity = repo.create(roleData);
    return await repo.save(roleEntity);
  } catch (err) {
    Logger.error('Error creating campaign role ' + err);
    throw new Error('Could not create campaign role');
  }
}

export async function deleteCampaignRoleByCampaignAndWallet(
  campaignId: string,
  walletAddress: string
): Promise<boolean> {
  try {
    // we can only delete affiliates (never an advertiser)
    const repo = campaignRoleRepository();
    const result = await repo.delete({
      campaignId: campaignId,
      walletAddress: walletAddress,
      role: RoleType.AFFILIATE
    });
    return result.affected !== 0;
  } catch (err) {
    Logger.error(
      `Error deleting campaign role with campaignId=${campaignId} and walletAddress=${walletAddress}: ` + err
    );
    throw new Error('Could not delete campaign role');
  }
}


export async function getAdvertiserUserForCampaign(
  campaignId: string
): Promise<User | null> {
  try {
    // 1) Fetch the ADVERTISER CampaignRole, including wallet & user
    const role = await campaignRoleRepository().findOne({
      where: {
        campaignId,
        role: RoleType.ADVERTISER,
      },
      relations: ['wallet', 'wallet.user'],
    });

    if (!role) {
      return null; // No advertiser found for this campaign
    }

    // 2) The User is at role.wallet.user
    return role.wallet?.user || null;
  } catch (err) {
    Logger.error(`Error fetching advertiser (User) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve advertiser user');
  }
}


export async function getSingleAffiliateUserForCampaign(
  campaignId: string,
  affiliateId: number
): Promise<User | null> {
  try {
    // 1) Fetch the matching CampaignRole
    const role = await campaignRoleRepository().findOne({
      where: {
        campaignId,
        affiliateId,
        role: RoleType.AFFILIATE,
      },
      relations: ['wallet', 'wallet.user'],
    });

    if (!role) {
      return null; // No affiliate record found
    }

    // 2) Return the user from the nested relation
    return role.wallet?.user || null;
  } catch (err) {
    Logger.error(
      `Error fetching single affiliate (id=${affiliateId}) for campaign: ${campaignId}. ${err}`
    );
    throw new Error('Could not retrieve affiliate user');
  }
}

/**
 * Fetch affiliates for the specified campaign, with pagination.
 *
 * @param campaignId - The ID of the campaign to fetch affiliates from.
 * @param offset     - How many records to skip (e.g. 0, 100, etc.).
 * @param limit      - How many records to take (e.g. 100).
 * @returns          - An array of CampaignRole objects.
 */
export async function getAffiliateUsersForCampaignPaged(
  campaignId: string,
  offset = 0,
  limit = 100
): Promise<User[]> {
  try {
    // 1) Fetch all AFFILIATE roles in this campaign, with wallet+user
    const roles: CampaignRole[] = await campaignRoleRepository().find({
      where: {
        campaignId,
        role: RoleType.AFFILIATE,
      },
      relations: ['wallet', 'wallet.user'],
      skip: offset,
      take: limit,
    });

    // 2) Map each role to role.wallet?.user, filtering out any null
    const users = roles
      .map((role) => role.wallet?.user || null)
      .filter((user): user is User => user !== null);

    return users;
  } catch (err) {
    Logger.error(`Error fetching affiliate users (paged) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve affiliate users');
  }
}


/**
 * Fetch all affiliate roles by wallet address.
 *
 * @param tonAddress - The wallet address to search for.
 * @returns - An array of CampaignRole objects associated with the wallet address.
 */
export async function getAffiliatesByWallet(
  tonAddress: Address
): Promise<CampaignRole[]> {
  try {
    const repo = campaignRoleRepository();
    const walletAddress = tonAddress.toString();

    // Find all roles where the wallet address matches and the role is AFFILIATE
    const affiliates = await repo.find({
      where: {
        walletAddress: walletAddress,
        role: RoleType.AFFILIATE,
      },
      relations: ['campaign'], // Include the related campaign data if needed
    });

    return affiliates;
  } catch (err) {
    Logger.error(
      `Error fetching affiliates for wallet address: ${tonAddress}. ${err}`
    );
    throw new Error('Could not retrieve affiliates for wallet address');
  }
}


