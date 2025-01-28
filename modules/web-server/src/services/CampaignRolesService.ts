// src/services/CampaignRolesService.ts

import appDataSource from '../ormconfig';
import { Logger } from '../utils/Logger';
import { CampaignRole, RoleType } from '../entity/CampaignRole';
import { Address } from '@ton/core';
import { User } from '../entity/User';

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

    // Build the partial data object
    const roleData: Partial<CampaignRole> = {
      campaignId: data.campaignId,
      walletAddress,
      role: data.role,
      affiliateId: data.affiliateId,
    };

    const roleEntity = repo.create(roleData);
    return await repo.save(roleEntity);
  } catch (err) {
    Logger.error('Error creating campaign role ' + err);
    throw new Error('Could not create campaign role');
  }
}

/**
 * Delete an AFFILIATE campaign role by campaign ID & wallet address
 */
export async function deleteCampaignRoleByCampaignAndWallet(
  campaignId: string,
  walletAddress: string
): Promise<boolean> {
  try {
    const repo = campaignRoleRepository();
    const result = await repo.delete({
      campaignId,
      walletAddress,
      role: RoleType.AFFILIATE,
    });
    return result.affected !== 0;
  } catch (err) {
    Logger.error(
      `Error deleting campaign role with campaignId=${campaignId} ` +
      `and walletAddress=${walletAddress}: ${err}`
    );
    throw new Error('Could not delete campaign role');
  }
}

/**
 * Fetch the ADVERTISER's users for a given campaign.
 * Because one "advertiser" wallet could have multiple user accounts,
 * we return an array of Users (could be empty).
 */
export async function getAdvertiserUsersForCampaign(
  campaignId: string
): Promise<User[]> {
  try {
    const repo = campaignRoleRepository();
    // Find the CampaignRole with role=ADVERTISER for that campaign
    // and load wallet + wallet.users
    const advertiserRole = await repo.findOne({
      where: { campaignId, role: RoleType.ADVERTISER },
      relations: ['wallet', 'wallet.users'],
    });
    if (!advertiserRole || !advertiserRole.wallet) {
      return [];
    }
    // Return all users linked to that wallet
    return advertiserRole.wallet.users ?? [];
  } catch (err) {
    Logger.error(`Error fetching advertiser (Users) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve advertiser users');
  }
}

/**
 * Fetch all users for a given affiliateId in a campaign.
 * Because the wallet for this affiliate could be linked to many users,
 * we return an array of them.
 */
export async function getAffiliateUsersForCampaign(
  campaignId: string,
  affiliateId: number
): Promise<User[]> {
  try {
    const repo = campaignRoleRepository();
    const role = await repo.findOne({
      where: {
        campaignId,
        affiliateId,
        role: RoleType.AFFILIATE,
      },
      relations: ['wallet', 'wallet.users'],
    });
    if (!role || !role.wallet) {
      return [];
    }
    return role.wallet.users ?? [];
  } catch (err) {
    Logger.error(`Error fetching affiliate (id=${affiliateId}) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve affiliate users');
  }
}


export async function getAffiliateUsersForCampaignPaged(
  campaignId: string,
  offset = 0,
  limit = 100
): Promise<User[]> {
  try {
    const repo = campaignRoleRepository();
    const roles = await repo.find({
      where: {
        campaignId,
        role: RoleType.AFFILIATE,
      },
      relations: ['wallet', 'wallet.users'],
      skip: offset,
      take: limit,
    });

    // Flatten all wallet.users across these roles
    const allUsers: User[] = [];
    for (const role of roles) {
      if (role.wallet?.users) {
        allUsers.push(...role.wallet.users);
      }
    }
    return allUsers;
  } catch (err) {
    Logger.error(`Error fetching affiliate users (paged) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve affiliate users');
  }
}

/**
 * Return an array of *CampaignRole* (including affiliateId) for a campaign,
 * with pagination. We load wallet.users as well, so you can see which users
 * are behind each wallet. The front-end can pick out the user array from
 * `role.wallet.users`.
 */
export async function getAffiliateRolesForCampaignPaged(
  campaignId: string,
  offset = 0,
  limit = 100
): Promise<CampaignRole[]> {
  try {
    const repo = campaignRoleRepository();
    return await repo.find({
      where: {
        campaignId,
        role: RoleType.AFFILIATE,
      },
      skip: offset,
      take: limit,
      relations: ['wallet', 'wallet.users'],
    });
  } catch (err) {
    Logger.error(`Error fetching affiliate roles (paged) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve affiliate roles');
  }
}

/**
 * Find all AFFILIATE roles for a given wallet address
 * (the wallet could be linked to multiple campaigns).
 */
export async function getAffiliatesByWallet(
  tonAddress: Address
): Promise<CampaignRole[]> {
  try {
    const repo = campaignRoleRepository();
    const walletAddress = tonAddress.toString();

    // For AFFILIATE roles that match this wallet address
    const affiliates = await repo.find({
      where: {
        walletAddress,
        role: RoleType.AFFILIATE,
      },
      // load 'campaign' if you want info about the campaign
      relations: ['campaign'],
    });
    return affiliates;
  } catch (err) {
    Logger.error(`Error fetching affiliates for wallet address: ${tonAddress}. ${err}`);
    throw new Error('Could not retrieve affiliates for wallet address');
  }
}
