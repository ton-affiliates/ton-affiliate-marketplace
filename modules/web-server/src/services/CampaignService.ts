import { DataSource } from 'typeorm';
import { Campaign } from '../entity/Campaign';
import appDataSource from '../ormconfig';

function campaignRepository() {
  return appDataSource.getRepository(Campaign);
}

/**
 * Create a new Campaign
 */
export async function createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
  const repo = campaignRepository();
  const campaign = repo.create(campaignData); // create an instance with partial data
  return repo.save(campaign);                 // insert into DB
}

/**
 * Find a Campaign by its blockchain ID
 */
export async function getCampaignById(campaignId: string): Promise<Campaign | null> {
  return campaignRepository().findOneBy({ id: campaignId });
}

/**
 * Update a Campaign (e.g. update title, description, etc.)
 */
export async function updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign | null> {
  const repo = campaignRepository();
  const campaign = await repo.findOneBy({ id: campaignId });
  if (!campaign) {
    return null;
  }
  Object.assign(campaign, updates); // merges new data into existing entity
  return repo.save(campaign);
}

/**
 * Delete a Campaign
 */
export async function deleteCampaign(campaignId: string): Promise<boolean> {
  const repo = campaignRepository();
  const result = await repo.delete({ id: campaignId });
  return result.affected !== 0;
}
