import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Cell, Address } from "@ton/core";
import { TonClient } from "ton";
import * as Events from '../events';
import { AFFILIATE_MARKETPLACE_ADDRESS, HTTP_ENDPOINT_NETWORK } from "../constants";

// https://github.com/nikandr-surkov/Defi-on-Ton-Youtube-Lesson-11/blob/master/scripts/retrieveLogs.ts



// Reads 10 events at a time
export async function run() {
    const endpoint = await getHttpEndpoint({
        network: HTTP_ENDPOINT_NETWORK,
    });

    const client = new TonClient({ endpoint });
    const transactions = await client.getTransactions(AFFILIATE_MARKETPLACE_ADDRESS, { limit: 10 });

    const events: any[] = []; // Array to store decoded events

    for (const tx of transactions) {
		console.log(tx);
        if (tx?.outMessages && tx.outMessages.size > 0) {
            for (const [key, outMessage] of tx.outMessages) {                  
				const bodyCellOptional: Cell = outMessage.body;
                if (bodyCellOptional) {
					const bodyCell: Cell = bodyCellOptional!;
					const header = bodyCell.beginParse().loadUint(32); // Load the header (32-bit integer)
					let decodedEvent: any | null = null; // Initialize variable for decoded event

					if (header === Events.EVENT_TYPE_CAMPAIGN_CREATED) {
						decodedEvent = Events.loadCampaignCreatedEvent(bodyCell);
					} else if (header === Events.EVENT_TYPE_AFFILIATE_CREATED) {
						decodedEvent = Events.loadAffiliateCreatedEvent(bodyCell);
					} else if (header === Events.EVENT_TYPE_AFFILIATE_WITHDRAW_EARNINGS) {
						decodedEvent = Events.loadAffiliateWithdrawEarningsEvent(bodyCell);
					} else if (header === Events.EVENT_TYPE_ADVERTISER_WITHDRAW_FUNDS) {
						decodedEvent = Events.loadAdvertiserWithdrawFundsEvent(bodyCell);
					} else if (header === Events.EVENT_TYPE_INSUFFICIENT_CAMPAIGN_FUNDS) {
						decodedEvent = Events.loadInsufficientCampaignFundsEvent(bodyCell);
					} else if (header === Events.EVENT_TYPE_CAMPAIGN_SEIZED) {
						decodedEvent = Events.loadCampaignSeized(bodyCell);
					} else if (header === Events.EVENT_TYPE_ADVERTISER_SIGNED_CAMPAIGN_DETAILS) {
						decodedEvent = Events.loadAdvertiserSignedCampaignDetailsEvent(bodyCell);
					} else if (header === Events.EVENT_TYPE_AFFILIATE_ASK_TO_JOIN_ALLOWED_LIST) {
						decodedEvent = Events.loadAffiliateAskToJoinAllowedListEvent(bodyCell);
					} else if (header === Events.EVENT_TYPE_ADVERTISER_MODIFIED_ALLOWED_LIST) {
						decodedEvent = Events.loadAdvertiserModifiedAllowedListEvent(bodyCell);
					}

					if (decodedEvent) {
						events.push(decodedEvent); // Add decoded event to the array
					}
				}
            }
        }
	}

    console.log('Logs data', events);

    // TODO: Write events to DB and perform follow-up actions
}
