import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Cell, Address } from "@ton/core";
import * as Events from './events';
import AFFILIATE_MARKETPLACE_ADDRESS from "./utils"

// https://github.com/nikandr-surkov/Defi-on-Ton-Youtube-Lesson-11/blob/master/scripts/retrieveLogs.ts

// reads 10 events at a time
export async function run() {
    
	const endpoint = await getHttpEndpoint({
        network: "testnet",
    });

    const client = new TonClient({ endpoint });
    const transactions = await client.getTransactions(Address.parse(AFFILIATE_MARKETPLACE_ADDRESS), { limit: 10 });

    const events: = [];

    for (const tx of transactions) {
        if (tx?.outMessages && tx?.outMessages.length > 0) {
            if (tx?.outMessages[0].body?.type === 'data') {
                
				const bodyBuffer = Buffer.from(tx.outMessages[0].body.data);
                const bodyCell = Cell.fromBoc(bodyBuffer)[0];
				const slice = bodyCell.beginParse();
				const header = slice.loadUint(32);

				let decodedEvent = any | null = null;
                
				if (header === Events.EVENT_TYPE_CAMPAIGN_CREATED) {
                    decodedEvent = Events.loadCampaignCreatedEvent(bodyCell);
                } else if (header === Events.EVENT_TYPE_AFFILIATE_CREATED) {
                    decodedEvent = Events.loadAffiliateCreatedEvent(bodyCell);
                } else if (header === Events.EVENT_TYPE_AFFILIATE_WITHDRAW_EARNINGS) {
                    decodedEvent = Events.loadAffiliateWithdrawEarningsEvent(bodyCell);
                } else if (header === Events.EVENT_TYPE_ADVERTISER_WITHDRAW_FUNDS) {
                    decodedEvent = Events.loadAdvertiserWithdrawFundsEvent(bodyCell);
                } else if (header === Events.EVENT_TYPE_CAMPAIGN_BALANCE_UNDER_FIVE_TON) {
                    decodedEvent = Events.loadCampaignUnderFiveTonEvent(bodyCell);
                } else if (header === Events.EVENT_TYPE_INSUFFICIENT_CAMPAIGN_FUNDS) {
                    decodedEvent = Events.loadInsufficientCampaignFundsEvent(bodyCell);
                } else if (header === Events.EVENT_TYPE_CAMPAIGN_SEIZED) {
                    decodedEvent = Events.loadCampaignSeized(bodyCell);
                }  else if (header === Events.EVENT_TYPE_ADVERTISER_SIGNED_CAMPAIGN_DETAILS) {
                    decodedEvent = Events.loadAdvertiserSignedCampaignDetailsEvent(bodyCell);
                } else if (header === Events.EVENT_TYPE_AFFILIATE_ASK_TO_JOIN_ALLOWED_LIST) {
                    decodedEvent = Events.loadAffiliateAskToJoinAllowedListEvent(bodyCell);
                } else if (header === Events.EVENT_TYPE_ADVERTISER_MODIFIED_ALLOWED_LIST) {
                    decodedEvent = Events.loadAdvertiserModifiedAllowedListEvent(bodyCell);
                }
				
				events.push(event: decodedEvent);
            } 
        }
    }

    console.log('Logs data', events);
	
	// TODO write events to DB and do follow up actions
}