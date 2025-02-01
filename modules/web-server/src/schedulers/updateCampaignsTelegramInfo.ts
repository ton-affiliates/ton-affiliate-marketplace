// src/schedulers/updateCampaignsTelegramInfo.ts

import { Logger } from '../utils/Logger';
import { fetchChatInfo } from '../services/TelegramService';
import { ensureCampaign } from '../services/CampaignsService';
import appDataSource from '../ormconfig';
import { Campaign } from '../entity/Campaign';

/**
 * Helper function that extracts a Telegram handle from an invite link.
 * E.g. "https://t.me/MyPublicChannel" => "MyPublicChannel"
 */
function parseHandleFromLink(link: string): string {
  const match = link.match(/t\.me\/([^/]+)/i);
  if (match && match[1]) return match[1];
  return link;
}

/**
 * Updates Telegram asset information for all campaigns in the DB.
 * For each campaign, it:
 *   1. Extracts the Telegram handle from the invite link.
 *   2. Fetches updated chat info (TelegramAsset) via the Telegram API.
 *   3. Updates the campaign's fields accordingly.
 */
export async function updateCampaignsTelegramInfo(): Promise<void> {
  try {
    // Get the repository for Campaign
    const campaignRepo = appDataSource.getRepository(Campaign);
    
    // Fetch all campaigns from the DB
    const campaigns = await campaignRepo.find();
    Logger.info(`Found ${campaigns.length} campaigns to update Telegram info.`);
    
    for (const campaign of campaigns) {
      try {
        if (!campaign.inviteLink) {
          Logger.warn(`Campaign ${campaign.id} has no inviteLink. Skipping update.`);
          continue;
        }

        // Extract Telegram handle from the invite link
        const handle = parseHandleFromLink(campaign.inviteLink);
        Logger.info(`Updating campaign ${campaign.id} using handle "${handle}"`);

        let telegramAsset;
        try {
          // Attempt to fetch updated Telegram asset info
          telegramAsset = await fetchChatInfo(handle);
          Logger.info(`Fetched Telegram asset: ${JSON.stringify(telegramAsset)}`);
        } catch (error: any) {
          // If fetchChatInfo fails—likely due to bot not being admin—log a warning
          Logger.error(
            `Failed to fetch chat info for handle: ${handle}. ` +
            `Assuming bot is not admin. Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`
          );
          // Construct fallback asset info (using current campaign values for non-updateable fields)
          telegramAsset = {
            id: 0, // dummy value; not used here
            name: campaign.assetName, // keep the existing asset name
            description: campaign.assetDescription, // keep current description
            type: 'channel', // assuming channel; adjust if needed
            isPublic: true,
            url: campaign.inviteLink, // keep the same invite link
            photo: campaign.assetPhoto, // keep current photo
            botIsAdmin: false,
            adminPrivileges: [],
            memberCount: campaign.memberCount // keep existing member count
          };
        }

        // Update campaign fields based on the (fetched or fallback) Telegram asset
        // Only update fields that are allowed to change from Telegram:
        campaign.assetName = telegramAsset.name;
        campaign.assetDescription = telegramAsset.description;
        campaign.assetPhoto = telegramAsset.photo ?? null;
        campaign.botIsAdmin = telegramAsset.botIsAdmin;
        campaign.adminPrivileges = telegramAsset.adminPrivileges;
        campaign.memberCount = telegramAsset.memberCount;
        // Optionally, update the invite link if Telegram returns a canonical URL:
        campaign.inviteLink = telegramAsset.url;

        // Save the updated campaign to the DB
        await campaignRepo.save(campaign);
        Logger.info(`Campaign ${campaign.id} updated successfully.`);
      } catch (innerError: any) {
        Logger.error(
          `Error updating campaign ${campaign.id}: ` +
          (innerError instanceof Error ? innerError.message : JSON.stringify(innerError))
        );
      }
    }
  } catch (error: any) {
    Logger.error(
      `Error updating campaigns Telegram info: ` +
      (error instanceof Error ? error.message : JSON.stringify(error))
    );
  }
}

/**
 * Schedule the update to run every 5 minutes.
 * You can call this function from your main app initialization code.
 */
export function scheduleCampaignUpdates(): void {
  // Run immediately once on startup
  updateCampaignsTelegramInfo();

  // Schedule to run every 10 minutes (600,000 milliseconds)
  setInterval(() => {
    Logger.info('Running periodic campaign Telegram info update...');
    updateCampaignsTelegramInfo();
  }, 10 * 60 * 1000);
}
