// events.ts

import { Cell } from '@ton/core';

// Event types from the ABI
const EVENT_TYPE_CAMPAIGN_CREATED = 1630699180;
const EVENT_TYPE_AFFILIATE_CREATED = 3273123323;
const EVENT_TYPE_AFFILIATE_WITHDRAW_EARNINGS = 3696909830;
const EVENT_TYPE_ADVERTISER_WITHDRAW_FUNDS = 2345188106;
const EVENT_TYPE_CAMPAIGN_BALANCE_UNDER_FIVE_TON = 21630181;
const EVENT_TYPE_INSUFFICIENT_CAMPAIGN_FUNDS = 1056081826;
const EVENT_TYPE_CAMPAIGN_SEIZED = 799343753;


export function loadEvent(cell: Cell, expectedEventType: number) {
    const slice = cell.beginParse();
    const eventType = slice.loadUint(32);
    if (eventType !== expectedEventType) {
        throw new Error("Unexpected event type. Expected - " + expectedEventType + ", actual: " + eventType);
    }
    return slice;
}

export function loadCampaignSeized(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_CAMPAIGN_SEIZED);
    const campaignId = slice.loadUint(32);
    const amountSeized = slice.loadCoins();
    return { $$type: 'CampaignSeizedEvent', campaignId, amountSeized };
}

export function loadCampaignUnderFiveTonEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_CAMPAIGN_BALANCE_UNDER_FIVE_TON);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const campaignBalance = slice.loadCoins();
    return { $$type: 'CampaignBalnceUnderThresholdEvent', campaignId, advertiserAddressStr, campaignBalance };
}

export function loadInsufficientCampaignFundsEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_INSUFFICIENT_CAMPAIGN_FUNDS);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const campaignBalance = slice.loadCoins();
    const contractBalance = slice.loadCoins();
    const maxCpaValue = slice.loadCoins();
    return { $$type: 'InsufficientCampaignFundsEvent', campaignId, advertiserAddressStr, campaignBalance, contractBalance, maxCpaValue };
}


export function loadCampaignCreatedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_CAMPAIGN_CREATED);
    const campaignId = slice.loadUint(32);
    const campaignContractAddressStr = slice.loadAddress().toString();
    return { $$type: 'CampaignCreatedEvent', campaignId, campaignContractAddressStr };
}

export function loadAffiliateCreatedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_AFFILIATE_CREATED);
    const campaignId = slice.loadUint(32);
    const affiliateId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const affiliateAddressStr = slice.loadAddress().toString();
    return { $$type: 'AffiliateCreatedEvent', campaignId, affiliateId, advertiserAddressStr, affiliateAddressStr };
}

export function  loadAffiliateWithdrawEarningsEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_AFFILIATE_WITHDRAW_EARNINGS);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const affiliateId = slice.loadUint(32);
    const earnings = slice.loadCoins();
	const fee = slice.loadCoins();
    return { $$type: 'AffiliateWithdrawEarningsEvent', campaignId, affiliateId, advertiserAddressStr, earnings, fee };
}

export function loadAdvertiserWithdrawFundsEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_ADVERTISER_WITHDRAW_FUNDS);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const campaignBalance = slice.loadCoins();
    return { $$type: 'CampaignBalnceUnderThresholdEvent', campaignId, advertiserAddressStr, campaignBalance };
}