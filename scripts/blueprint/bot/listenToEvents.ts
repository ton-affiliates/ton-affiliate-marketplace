
//https://github.com/nikandr-surkov/Defi-on-Ton-Youtube-Lesson-11
import { AFFILIATE_MARKETPLACE_ADDRESS, HTTP_ENDPOINT_NETWORK } from "../constants"
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "@ton/ton";
import { 
AdvertiserSignedCampaignDetailsEvent,
loadAdvertiserSignedCampaignDetailsEvent,
AdvertiserApprovedAffiliateToAllowedListEvent,
loadAdvertiserApprovedAffiliateToAllowedListEvent,
AdvertiserRemovedAffiliateFromAllowedListEvent,
loadAdvertiserRemovedAffiliateFromAllowedListEvent,
AffiliateAskToJoinAllowedListEvent,
loadAffiliateAskToJoinAllowedListEvent,
AffiliateCreatedEvent,
loadAffiliateCreatedEvent,
CampaignCreatedEvent,
loadCampaignCreatedEvent, 
AdvertiserWithdrawFundsEvent,
loadAdvertiserWithdrawFundsEvent } from "../../wrappers/AffiliateMarketplace";
import { Cell } from "@ton/core";

// Event types from the ABI
export const EVENT_TYPE_CAMPAIGN_CREATED = 2452245169;
export const EVENT_TYPE_AFFILIATE_CREATED = 157562025;
export const EVENT_TYPE_ADVERTISER_WITHDRAW_FUNDS = 3552449590;
export const EVENT_TYPE_ADVERTISER_SIGNED_CAMPAIGN_DETAILS = 1529127575;
export const EVENT_TYPE_AFFILIATE_ASK_TO_JOIN_ALLOWED_LIST = 851937543;
export const EVENT_TYPE_ADVERTISER_APPROVED_AFFILIATE_TO_JOIN_ALLOWED_LIST = 3495604191;
export const EVENT_TYPE_ADVERTISER_REMOVED_AFFILIATE_FROM_ALLOWED_LIST = 3639428509;

// Define the emitted message formats
type EmitLogEvent = {
    type: 'AdvertiserWithdrawFundsEvent' | 'CampaignCreatedEvent' | 'AffiliateCreatedEvent' |
	'AffiliateAskToJoinAllowedListEvent' | 'AdvertiserRemovedAffiliateFromAllowedListEvent' |
	'AdvertiserApprovedAffiliateToAllowedListEvent' | 'AdvertiserSignedCampaignDetailsEvent';
    createdLt: bigint;
	createdAt: number;
	data: any;
};

function decodeAdvertiserSignedCampaignDetailsEvent(cell: Cell): AdvertiserSignedCampaignDetailsEvent  {
    const slice = cell.beginParse();
    return loadAdvertiserSignedCampaignDetailsEvent(slice);
}

function decodeAdvertiserApprovedAffiliateToAllowedListEvent(cell: Cell): AdvertiserApprovedAffiliateToAllowedListEvent {
    const slice = cell.beginParse();
    return loadAdvertiserApprovedAffiliateToAllowedListEvent(slice);
}

function decodeAdvertiserRemovedAffiliateFromAllowedListEvent(cell: Cell): AdvertiserRemovedAffiliateFromAllowedListEvent {
    const slice = cell.beginParse();
    return loadAdvertiserRemovedAffiliateFromAllowedListEvent(slice);
}

function decodeAffiliateAskToJoinAllowedListEvent(cell: Cell): AffiliateAskToJoinAllowedListEvent {
    const slice = cell.beginParse();
    return loadAffiliateAskToJoinAllowedListEvent(slice);
}

function decodeAffiliateCreatedEvent(cell: Cell): AffiliateCreatedEvent  {
    const slice = cell.beginParse();
    return loadAffiliateCreatedEvent(slice);
}

function decodeCampaignCreatedEvent(cell: Cell): CampaignCreatedEvent {
    const slice = cell.beginParse();
    return loadCampaignCreatedEvent(slice);
}

function decodeAdvertiserWithdrawFundsEvent(cell: Cell): AdvertiserWithdrawFundsEvent {
    const slice = cell.beginParse();
    return loadAdvertiserWithdrawFundsEvent(slice);
}

function getEventType(cell: Cell): 'AdvertiserWithdrawFundsEvent' | 'CampaignCreatedEvent' | 'AffiliateCreatedEvent' |
	'AffiliateAskToJoinAllowedListEvent' | 'AdvertiserRemovedAffiliateFromAllowedListEvent' |
	'AdvertiserApprovedAffiliateToAllowedListEvent' | 'AdvertiserSignedCampaignDetailsEvent' | 'Unknown' {
    
	const slice = cell.beginParse();
    const header = slice.loadUint(32);
    
	if (header === EVENT_TYPE_CAMPAIGN_CREATED) {
        return 'CampaignCreatedEvent';
    } else if (header === EVENT_TYPE_AFFILIATE_CREATED) {
        return 'AffiliateCreatedEvent';
    } else if (header === EVENT_TYPE_ADVERTISER_WITHDRAW_FUNDS) {
        return 'AdvertiserWithdrawFundsEvent';
    } else if (header === EVENT_TYPE_ADVERTISER_SIGNED_CAMPAIGN_DETAILS) {
        return 'AdvertiserSignedCampaignDetailsEvent';
    } else if (header === EVENT_TYPE_AFFILIATE_ASK_TO_JOIN_ALLOWED_LIST) {
        return 'AffiliateAskToJoinAllowedListEvent';
    } else if (header === EVENT_TYPE_ADVERTISER_APPROVED_AFFILIATE_TO_JOIN_ALLOWED_LIST) {
        return 'AdvertiserApprovedAffiliateToAllowedListEvent';
    } else if (header === EVENT_TYPE_ADVERTISER_REMOVED_AFFILIATE_FROM_ALLOWED_LIST) {
        return 'AdvertiserRemovedAffiliateFromAllowedListEvent';
    } else {
        return 'Unknown';
    }
}

export async function getLastTenEvents(lastProcessedEventLT: bigint) {
	
	const endpoint = await getHttpEndpoint({
        network: HTTP_ENDPOINT_NETWORK,
    });

    const client = new TonClient({ endpoint });
	const transactions = await client.getTransactions(AFFILIATE_MARKETPLACE_ADDRESS, { limit: 10 }); // last 10 events

    const logs: EmitLogEvent[] = [];
	
	let currProcessedEventLT = lastProcessedEventLT;
	
    for (const tx of transactions) {
		
		if (tx?.outMessages) {
            for (const key of tx.outMessages.keys()) { // Iterate over message keys
                const message = tx.outMessages.get(key); // Access message using `get`				
				
				if (message) {
					if (message?.info.type == 'external-out') {
					
						const createdAt = message?.info.createdAt;
						const createdLt = message?.info.createdLt; 
						
						// process event if > lastProcessedEventLT 
						if (createdLt > lastProcessedEventLT) {
						
							if (createdLt > currProcessedEventLT) {
								currProcessedEventLT = createdLt; 
							}
					
							const bodyBuffer = Buffer.from(message.body.toBoc());
							const bodyCell = Cell.fromBoc(bodyBuffer)[0];
							const eventType = getEventType(bodyCell);

							if (eventType === 'AdvertiserWithdrawFundsEvent') {
								const decodedEvent = decodeAdvertiserWithdrawFundsEvent(bodyCell);
								logs.push({ type: 'AdvertiserWithdrawFundsEvent', createdAt: createdAt, createdLt: createdLt, data: decodedEvent });
							} else if (eventType === 'CampaignCreatedEvent') {
								const decodedEvent = decodeCampaignCreatedEvent(bodyCell);
								logs.push({ type: 'CampaignCreatedEvent', createdAt: createdAt, createdLt: createdLt, data: decodedEvent });
							} else if (eventType === 'AffiliateCreatedEvent') {
								const decodedEvent = decodeAffiliateCreatedEvent(bodyCell);
								logs.push({ type: 'AffiliateCreatedEvent', createdAt: createdAt, createdLt: createdLt, data: decodedEvent });
							} else if (eventType === 'AffiliateAskToJoinAllowedListEvent') {
								const decodedEvent = decodeAffiliateAskToJoinAllowedListEvent(bodyCell);
								logs.push({ type: 'AffiliateAskToJoinAllowedListEvent', createdAt: createdAt, createdLt: createdLt, data: decodedEvent });
							} else if (eventType === 'AdvertiserRemovedAffiliateFromAllowedListEvent') {
								const decodedEvent = decodeAdvertiserRemovedAffiliateFromAllowedListEvent(bodyCell);
								logs.push({ type: 'AdvertiserRemovedAffiliateFromAllowedListEvent', createdAt: createdAt, createdLt: createdLt, data: decodedEvent });
							} else if (eventType === 'AdvertiserApprovedAffiliateToAllowedListEvent') {
								const decodedEvent = decodeAdvertiserApprovedAffiliateToAllowedListEvent(bodyCell);
								logs.push({ type: 'AdvertiserApprovedAffiliateToAllowedListEvent', createdAt: createdAt, createdLt: createdLt, data: decodedEvent });
							} else if (eventType === 'AdvertiserSignedCampaignDetailsEvent') {
								const decodedEvent = decodeAdvertiserSignedCampaignDetailsEvent(bodyCell);
								logs.push({ type: 'AdvertiserSignedCampaignDetailsEvent', createdAt: createdAt, createdLt: createdLt, data: decodedEvent });
							} else {
								console.log("Unknown Event!");
							}
						}
					}
				}
            }
		}
    }

    console.log('Logs data', logs);
	return { currProcessedEventLT, logs };  // or save in DB directly
}
