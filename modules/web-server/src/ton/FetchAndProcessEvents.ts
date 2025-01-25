// src/blockchain/processBlockchainEvents.ts (full file)

import { saveLastProcessedLt, getLastProcessedLt } from '../services/ProcessedOffsetsService';
import { getLatestEvents, EmitLogEvent } from './ListenToEvents';
import { wss } from '../App';
import { Logger } from '../utils/Logger';
import { createEventEntity } from '../services/EventsService';
import { upsertCampaign } from '../services/CampaignsService';
import {
  createCampaignRole,
  deleteCampaignRoleByCampaignAndWallet,
} from '../services/CampaignRolesService';
import { sendTelegramMessage } from '../services/TelegramService';
import { getUserByWalletAddress } from '../services/UsersService';
import { createNotification } from '../services/NotificationsService';
import { RoleType } from '../entity/CampaignRole';
import { Address } from '@ton/core';
import { CampaignState } from '../entity/Campaign';

// Helper for BigInt serialization
function bigintReplacer(_: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

/**
 * Convert raw address data into a TON Address instance.
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
        JSON.stringify(event.data, (_, val) =>
          typeof val === 'bigint' ? val.toString() : val
        )
      );

      // 1) Save the event record
      await createEventEntity(event.type, payload, event.createdLt?.toString());

      // 2) Switch on event type
      switch (event.type) {
        //
        // 1. CampaignCreatedEvent
        //
        case 'CampaignCreatedEvent': {
          const { campaignId, advertiser, campaignContractAddress } = payload;

          // Convert addresses
          const advertiserTon = translateRawAddress(advertiser);
          const campaignContractTon = translateRawAddress(campaignContractAddress);

          Logger.info(
            `[CampaignCreatedEvent] - campaignId: ${campaignId}, ` +
              `advertiser: ${advertiserTon.toString()}, ` +
              `campaignContractAddress: ${campaignContractTon.toString()}`
          );

          // upsert
          await upsertCampaign({
            id: campaignId,
            state: CampaignState.DEPLOYED,
          });

          // create advertiser role
          await createCampaignRole({
            campaignId,
            tonAddress: advertiserTon,
            role: RoleType.ADVERTISER,
          });

          // broadcast
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
          const { campaignId, advertiser } = payload;
          const advertiserTon = translateRawAddress(advertiser);

          Logger.info(
            `[AdvertiserSignedCampaignDetailsEvent] - campaignId: ${campaignId}, advertiser: ${advertiserTon}`
          );

          await upsertCampaign({
            id: campaignId,
            state: CampaignState.BLOCKCHAIN_DETAILS_SET,
          });

          Logger.info(
            `Campaign ${campaignId} is now BLOCKCHAIN_DETAILS_SET (advertiser signed).`
          );
          break;
        }

        //
        // 3. AffiliateCreatedEvent
        //
        case 'AffiliateCreatedEvent': {
          const { campaignId, advertiser, affiliateId, affiliate, state } = payload;
          const advertiserTon = translateRawAddress(advertiser);
          const affiliateTon = translateRawAddress(affiliate);

          Logger.info(
            `[AffiliateCreatedEvent] - campaignId: ${campaignId}, ` +
              `advertiser: ${advertiserTon}, ` +
              `affiliateId: ${affiliateId}, affiliateAddress: ${affiliateTon}, state: ${state}`
          );

          // create AFFILIATE role
          await createCampaignRole({
            campaignId,
            tonAddress: affiliateTon,
            role: RoleType.AFFILIATE,
            affiliateId: affiliateId,
          });

          // broadcast
          Logger.info('Broadcasting AffiliateCreatedEvent');
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

          // if pending approval => notify advertiser
          const advertiserUser = await getUserByWalletAddress(advertiserTon);
          if (!advertiserUser) {
            throw new Error(
              'No User found for advertiser address: ' + advertiserTon.toString()
            );
          }

          const base = (process.env.MINI_APP_HOSTNAME ?? '').replace(/\/+$/, '');
          const affiliateLink = `https://${base}/campaign/${campaignId}/affiliate/${affiliateId}`;

          let text: string;
          if (state === 0) {
            text = `Affiliate asked to join campaign:\n${affiliateLink}\nas a new affiliate.`;
          } else {
            text = `An affiliate (ID: ${affiliateId}) joined campaign:\n${affiliateLink}\nas a new affiliate.`;
          }

          // pass link to createNotification, so your UI can click it
          await createNotification(advertiserTon, text, campaignId.toString(), affiliateLink);
          await sendTelegramMessage(advertiserUser.id, text, 'Markdown');

          break;
        }

        //
        // 4. AdvertiserApprovedAffiliateEvent
        //
        case 'AdvertiserApprovedAffiliateEvent': {
          const { campaignId, advertiser, affiliateId, affiliate } = payload;
          const advertiserTon = translateRawAddress(advertiser);
          const affiliateTon = translateRawAddress(affiliate);

          Logger.info(
            `[AdvertiserApprovedAffiliateEvent] - campaignId: ${campaignId}, ` +
              `advertiser: ${advertiserTon}, affiliateId: ${affiliateId}, affiliate: ${affiliateTon}`
          );

          // notify affiliate
          const affiliateUser = await getUserByWalletAddress(affiliateTon);
          if (affiliateUser) {
            const text = `Congratulations! You have been approved for campaign:\n` +
              `https://${process.env.MINI_APP_HOSTNAME}/${campaignId}`;
            const link = `https://${process.env.MINI_APP_HOSTNAME}/${campaignId}/affiliate/${affiliateId}`;

            await createNotification(affiliateTon, text, campaignId.toString(), link);
            await sendTelegramMessage(affiliateUser.id, text);
          }
          break;
        }

        //
        // 5. AdvertiserRemovedAffiliateEvent
        //
        case 'AdvertiserRemovedAffiliateEvent': {
          const { campaignId, advertiser, affiliateId, affiliate } = payload;
          const advertiserTon = translateRawAddress(advertiser);
          const affiliateTon = translateRawAddress(affiliate);

          Logger.info(
            `[AdvertiserRemovedAffiliateEvent] - campaignId: ${campaignId}, ` +
              `advertiser: ${advertiserTon}, affiliateId: ${affiliateId}, affiliate: ${affiliateTon}`
          );

          // remove AFFILIATE role
          const deleted = await deleteCampaignRoleByCampaignAndWallet(
            campaignId.toString(),
            affiliateTon.toString()
          );

          if (deleted) {
            Logger.info(
              `Deleted campaign role for affiliate ${affiliateId} in campaign ${campaignId}`
            );
          } else {
            Logger.warn(
              `No campaign role found for affiliate ${affiliateId} in campaign ${campaignId}`
            );
          }

          // notify affiliate
          const affiliateUser = await getUserByWalletAddress(affiliateTon);
          if (affiliateUser) {
            const text = `You have been removed from campaign ${campaignId}.`;
            const link = `https://${process.env.MINI_APP_HOSTNAME}/${campaignId}`;

            await createNotification(affiliateTon, text, campaignId.toString(), link);
            await sendTelegramMessage(affiliateUser.id, text);
          }
          break;
        }

        default:
          Logger.info(`No specific handling for event type ${event.type}`);
      }
    } catch (error) {
      Logger.error(
        `Error for event: ${JSON.stringify(event, bigintReplacer, 2)}. ` +
          `Error: ${
            error instanceof Error ? error.message : error
          }. Stack: ${
            error instanceof Error ? error.stack : 'No stack trace available.'
          }`
      );
    }
  }
};

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
      Logger.error(
        'Error fetching or processing events: ' + error.message + '. ST: ' + error.stack
      );
    } else {
      Logger.error('Unknown error: ' + JSON.stringify(error));
    }
  }
};
