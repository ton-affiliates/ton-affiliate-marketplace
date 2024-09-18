// events.ts

import { Cell } from '@ton/core';

// Event types from the ABI
const EVENT_TYPE_CAMPAIGN_CREATED = 2452245169; 
const EVENT_TYPE_AFFILIATE_CREATED = 627662741; 
const EVENT_TYPE_AFFILIATE_WITHDRAW_EARNINGS = 1950324544; 
const EVENT_TYPE_ADVERTISER_REPLENISH = 3518853408;

function loadEvent(cell: Cell, expectedEventType: number) {
    const slice = cell.beginParse();
    const eventType = slice.loadUint(32);
    if (eventType !== expectedEventType) {
        throw new Error("Unexpected event type");
    }
    return slice;
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
    return { $$type: 'AffiliateCreatedEvent', campaignId, affiliateId, advertiserAddressStr };
}

export function  loadAffiliateWithdrawEarningsEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_AFFILIATE_WITHDRAW_EARNINGS);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const affiliateId = slice.loadUint(32);
    const earnings = slice.loadCoins();
    return { $$type: 'AffiliateWithdrawEarningsEvent', campaignId, affiliateId, advertiserAddressStr, earnings };
}

export function  loadAdvertiserReplenisEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_ADVERTISER_REPLENISH);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const replenishAmount = slice.loadCoins();
    return { $$type: 'AdvertiserReplenisEvent', campaignId, advertiserAddressStr, replenishAmount };
}
