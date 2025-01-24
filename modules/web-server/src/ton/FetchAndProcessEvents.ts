import { saveLastProcessedLt, getLastProcessedLt } from '../services/ProcessedOffsetsService';
import { getLatestEvents, EmitLogEvent } from './ListenToEvents';
import { wss } from '../App';
import { Logger } from '../utils/Logger';
import { createEventEntity } from '../services/EventsService';
import { upsertCampaign } from '../services/CampaignsService';
import {
  createCampaignRole,
  updateCampaignRoleByCampaignAndWalletAddress,
  deleteCampaignRoleByCampaignAndWallet,
} from '../services/CampaignRolesService';
import { sendTelegramMessage } from '../services/TelegramService';
import { getUserByWalletAddress } from '../services/UsersService';
import { createNotification } from '../services/NotificationsService';
import { RoleType } from '../entity/CampaignRole';
import { Address } from '@ton/core';

// Helper to handle BigInts in the event data
function bigintReplacer(_: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

/**
 * Convert a raw object { workChain: number; hash: { data: number[] } }
 * into a real TON Address instance for logging & DB usage.
 */
function translateRawAddress(rawAddress: {
  workChain: number;
  hash: { type: string; data: number[] };
}): Address {
  const { workChain, hash } = rawAddress;
  const hashBuffer = Buffer.from(hash.data);
  return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
}

async function processEvents(events: EmitLogEvent[]) {
  for (const event of events) {
    try {
      Logger.info(`Processing event of type ${event.type}: `);

      // Convert event.data to a normal object (no BigInts)
      const payload = JSON.parse(
        JSON.stringify(event.data, (_, val) => (typeof val === 'bigint' ? val.toString() : val))
      );

      // 1) Save the event record in DB
      await createEventEntity(event.type, payload, event.createdLt?.toString());

      // 2) Switch on the event type
      switch (event.type) {
        //
        // 1. CampaignCreatedEvent
        //
        case 'CampaignCreatedEvent': {
          // Tact says: { campaignId, advertiser, campaignContractAddress }
          const { campaignId, advertiser, campaignContractAddress } = payload;

          // Convert to TON Address
          const advertiserTon = translateRawAddress(advertiser);
          const campaignContractTon = translateRawAddress(campaignContractAddress);

          Logger.info(
            `[CampaignCreatedEvent] - campaignId: ${campaignId}, ` +
            `advertiser: ${advertiserTon.toString()}, ` +
            `campaignContractAddress: ${campaignContractTon.toString()}`
          );

          // 1a) update campaign
          await upsertCampaign({
            id: campaignId,
            isEmpty: true,
          });

          // 1b) Create a new "advertiser" role
          await createCampaignRole({
            campaignId: campaignId,
            tonAddress: advertiserTon,
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
          // Tact says: { campaignId, advertiser }
          const { campaignId, advertiser } = payload;
          const advertiserTon = translateRawAddress(advertiser);

          Logger.info(
            `[AdvertiserSignedCampaignDetailsEvent] - campaignId: ${campaignId}, advertiser: ${advertiserTon.toString()}`
          );

          await upsertCampaign({
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
          // Tact says: { campaignId, advertiser, affiliateId, affiliate, state }
          const { campaignId, advertiser, affiliateId, affiliate, state } = payload;

          const advertiserTon = translateRawAddress(advertiser);
          const affiliateTon = translateRawAddress(affiliate);

          Logger.info(
            `[AffiliateCreatedEvent] - campaignId: ${campaignId}, ` +
            `advertiser: ${advertiserTon.toString()}, ` +
            `affiliateId: ${affiliateId}, affiliateAddress: ${affiliateTon.toString()}, state: ${state}`
          );

          // state=0 => affiliate active, state=1 => affiliate pending approval
          await createCampaignRole({
            campaignId,
            tonAddress: affiliateTon,
            role: RoleType.AFFILIATE,
            affiliateId: affiliateId,
            isActive: state == 0 ? true : false,
          });

          if (state == 0n) {
            // Active affiliate => broadcast to all clients
            Logger.info('Broadcasting AffiliateCreatedEvent to all clients');
            wss.clients.forEach((client) => {
              if (client.readyState === 1) {
                client.send(
                  JSON.stringify(
                    {
                      type: 'AffiliateCreatedEvent',
                      data: event.data,
                    },
                    bigintReplacer
                  )
                );
              }
            });
          } else {
            // state=1 => affiliate pending approval -> notify the advertiser
            const advertiserUser = await getUserByWalletAddress(advertiserTon);
            if (!advertiserUser) {
              throw new Error('No User found for address: ' + advertiserTon.toString());
            }

            const affiliateUser = await getUserByWalletAddress(affiliateTon);
            if (!affiliateUser) {
              throw new Error('No User found for address: ' + affiliateTon.toString());
            }

            const text = `Affiliate [${affiliateUser.telegramUsername}](tg://user?id=${affiliateUser.id}) asked to join campaign:
              https://${process.env.MINI_APP_HOSTNAME}/${campaignId} as a new affiliate with id: ${affiliateId} `;

            await createNotification(advertiserTon, text, campaignId.toString());
            await sendTelegramMessage(advertiserUser.id, text, 'Markdown');
          }
          break;
        }

        //
        // 4. AdvertiserApprovedAffiliateEvent
        //
        case 'AdvertiserApprovedAffiliateEvent': {
          // Tact says: { campaignId, advertiser, affiliateId, affiliate }
          const { campaignId, advertiser, affiliateId, affiliate } = payload;

          const advertiserTon = translateRawAddress(advertiser);
          const affiliateTon = translateRawAddress(affiliate);

          Logger.info(
            `[AdvertiserApprovedAffiliateEvent] - campaignId: ${campaignId}, ` +
            `advertiser: ${advertiserTon.toString()}, affiliateId: ${affiliateId}, ` +
            `affiliate: ${affiliateTon.toString()}`
          );

          // 4a) Mark or update the affiliate’s campaign role to “active.”
          await updateCampaignRoleByCampaignAndWalletAddress(campaignId.toString(), affiliateTon, {
            affiliateId: affiliateId,
            role: RoleType.AFFILIATE,
            isActive: true,
          });

          // 4b) Notify the affiliate
          const affiliateUser = await getUserByWalletAddress(affiliateTon);
          if (affiliateUser) {
            const text = `Congratulations! You have been approved for campaign https://${process.env.MINI_APP_HOSTNAME}/${campaignId}.`;
            await createNotification(affiliateTon, text, campaignId.toString());
            await sendTelegramMessage(affiliateUser.id, text);
          }

          break;
        }

        //
        // 5. AdvertiserRemovedAffiliateEvent
        //
        case 'AdvertiserRemovedAffiliateEvent': {
          // Tact says: { campaignId, advertiser, affiliateId, affiliate }
          const { campaignId, advertiser, affiliateId, affiliate } = payload;

          const advertiserTon = translateRawAddress(advertiser);
          const affiliateTon = translateRawAddress(affiliate);

          Logger.info(
            `[AdvertiserRemovedAffiliateEvent] - campaignId: ${campaignId}, advertiser: ${advertiserTon.toString()}, ` +
            `affiliateId: ${affiliateId}, affiliate: ${affiliateTon.toString()}`
          );

          // Remove or disable the affiliate’s role
          const deleted = await deleteCampaignRoleByCampaignAndWallet(
            campaignId.toString(),
            affiliateTon.toString()
          );

          if (deleted) {
            Logger.info(
              `Deleted campaign role for affiliate ${affiliateId} in campaign https://${process.env.MINI_APP_HOSTNAME}/${campaignId}`
            );
          } else {
            Logger.warn(
              `No campaign role found for affiliate ${affiliateId} in campaign ${campaignId} to delete.`
            );
          }

          // Notify the affiliate
          const affiliateUser = await getUserByWalletAddress(affiliateTon);
          if (affiliateUser) {
            const text = `You have been removed from campaign ${campaignId}.`;
            await createNotification(affiliateTon, text, campaignId.toString());
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

      const maxLt = events.reduce((max, e) => (e.createdLt > max ? e.createdLt : max), lastProcessedLt);
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
