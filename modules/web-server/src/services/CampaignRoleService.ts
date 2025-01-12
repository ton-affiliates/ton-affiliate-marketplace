import appDataSource from '../ormconfig';
import { CampaignRole } from '../entity/CampaignRole';
import { Logger } from '../utils/Logger';

function campaignRoleRepository() {
  return appDataSource.getRepository(CampaignRole);
}

export async function createCampaignRole(data: Partial<CampaignRole>): Promise<CampaignRole> {
  try {
    const repo = campaignRoleRepository();
    const role = repo.create(data);
    return await repo.save(role);
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
        role: 'ADVERTISER',
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
        role: 'AFFILIATE',
      },
      relations: ['campaign', 'wallet'],
    });
  } catch (err) {
    Logger.error(`Error fetching affiliates for campaign: ${campaignId} ` + err);
    throw new Error('Could not retrieve affiliates');
  }
}

export async function updateCampaignRole(id: number, updates: Partial<CampaignRole>): Promise<CampaignRole | null> {
  try {
    const repo = campaignRoleRepository();
    const role = await repo.findOneBy({ id });
    if (!role) return null;

    Object.assign(role, updates);
    return await repo.save(role);
  } catch (err) {
    Logger.error(`Error updating campaign role: ${id} ` + err);
    throw new Error('Could not update campaign role');
  }
}

export async function deleteCampaignRole(id: number): Promise<boolean> {
  try {
    const repo = campaignRoleRepository();
    const result = await repo.delete({ id });
    return result.affected !== 0;
  } catch (err) {
    Logger.error(`Error deleting campaign role: ${id} ` + err);
    throw new Error('Could not delete campaign role');
  }
}
