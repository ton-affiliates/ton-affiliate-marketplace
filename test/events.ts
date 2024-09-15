// events.ts

import { Cell } from '@ton/core';

// Event types from the ABI
const EVENT_TYPE_CAMPAIGN_CREATED = 2452245169; // CampaignCreatedEvent
const EVENT_TYPE_AFFILIATE_CREATED = 413735385; // AffiliateCreatedEvent

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
    const campaignContractAddress = slice.loadAddress();
    return { $$type: 'CampaignCreatedEvent', campaignId, advertiser, campaignContractAddress };
}

export function loadAffiliateCreatedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_AFFILIATE_CREATED);
    const campaignId = slice.loadUint(32);
    const affiliateId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    return { $$type: 'AffiliateCreatedEvent', campaignId, affiliateId, advertiser };
}
