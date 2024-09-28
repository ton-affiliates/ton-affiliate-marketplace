// events.ts

import { Cell } from '@ton/core';

// Event types from the ABI
const EVENT_TYPE_CAMPAIGN_CREATED = 2452245169;
const EVENT_TYPE_AFFILIATE_CREATED = 3273123323;
const EVENT_TYPE_AFFILIATE_WITHDRAW_EARNINGS = 3696909830;
const EVENT_TYPE_ADVERTISER_REPLENISH = 738147066;
const EVENT_TYPE_CAMPAIGN_BALANCE_UNDER_THRESHOLD = 859219313;
const EVENT_TYPE_INSUFFICIENT_CAMPAIGN_FUNDS = 580162183;
const EVENT_TYPE_CAMPAIGN_REMOVED = 88274163;


export function loadEvent(cell: Cell, expectedEventType: number) {
    const slice = cell.beginParse();
    const eventType = slice.loadUint(32);
    if (eventType !== expectedEventType) {
        throw new Error("Unexpected event type. Expected - " + expectedEventType + ", actual: " + eventType);
    }
    return slice;
}

export function loadCampaignUnderThresholdEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_CAMPAIGN_BALANCE_UNDER_THRESHOLD);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const campaginBalance = slice.loadCoins();
    return { $$type: 'CampaignBalnceUnderThresholdEvent', campaignId, advertiserAddressStr, campaginBalance };
}

export function loadInsufficientCampaignFundsEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_INSUFFICIENT_CAMPAIGN_FUNDS);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const campaginBalance = slice.loadCoins();
    const contractBalance = slice.loadCoins();
    return { $$type: 'InsufficientCampaignFundsEvent', campaignId, advertiserAddressStr, campaginBalance, contractBalance };
}


export function loadCampaignCreatedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_CAMPAIGN_CREATED);
    const campaignId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    const campaignContractAddressStr = slice.loadAddress().toString();
    return { $$type: 'CampaignCreatedEvent', campaignId, advertiser, campaignContractAddressStr };
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

export function  loadAdvertiserReplenisEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_ADVERTISER_REPLENISH);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const replenishAmount = slice.loadCoins();
    const fee = slice.loadCoins();
    return { $$type: 'AdvertiserReplenisEvent', campaignId, advertiserAddressStr, replenishAmount, fee };
}
