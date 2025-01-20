import appDataSource from '../ormconfig';
import { Campaign } from '../entity/Campaign';
import { Logger } from '../utils/Logger';
import { CampaignRole, RoleType } from '../entity/CampaignRole';

function campaignRepository() {
  return appDataSource.getRepository(Campaign);
}

function campaignRoleRepository() {
  return appDataSource.getRepository(CampaignRole);
}

export async function upsertCampaign(data: Partial<Campaign>): Promise<Campaign> {
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
 * Fetch a single campaign AND find the advertiser address. 
 * Return a combined object with an extra `advertiserAddress` field.
 */
export async function getCampaignByIdWithAdvertiser(
  id: string
): Promise<(Campaign & { advertiserAddress?: string }) | null> {
  try {
    // 1) Get the campaign
    const campaign = await campaignRepository().findOne({ where: { id } });
    if (!campaign) {
      return null; // Not found
    }

    // 2) Find the CampaignRole for "advertiser"
    //    (assuming there's only one advertiser per campaign)
    const advertiserRole = await campaignRoleRepository().findOne({
      where: {
        campaignId: id,
        role: RoleType.ADVERTISER,
      },
    });

    // If the campaign has a photo in `assetPhoto`, convert it to base64
    let assetPhotoBase64: string | undefined = undefined;
    if (campaign.assetPhoto) {
      assetPhotoBase64 = Buffer.from(campaign.assetPhoto).toString('base64');
    }

    // 3) Attach it to the campaign result
    const campaignWithAdvertiser = {
      ...campaign,
      advertiserAddress: advertiserRole ? advertiserRole.walletAddress : undefined,
      assetPhotoBase64
    };

    return campaignWithAdvertiser;
  } catch (err) {
    Logger.error('Error fetching campaign with advertiser: ' + err);
    throw err;
  }
}

/**
 * Get all campaigns for a given wallet address.
 */
export async function getAllCampaignsForWallet(walletAddress: string): Promise<Campaign[]> {
  try {
    // 1) Find all campaign roles for this wallet address, loading the related Campaign
    const roles = await campaignRoleRepository().find({
      where: { walletAddress },
      relations: ['campaign'],
    });

    // 2) Extract the Campaign entities from these roles
    const campaigns = roles.map((role) => role.campaign);

    // 3) Remove duplicates if the same wallet has multiple roles in the same campaign
    const uniqueByCampaignId = new Map<string, Campaign>();
    campaigns.forEach((campaign) => {
      uniqueByCampaignId.set(campaign.id, campaign);
    });

    // 4) Return the unique Campaigns
    return Array.from(uniqueByCampaignId.values());
  } catch (err) {
    Logger.error(`Error fetching campaigns for wallet: ${walletAddress}\n` + err);
    throw new Error('Could not retrieve campaigns');
  }
}
