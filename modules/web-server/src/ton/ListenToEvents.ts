
import { AFFILIATE_MARKETPLACE_ADDRESS, HTTP_ENDPOINT_NETWORK } from "@common/constants"
import { getHttpV4Endpoint } from "@orbs-network/ton-access";
import { TonClient4 } from "@ton/ton";
import { 
AdvertiserSignedCampaignDetailsEvent,
loadAdvertiserSignedCampaignDetailsEvent,
AdvertiserApprovedAffiliateListEvent,
loadAdvertiserApprovedAffiliateListEvent,
AdvertiserRemovedAffiliateEvent,
loadAdvertiserRemovedAffiliateEvent,
AffiliateCreatedEvent,
loadAffiliateCreatedEvent,
CampaignCreatedEvent,
loadCampaignCreatedEvent, 
AdvertiserWithdrawFundsEvent,
loadAdvertiserWithdrawFundsEvent } from "../contracts/AffiliateMarketplace";
import { Cell } from "@ton/core";

// Event types from the ABI
export const EVENT_TYPE_CAMPAIGN_CREATED = 2452245169;
export const EVENT_TYPE_AFFILIATE_CREATED = 2267067737;
export const EVENT_TYPE_ADVERTISER_WITHDRAW_FUNDS = 3552449590;
export const EVENT_TYPE_ADVERTISER_SIGNED_CAMPAIGN_DETAILS = 1529127575;
export const EVENT_TYPE_ADVERTISER_APPROVED_AFFILIATE = 4109738705;
export const EVENT_TYPE_ADVERTISER_REMOVED_AFFILIATE = 1530383439;

// Define the emitted message formats
export type EmitLogEvent = {
    type: 'AdvertiserWithdrawFundsEvent' | 'CampaignCreatedEvent' | 'AffiliateCreatedEvent' |
	'AdvertiserRemovedAffiliateEvent' | 'AdvertiserApprovedAffiliateEvent' | 
    'AdvertiserSignedCampaignDetailsEvent';
    createdLt: bigint;
	createdAt: number;
	data: any;
};

function decodeAdvertiserSignedCampaignDetailsEvent(cell: Cell): AdvertiserSignedCampaignDetailsEvent  {
    const slice = cell.beginParse();
    return loadAdvertiserSignedCampaignDetailsEvent(slice);
}

function decodeAdvertiserApprovedAffiliate(cell: Cell): AdvertiserApprovedAffiliateListEvent {
    const slice = cell.beginParse();
    return loadAdvertiserApprovedAffiliateListEvent(slice);
}

function decodeAdvertiserRemovedAffiliate(cell: Cell): AdvertiserRemovedAffiliateEvent {
    const slice = cell.beginParse();
    return loadAdvertiserRemovedAffiliateEvent(slice);
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
	'AffiliateAskToJoinAllowedListEvent' | 'AdvertiserRemovedAffiliateEvent' |
	'AdvertiserApprovedAffiliateEvent' | 'AdvertiserSignedCampaignDetailsEvent' | 'Unknown' {
    
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
    } else if (header === EVENT_TYPE_ADVERTISER_APPROVED_AFFILIATE) {
        return 'AdvertiserApprovedAffiliateEvent';
    } else if (header === EVENT_TYPE_ADVERTISER_REMOVED_AFFILIATE) {
        return 'AdvertiserRemovedAffiliateEvent';
    } else {
        return 'Unknown';
    }
}

export async function getLatestEvents(lastProcessedEventLt = BigInt(0)) {
    // Load client
    const endpoint = HTTP_ENDPOINT_NETWORK == "testnet" ? 
            await getHttpV4Endpoint({ network: HTTP_ENDPOINT_NETWORK }) :
            await getHttpV4Endpoint();
    const client = new TonClient4({ endpoint });

    // Load transactions
    const block = (await client.getLastBlock()).last.seqno;
    const account = await client.getAccount(block, AFFILIATE_MARKETPLACE_ADDRESS);

    if (account.account.state.type !== 'active') {
        throw new Error('Account is not active');
    }

    const transactions = (await client.getAccountTransactions(
        AFFILIATE_MARKETPLACE_ADDRESS,
        BigInt(account.account.last!.lt),
        Buffer.from(account.account.last!.hash, 'base64')
    ))
        .filter((tx) => BigInt(tx.tx.lt) > lastProcessedEventLt) // Filter transactions by last processed LT
        .map((v) => v.tx); // Extract the transaction object

    const logs: EmitLogEvent[] = [];

    for (const tx of transactions) {
        if (tx?.outMessages) {
            for (const key of tx.outMessages.keys()) { // Iterate over message keys
                const message = tx.outMessages.get(key); // Access message using `get`

                if (message && message?.info.type === 'external-out') {
                    const createdAt = message?.info.createdAt;
                    const createdLt = message?.info.createdLt;

                    const bodyBuffer = Buffer.from(message.body.toBoc());
                    const bodyCell = Cell.fromBoc(bodyBuffer)[0];
                    const eventType = getEventType(bodyCell);

                    if (eventType === 'AdvertiserWithdrawFundsEvent') {
                        const decodedEvent = decodeAdvertiserWithdrawFundsEvent(bodyCell);
                        logs.push({ type: 'AdvertiserWithdrawFundsEvent', createdAt, createdLt, data: decodedEvent });
                    } else if (eventType === 'CampaignCreatedEvent') {
                        const decodedEvent = decodeCampaignCreatedEvent(bodyCell);
                        logs.push({ type: 'CampaignCreatedEvent', createdAt, createdLt, data: decodedEvent });
                    } else if (eventType === 'AffiliateCreatedEvent') {
                        const decodedEvent = decodeAffiliateCreatedEvent(bodyCell);
                        logs.push({ type: 'AffiliateCreatedEvent', createdAt, createdLt, data: decodedEvent });
                    } else if (eventType === 'AdvertiserRemovedAffiliateEvent') {
                        const decodedEvent = decodeAdvertiserRemovedAffiliate(bodyCell);
                        logs.push({ type: 'AdvertiserRemovedAffiliateEvent', createdAt, createdLt, data: decodedEvent });
                    } else if (eventType === 'AdvertiserApprovedAffiliateEvent') {
                        const decodedEvent = decodeAdvertiserApprovedAffiliate(bodyCell);
                        logs.push({ type: 'AdvertiserApprovedAffiliateEvent', createdAt, createdLt, data: decodedEvent });
                    } else if (eventType === 'AdvertiserSignedCampaignDetailsEvent') {
                        const decodedEvent = decodeAdvertiserSignedCampaignDetailsEvent(bodyCell);
                        logs.push({ type: 'AdvertiserSignedCampaignDetailsEvent', createdAt, createdLt, data: decodedEvent });
                    } else {
                        console.log("Unknown Event!");
                    }
                }
            }
        }
    }

    return logs;
}
