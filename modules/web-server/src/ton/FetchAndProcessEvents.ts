import { saveLastProcessedLt, getLastProcessedLt } from '../services/ProcessedOffsetsService';
import { getLatestEvents, EmitLogEvent } from './ListenToEvents';
import { wss } from '../App';
import { Logger } from '../utils/Logger';
import { createEventEntity } from '../services/EventsService';
import { createCampaign } from '../services/CampaignsService';
import { createCampaignRole, deleteCampaignRoleByCampaignAndWallet } from '../services/CampaignRolesService';
import { sendTelegramMessage } from '../services/TelegramService';
import { getUserByWalletAddress } from '../services/UsersService';
import { createNotification } from '../services/NotificationsService'
import { RoleType } from '../entity/CampaignRole';

// Helper to handle BigInts in the event data
function bigintReplacer(_: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

async function processEvents(events: EmitLogEvent[]) {
  for (const event of events) {
    
    try {

      Logger.info(`Processing event of type ${event.type}: `);

      // Convert event.data to a normal object (no BigInts)
      const payload = JSON.parse(
        JSON.stringify(event.data, (_, val) => (typeof val === 'bigint' ? val.toString() : val))
      );

      // Save the event record
      await createEventEntity(event.type, payload, event.createdLt?.toString());    

      switch (event.type) {
        //
        // 1. CampaignCreatedEvent
        //
        case 'CampaignCreatedEvent': {

          const { campaignId, advertiserAddress } = payload;

          // 1a) Create or update a new "empty" campaign
          await createCampaign({
            id: campaignId,
            isEmpty: true,
          });

          // 1b) Create a new "advertiser" role
          await createCampaignRole({
            campaignId: campaignId,
            walletAddress: advertiserAddress.toString(),
            role: RoleType.ADVERTISER,
          });

          // 1c) Broadcast to all clients
          Logger.info('Broadcasting CampaignCreatedEvent to all clients');
          wss.clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(
                JSON.stringify(
                  {
                    type: 'CampaignCreatedEvent',
                    data: event.data,
                  },
                  bigintReplacer
                )
              );
            }
          });
          break;
        }

        //
        // 2. AdvertiserSignedCampaignDetailsEvent
        //
        case 'AdvertiserSignedCampaignDetailsEvent': {

          const { campaignId, _ } = payload;

          // update campaign
          await createCampaign({
            id: campaignId,
            isEmpty: false,
          });

          Logger.info(`Campaign ${campaignId} is now marked isEmpty=false (signed by advertiser).`);
          break;
        }

        //
        // 3. AffiliateCreatedEvent
        //
        case 'AffiliateCreatedEvent': {
          const { campaignId, advertiserAddress, affiliateId, affiliateAddress, state } = payload;
          // state=0 => affiliate active, state=1 => affiliate pending approval
        
          await createCampaignRole({
            campaignId,
            walletAddress: affiliateAddress.toString(),
            role: RoleType.AFFILIATE,
            affiliateId: affiliateId,
            isActive: state == 0 ? true : false
          });
        
          if (state == 0n) {
            // Active affiliate => broadcast wss
            Logger.info('Broadcasting AffiliateCreatedEvent to all clients');
            wss.clients.forEach((client) => {
              if (client.readyState === 1) {
                client.send(
                  JSON.stringify({
                    type: 'AffiliateCreatedEvent',
                    data: event.data,
                  },
                  bigintReplacer)
                );
              }
            });
          } else {
            
            const advertiser = await getUserByWalletAddress(advertiserAddress.toString());
            if (!advertiser) {
              throw new Error('No User found for address: ' + advertiserAddress);
            }

            const affiliate = await getUserByWalletAddress(affiliateAddress.toString());
            if (!affiliate) {
              throw new Error('No User found for address: ' + affiliateAddress);
            }

            const text = `Affiliate [${affiliate.telegramUsername}](tg://user?id=${affiliate.id}) asked to join campaign:
              https://${process.env.MINI_APP_HOSTNAME}/${campaignId} as a new affiliate with id: ${affiliateId} `;          
            
            await createNotification(advertiser.id, text, campaignId.toString());
            await sendTelegramMessage(advertiser.id, text, 'Markdown');
          }
          break;
        }

         // 4. AdvertiserApprovedAffiliateEvent
        case 'AdvertiserApprovedAffiliateEvent': {
          // Suppose your event data includes:
          // { campaignId, advertiser, affiliateId, affiliate, ... }
          const { campaignId, affiliateId, affiliate } = payload;

          // 4a) Mark or update the affiliate’s campaign role to “active.”
          // If you track isActive or isEmpty in your DB, do something like:
          await createCampaignRole({
            campaignId: campaignId.toString(),
            walletAddress: affiliate.toString(),
            affiliateId: affiliateId,
            role: RoleType.AFFILIATE,
            isActive: true,       // Now they are approved/active
          });

          // 4b) Notify the affiliate
          const affiliateUser = await getUserByWalletAddress(affiliate.toString());
          if (affiliateUser) {
            const text = `Congratulations! You have been approved for campaign https://${process.env.MINI_APP_HOSTNAME}/${campaignId}.`;
            await createNotification(affiliateUser.id, text, campaignId.toString());
            await sendTelegramMessage(affiliateUser.id, text);
          }

          break;
        }

        // 5. AdvertiserRemovedAffiliateEvent
        case 'AdvertiserRemovedAffiliateEvent': {
          // Suppose your event data includes:
          // { campaignId, advertiser, affiliateId, affiliate }
          const { campaignId, affiliateId, affiliate } = payload;

          // 5a) Remove or disable the affiliate’s role in `campaign_roles`.
          const deleted = await deleteCampaignRoleByCampaignAndWallet(
            campaignId.toString(),
            affiliate.toString()
          );
        
          if (deleted) {
            Logger.info(`Deleted campaign role for affiliate ${affiliateId} in campaign https://${process.env.MINI_APP_HOSTNAME}/${campaignId}`);
          } else {
            Logger.warn(
              `No campaign role found for affiliate ${affiliateId} in campaign ${campaignId} to delete.`
            );
          }


          // 5b) Notify the affiliate
          const affiliateUser = await getUserByWalletAddress(affiliate.toString());
          if (affiliateUser) {
            const text = `You have been removed from campaign ${campaignId}.`;
            await createNotification(affiliateUser.id, text, campaignId.toString());
            await sendTelegramMessage(affiliateUser.id, text);
          }

          break;
        }
      

        //
        // Other events...
        //
        default:
          Logger.info(`No specific handling for event type ${event.type}`);

    }

    } catch (error) {
      Logger.error(
        `Error for event: ${JSON.stringify(event, bigintReplacer, 2)}. ` +
        `Error: ${error instanceof Error ? error.message : error}. ` +
        `Stack: ${error instanceof Error ? error.stack : 'No stack trace available.'}`
      );
    }
  }
}

export const processBlockchainEvents = async (): Promise<void> => {
  try {
    const lastProcessedLt = await getLastProcessedLt();
    Logger.debug('Last Processed LT:' + lastProcessedLt);

    const events: EmitLogEvent[] = await getLatestEvents(lastProcessedLt);
    if (events.length > 0) {
      await processEvents(events);

      const maxLt = events.reduce(
        (max, e) => (e.createdLt > max ? e.createdLt : max),
        lastProcessedLt
      );
      await saveLastProcessedLt(maxLt);
      Logger.debug('Updated Last Processed LT:' + maxLt);
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error('Error fetching or processing events: ' + error.message + '. ST: ' + error.stack);
    } else {
      Logger.error('Unknown error: ' + JSON.stringify(error));
    }
  }
};
