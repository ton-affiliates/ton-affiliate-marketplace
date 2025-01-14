import appDataSource from '../ormconfig';
import { Campaign } from '../entity/Campaign';
import { Logger } from '../utils/Logger';

function campaignRepository() {
  return appDataSource.getRepository(Campaign);
}

export async function createCampaign(data: Partial<Campaign>): Promise<Campaign> {
  try {
    const repo = campaignRepository();
    const campaign = repo.create(data);
    return await repo.save(campaign);
  } catch (err) {
    Logger.error('Error creating campaign ' + err);
    throw new Error('Could not create campaign');
  }
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  try {
    return await campaignRepository().findOne({
      where: { id },
      relations: ['wallet'],
    });
  } catch (err) {
    Logger.error(`Error fetching campaign by ID: ${id}: ` + err);
    throw new Error('Could not retrieve campaign');
  }
}

/**
 * Get all campaigns for a given user (by userId).
 */
export async function getAllCampaignsForUser(userId: number): Promise<Campaign[]> {
  try {
    return await campaignRepository().find({
      where: {
        wallet: {
          userId: userId,
        },
      },
      relations: ['wallet'],
    });
  } catch (err) {
    Logger.error(`Error fetching campaigns for user: ${userId} ` + err);
    throw new Error('Could not retrieve campaigns');
  }
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
  try {
    const repo = campaignRepository();
    const campaign = await repo.findOneBy({ id });
    if (!campaign) return null;

    Object.assign(campaign, updates);
    return await repo.save(campaign);
  } catch (err) {
    Logger.error(`Error updating campaign: ${id} ` + err);
    throw new Error('Could not update campaign');
  }
}

export async function deleteCampaign(id: string): Promise<boolean> {
  try {
    const repo = campaignRepository();
    const result = await repo.delete({ id });
    return result.affected !== 0;
  } catch (err) {
    Logger.error(`Error deleting campaign: ${id} ` + err);
    throw new Error('Could not delete campaign');
  }
}
