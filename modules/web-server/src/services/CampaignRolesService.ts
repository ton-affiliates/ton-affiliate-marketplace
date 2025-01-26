// src/services/CampaignRolesService.ts

import appDataSource from '../ormconfig';
import { Logger } from '../utils/Logger';
import { CampaignRole, RoleType } from '../entity/CampaignRole';
import { Address } from '@ton/core';
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

    // Build the partial data object
    const roleData: Partial<CampaignRole> = {
      campaignId: data.campaignId,
      walletAddress,
      role: data.role,
      affiliateId: data.affiliateId ?? undefined,
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
    // we can only delete affiliates (never an advertiser)
    const repo = campaignRoleRepository();
    const result = await repo.delete({
      campaignId,
      walletAddress,
      role: RoleType.AFFILIATE,
    });
    return result.affected !== 0;
  } catch (err) {
    Logger.error(
      `Error deleting campaign role with campaignId=${campaignId} and walletAddress=${walletAddress}: ` + err
    );
    throw new Error('Could not delete campaign role');
  }
}

/**
 * Fetch the ADVERTISER's user for a given campaign, if any
 */
export async function getAdvertiserUserForCampaign(
  campaignId: string
): Promise<User | null> {
  try {
    const repo = campaignRoleRepository();
    const role = await repo.findOne({
      where: { campaignId, role: RoleType.ADVERTISER },
      relations: ['wallet', 'wallet.user'],
    });
    if (!role) return null;
    return role.wallet?.user || null;
  } catch (err) {
    Logger.error(`Error fetching advertiser (User) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve advertiser user');
  }
}

/**
 * Fetch a single affiliate's user in a campaign by affiliateId
 */
export async function getSingleAffiliateUserForCampaign(
  campaignId: string,
  affiliateId: number
): Promise<User | null> {
  try {
    const repo = campaignRoleRepository();
    const role = await repo.findOne({
      where: {
        campaignId,
        affiliateId,
        role: RoleType.AFFILIATE,
      },
      relations: ['wallet', 'wallet.user'],
    });
    if (!role) return null;
    return role.wallet?.user || null;
  } catch (err) {
    Logger.error(`Error fetching affiliate (id=${affiliateId}) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve affiliate user');
  }
}

/**
 * [LEGACY] Returns an array of "User" objects, ignoring affiliateId
 * This is why your front end had no affiliateId previously.
 * Keep it only if you still need user-based results somewhere else.
 */
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
      relations: ['wallet', 'wallet.user'],
      skip: offset,
      take: limit,
    });

    // Transform from CampaignRole => just the "User" portion
    const users = roles
      .map((role) => role.wallet?.user || null)
      .filter((u): u is User => u !== null);

    return users;
  } catch (err) {
    Logger.error(`Error fetching affiliate users (paged) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve affiliate users');
  }
}

/**
 * Return an array of CampaignRole (including affiliateId) for a campaign,
 * with pagination. This is what you want to return to the front end.
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
      relations: ['wallet', 'wallet.user'],
    });
  } catch (err) {
    Logger.error(`Error fetching affiliate roles (paged) for campaign: ${campaignId}. ${err}`);
    throw new Error('Could not retrieve affiliate roles');
  }
}

/**
 * Find all affiliates for a given wallet address
 */
export async function getAffiliatesByWallet(
  tonAddress: Address
): Promise<CampaignRole[]> {
  try {
    const repo = campaignRoleRepository();
    const walletAddress = tonAddress.toString();

    const affiliates = await repo.find({
      where: {
        walletAddress,
        role: RoleType.AFFILIATE,
      },
      relations: ['campaign'],
    });
    return affiliates;
  } catch (err) {
    Logger.error(`Error fetching affiliates for wallet address: ${tonAddress}. ${err}`);
    throw new Error('Could not retrieve affiliates for wallet address');
  }
}
