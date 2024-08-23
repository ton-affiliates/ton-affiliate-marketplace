// events.ts

import { Cell } from '@ton/core';

// Event types from the ABI
const EVENT_TYPE_AFFILIATE_CREATED = 413735385; // AffiliateCreatedEvent
const EVENT_TYPE_PUBLISHER_SIGNED = 1228488720; // PublisherSignedEvent
const EVENT_TYPE_PUBLISHER_PAID = 841379930; // PublisherPaidEvent

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
    const affiliateContractAddress = slice.loadAddress();
    return { $$type: 'AffiliateCreatedEvent', affiliateId, advertiser, publisher, cpc, affiliateContractAddress };
}

export function loadPublisherSignedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_PUBLISHER_SIGNED);
    const affiliateId = slice.loadUint(32);
    const publisher = slice.loadAddress().toString();
    const cpc = slice.loadCoins();
    return { $$type: 'PublisherSignedEvent', affiliateId, publisher, cpc };
}

export function loadPublisherPaidEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_PUBLISHER_PAID);
    const affiliateId = slice.loadUint(32);
    const publisher = slice.loadAddress().toString();
    const cpc = slice.loadCoins();
    const txFee = slice.loadCoins();
    return { $$type: 'PublisherPaidEvent', affiliateId, publisher, cpc, txFee };
}
