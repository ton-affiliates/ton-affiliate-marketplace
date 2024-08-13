// events.ts

import { Cell } from '@ton/core';

// Event types from the ABI
const EVENT_TYPE_AFFILIATE_CREATED = 413735385;
const EVENT_TYPE_ADVERTISER_SIGNED = 1916433693;
const EVENT_TYPE_PUBLISHER_SIGNED = 1445469268;
const EVENT_TYPE_FUNDS_ADDED = 1667578048;
const EVENT_TYPE_PUBLISHER_PAID = 333578746;
const EVENT_TYPE_AFFILIATE_REMOVED = 2349079316;

function loadEvent(cell: Cell, expectedEventType: number) {
    const slice = cell.beginParse();
    const eventType = slice.loadUint(32);
    if (eventType !== expectedEventType) {
        throw new Error("Unexpected event type");
    }
    return slice;
}

export function loadAffiliateCreatedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_AFFILIATE_CREATED);
    const affiliateId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    const publisher = slice.loadAddress().toString();
    const cpc = slice.loadCoins();
    const affiliateContractAddress = slice.loadAddress().toString();
    return { $$type: 'AffiliateCreatedEvent', affiliateId, advertiser, publisher, cpc, affiliateContractAddress };
}

export function loadAdvertiserSignedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_ADVERTISER_SIGNED);
    const affiliateId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    const publisher = slice.loadAddress().toString();
    const cpc = slice.loadCoins();
    const campaignBalance = slice.loadCoins();
    return { $$type: 'AdvertiserSignedEvent', affiliateId, advertiser, publisher, cpc, campaignBalance };
}

export function loadPublisherSignedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_PUBLISHER_SIGNED);
    const affiliateId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    const publisher = slice.loadAddress().toString();
    const cpc = slice.loadCoins();
    const campaignBalance = slice.loadCoins();
    return { $$type: 'PublisherSignedEvent', affiliateId, advertiser, publisher, cpc, campaignBalance };
}

export function loadFundsAddedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_FUNDS_ADDED);
    const affiliateId = slice.loadUint(32);
    const amountAdded = slice.loadCoins();
    const campaignBalance = slice.loadCoins();
    return { $$type: 'FundsAddedToCampaignEvent', affiliateId, amountAdded, campaignBalance };
}

export function loadPublisherPaidEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_PUBLISHER_PAID);
    const affiliateId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    const publisher = slice.loadAddress().toString();
    const cpc = slice.loadCoins();
    const txFee = slice.loadCoins();
    const campaignBalance = slice.loadCoins();
    return { $$type: 'PublisherPaidEvent', affiliateId, advertiser, publisher, cpc, txFee, campaignBalance };
}

export function loadAffiliateRemovedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_AFFILIATE_REMOVED);
    const affiliateId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    const publisher = slice.loadAddress().toString();
    const cpc = slice.loadCoins();
    const campaignBalance = slice.loadCoins();
    return { $$type: 'AffiliateRemovedEvent', affiliateId, advertiser, publisher, cpc, campaignBalance };
}
