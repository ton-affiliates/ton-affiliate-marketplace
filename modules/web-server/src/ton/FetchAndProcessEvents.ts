// src/blockchain/processBlockchainEvents.ts
import { saveLastProcessedLt, getLastProcessedLt } from '../services/ProcessedOffsetsService';
import { getLatestEvents, EmitLogEvent } from './ListenToEvents';
import { Logger } from '../utils/Logger';
import { createEventEntity } from '../services/EventsService';
import { ensureCampaign } from '../services/CampaignsService';
import {
  createCampaignRole,
  deleteCampaignRoleByCampaignAndWallet,
} from '../services/CampaignRolesService';
import { sendTelegramMessage } from '../services/TelegramService';
import { getUsersByWalletAddress } from '../services/UsersService';
import { createNotification } from '../services/NotificationsService';
import { RoleType } from '../entity/CampaignRole';
import { Address } from '@ton/core';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { TonConfig } from '../config/TonConfig';
import { TonClient4 } from '@ton/ton';
import { Campaign } from '../contracts/Campaign';
import { getCampaignByIdWithAdvertiser } from '../services/CampaignsService';
import { CampaignApiResponse } from "@common/ApiResponses";
import { sseClients } from '../sseClients';

// Helper for BigInt serialization
function bigintReplacer(_: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

function sameElements(a: number[], b: number[]): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const value of setA) {
    if (!setB.has(value)) return false;
  }
  return true;
}

function translateRawAddress(rawAddress: {
  workChain: number;
  hash: { type: string; data: number[] };
}): Address {
  const { workChain, hash } = rawAddress;
  const hashBuffer = Buffer.from(hash.data);
  return Address.parseRaw(`${workChain}:${hashBuffer.toString('hex')}`);
}

async function processEvent(event: EmitLogEvent) {
  try {
    Logger.info(`Processing event of type ${event.type}: `);

    const payload = JSON.parse(
      JSON.stringify(event.data, (_, val) =>
        typeof val === 'bigint' ? val.toString() : val
      )
    );

    await createEventEntity(event.type, payload, event.createdLt?.toString());

    switch (event.type) {
      case 'CampaignCreatedEvent': {
        const { campaignId, advertiser, campaignContractAddress } = payload;
        const advertiserTon = translateRawAddress(advertiser);
        const campaignContractTon = translateRawAddress(campaignContractAddress);
        Logger.info(
          `[CampaignCreatedEvent] - campaignId: ${campaignId}, advertiser: ${advertiserTon.toString()}, campaignContractAddress: ${campaignContractTon.toString()}`
        );
        await ensureCampaign({
          id: campaignId,
          contractAddress: campaignContractTon.toString(),
        });
        await createCampaignRole({
          campaignId,
          tonAddress: advertiserTon,
          role: RoleType.ADVERTISER,
        });

        Logger.info('Broadcasting CampaignCreatedEvent to SSE clients');
        const sseMessage = `id: ${Date.now()}\n` +
          `data: ${JSON.stringify(
            { type: 'CampaignCreatedEvent', data: event.data },
            bigintReplacer
          )}\n\n`;

        // For new campaign events, broadcast to clients subscribed with type "newCampaign"
        sseClients.forEach(client => {
          if (client.type === 'newCampaign' || (!client.campaignId)) {
            client.res.write(sseMessage);
          }
        });
        break;
      }

      case 'AdvertiserSignedCampaignDetailsEvent': {
        try {
          Logger.info(`Received AdvertiserSignedCampaignDetailsEvent with payload: ${JSON.stringify(payload, bigintReplacer)}`);
          const { campaignId, advertiser } = payload;
          const advertiserTon = translateRawAddress(advertiser);
          Logger.debug(`[AdvertiserSignedCampaignDetailsEvent] - campaignId: ${campaignId}, advertiser (translated): ${advertiserTon}`);
          const campaignFromDB: CampaignApiResponse | null = await getCampaignByIdWithAdvertiser(campaignId);
          if (!campaignFromDB) {
            Logger.error('No such campaign in DB: ' + campaignId);
            throw new Error('No such campaign in DB: ' + campaignId);
          }
          Logger.debug(`Campaign details fetched from DB: ${JSON.stringify(campaignFromDB, bigintReplacer)}`);
          let endpoint;
          if (TonConfig.HTTP_ENDPOINT_NETWORK === 'testnet') {
            Logger.info('Getting HTTP V4 endpoint for testnet');
            endpoint = await getHttpV4Endpoint({ network: TonConfig.HTTP_ENDPOINT_NETWORK });
          } else {
            Logger.info('Getting HTTP V4 endpoint for mainnet');
            endpoint = await getHttpV4Endpoint();
          }
          
          const client = new TonClient4({ endpoint });
          const campaignAddress = Address.parse(campaignFromDB.contractAddress);
          const campaignInstance = client.open(Campaign.fromAddress(campaignAddress));
          const onChainData = await campaignInstance.getCampaignData();
          const campaignDetails = onChainData.campaignDetails;
          const opCodesToVerify = new Set<number>();
          for (const opCode of campaignDetails.regularUsersCostPerAction.keys()) {
            const numericOpCode = Number(opCode);
            opCodesToVerify.add(numericOpCode);
          }
          for (const opCode of campaignDetails.premiumUsersCostPerAction.keys()) {
            const numericOpCode = Number(opCode);
            opCodesToVerify.add(numericOpCode);
          }
          const eventsToVerifyFromBlockchain: number[] = Array.from(opCodesToVerify);
          const eventsToVerifyFromDB: number[] = Array.from(campaignFromDB.eventsToVerify ?? []).map(e => parseInt(e.toString(), 10));
          const arraysMatch = sameElements(eventsToVerifyFromDB, eventsToVerifyFromBlockchain);
          if (!arraysMatch) {
            const errorMessage = `Inconsistent OP Codes coming from Blockchain: From DB: ${JSON.stringify(eventsToVerifyFromDB)}, from Blockchain: ${JSON.stringify(eventsToVerifyFromBlockchain, bigintReplacer)}`;
            Logger.error(errorMessage);
            throw new Error(errorMessage);
          }
          await ensureCampaign({ id: campaignId });

          Logger.info(`Broadcasting AdvertiserSignedCampaignDetailsEvent to SSE clients`);

          const sseMessage = `id: ${Date.now()}\n` +
            `data: ${JSON.stringify(
              { type: 'AdvertiserSignedCampaignDetailsEvent', data: event.data },
              bigintReplacer
            )}\n\n`;

          // Broadcast only to clients subscribed to this campaignId.
          sseClients.forEach(client => {
            if (client.campaignId === campaignId) {
              client.res.write(sseMessage);
            }
          });
        } catch (error) {
          Logger.error(`Error in AdvertiserSignedCampaignDetailsEvent: ${error}`);
          throw error;
        }
        break;
      }

      case 'AffiliateCreatedEvent': {
        const { campaignId, advertiser, affiliateId, affiliate, state } = payload;
        const advertiserTon = translateRawAddress(advertiser);
        const affiliateTon = translateRawAddress(affiliate);
        Logger.info(
          `[AffiliateCreatedEvent] - campaignId: ${campaignId}, advertiser: ${advertiserTon}, affiliateId: ${affiliateId}, affiliateAddress: ${affiliateTon}, state: ${state}`
        );
        await createCampaignRole({
          campaignId,
          tonAddress: affiliateTon,
          role: RoleType.AFFILIATE,
          affiliateId: affiliateId,
        });
        Logger.info('Broadcasting AffiliateCreatedEvent to SSE clients');

        const sseMessage = `id: ${Date.now()}\n` +
          `data: ${JSON.stringify(
            { type: 'AffiliateCreatedEvent', data: event.data },
            bigintReplacer
          )}\n\n`;

        // Broadcast to clients subscribed to this campaign.
        sseClients.forEach(client => {
          if (client.campaignId === campaignId) {
            client.res.write(sseMessage);
          }
        });

        const advertiserUsers = await getUsersByWalletAddress(advertiserTon);
        if (!advertiserUsers) {
          throw new Error('No User found for advertiser address: ' + advertiserTon.toString());
        }
        const base = (process.env.MINI_APP_HOSTNAME ?? '').replace(/\/+$/, '');
        const affiliateLink = `https://${base}/campaign/${campaignId}/affiliate/${affiliateId}`;
        let text: string;
        if (Number(state) === Number(0)) {
          text = `Affiliate asked to join campaign:\n${affiliateLink}\nas a new affiliate.`;
        } else {
          text = `An affiliate (ID: ${affiliateId}) joined campaign:\n${affiliateLink}\nas a new affiliate.`;
        }
        await createNotification(advertiserTon, text, campaignId.toString(), affiliateLink);
        for (const advertiserUser of advertiserUsers) {
          await sendTelegramMessage(advertiserUser.id, text, 'Markdown');
        }
        break;
      }

      case 'AdvertiserApprovedAffiliateEvent': {
        const { campaignId, advertiser, affiliateId, affiliate } = payload;
        const advertiserTon = translateRawAddress(advertiser);
        const affiliateTon = translateRawAddress(affiliate);
        Logger.info(
          `[AdvertiserApprovedAffiliateEvent] - campaignId: ${campaignId}, advertiser: ${advertiserTon}, affiliateId: ${affiliateId}, affiliate: ${affiliateTon}`
        );
        const affiliateUsers = await getUsersByWalletAddress(affiliateTon);
        if (affiliateUsers) {
          const text =
            `Congratulations! You have been approved for campaign:\n` +
            `https://${process.env.MINI_APP_HOSTNAME}/${campaignId}`;
          const link = `https://${process.env.MINI_APP_HOSTNAME}/${campaignId}/affiliate/${affiliateId}`;
          await createNotification(affiliateTon, text, campaignId.toString(), link);
          for (const affiliateUser of affiliateUsers) {
            await sendTelegramMessage(affiliateUser.id, text);
          }
        }
        break;
      }

      case 'AdvertiserRemovedAffiliateEvent': {
        const { campaignId, advertiser, affiliateId, affiliate } = payload;
        const advertiserTon = translateRawAddress(advertiser);
        const affiliateTon = translateRawAddress(affiliate);
        Logger.info(
          `[AdvertiserRemovedAffiliateEvent] - campaignId: ${campaignId}, advertiser: ${advertiserTon}, affiliateId: ${affiliateId}, affiliate: ${affiliateTon}`
        );
        const deleted = await deleteCampaignRoleByCampaignAndWallet(
          campaignId.toString(),
          affiliateTon.toString()
        );
        if (deleted) {
          Logger.info(`Deleted campaign role for affiliate ${affiliateId} in campaign ${campaignId}`);
        } else {
          Logger.warn(`No campaign role found for affiliate ${affiliateId} in campaign ${campaignId}`);
        }
        const affiliateUsers = await getUsersByWalletAddress(affiliateTon);
        if (affiliateUsers) {
          const text = `You have been removed from campaign ${campaignId}.`;
          const link = `https://${process.env.MINI_APP_HOSTNAME}/${campaignId}`;
          await createNotification(affiliateTon, text, campaignId.toString(), link);
          for (const affiliateUser of affiliateUsers) {
            await sendTelegramMessage(affiliateUser.id, text, 'Markdown');
          }
        }
        break;
      }

      default:
        Logger.info(`No specific handling for event type ${event.type}`);
    }
  } catch (error) {
    Logger.error(
      `Error for event: ${JSON.stringify(event, bigintReplacer, 2)}. Error: ${
        error instanceof Error ? error.message : error
      }. Stack: ${
        error instanceof Error ? error.stack : 'No stack trace available.'
      }`
    );
    throw error;
  }
}

export const processBlockchainEvents = async (): Promise<void> => {
  try {
    const lastProcessedLt = await getLastProcessedLt();
    Logger.debug('Last Processed LT: ' + lastProcessedLt);

    const events: EmitLogEvent[] = await getLatestEvents(lastProcessedLt);
    if (events.length > 0) {
      let currentLt = lastProcessedLt;
      for (const event of events) {
        try {
          await processEvent(event);
          currentLt = event.createdLt > currentLt ? event.createdLt : currentLt;
        } catch (error) {
          Logger.error(
            `Error processing event with LT ${event.createdLt}: ${
              error instanceof Error ? error.message : JSON.stringify(error)
            }`
          );
        }
      }
      await saveLastProcessedLt(currentLt);
      Logger.debug('Updated Last Processed LT: ' + currentLt);
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error('Error fetching or processing events: ' + error.message + '. ST: ' + error.stack);
    } else {
      Logger.error('Unknown error: ' + JSON.stringify(error));
    }
  }
};
