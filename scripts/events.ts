// events.ts

import { Cell } from '@ton/core';

// Event types from the ABI
export const EVENT_TYPE_CAMPAIGN_CREATED = 2452245169;
export const EVENT_TYPE_AFFILIATE_CREATED = 157562025;
export const EVENT_TYPE_ADVERTISER_WITHDRAW_FUNDS = 3552449590;
export const EVENT_TYPE_ADVERTISER_SIGNED_CAMPAIGN_DETAILS = 1529127575;
export const EVENT_TYPE_AFFILIATE_ASK_TO_JOIN_ALLOWED_LIST = 851937543;
export const EVENT_TYPE_ADVERTISER_APPROVED_AFFILIATE_TO_JOIN_ALLOWED_LIST = 3495604191;
export const EVENT_TYPE_ADVERTISER_REMOVED_AFFILIATE_FROM_ALLOWED_LIST = 3639428509;

export function verifyEventHeader(cell: Cell, expectedEventType: number) {
    const slice = cell.beginParse();
    const eventType = slice.loadUint(32);
    if (eventType !== expectedEventType) {
        throw new Error("Unexpected event type. Expected - " + expectedEventType + ", actual: " + eventType);
    }
    return slice;
}

export function loadCampaignCreatedEvent(cell: Cell) {
    const slice = verifyEventHeader(cell, EVENT_TYPE_CAMPAIGN_CREATED);
    const campaignId = slice.loadUint(32);
	const advertiserAddressStr = slice.loadAddress().toString();
    const campaignContractAddressStr = slice.loadAddress().toString();
    return { $$type: 'CampaignCreatedEvent', campaignId, advertiserAddressStr, campaignContractAddressStr };
}

export function loadAffiliateCreatedEvent(cell: Cell) {
    const slice = verifyEventHeader(cell, EVENT_TYPE_AFFILIATE_CREATED);
    const campaignId = slice.loadUint(32);
	const advertiserAddressStr = slice.loadAddress().toString();
    const affiliateId = slice.loadUint(32);
    const affiliateAddressStr = slice.loadAddress().toString();
    return { $$type: 'AffiliateCreatedEvent', campaignId, affiliateId, advertiserAddressStr, affiliateAddressStr };
}

export function loadAdvertiserWithdrawFundsEvent(cell: Cell) {
    const slice = verifyEventHeader(cell, EVENT_TYPE_ADVERTISER_WITHDRAW_FUNDS);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const amount = slice.loadCoins();
    return { $$type: 'AdvertiserWithdrawFundsEvent', campaignId, advertiserAddressStr, amount };
}

export function loadAdvertiserSignedCampaignDetailsEvent(cell: Cell) {
    const slice = verifyEventHeader(cell, EVENT_TYPE_ADVERTISER_SIGNED_CAMPAIGN_DETAILS);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    return { $$type: 'AdvertiserSignedCampaignDetailsEvent', campaignId, advertiserAddressStr };
}

export function loadAffiliateAskToJoinAllowedListEvent(cell: Cell) {
    const slice = verifyEventHeader(cell, EVENT_TYPE_AFFILIATE_ASK_TO_JOIN_ALLOWED_LIST);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
	const affiliateAddressStr = slice.loadAddress().toString();
    return { $$type: 'AffiliateAskToJoinAllowedListEvent', campaignId, advertiserAddressStr, affiliateAddressStr };
}

export function loadAdvertiserRemovedAffiliateFromAllowedListEvent(cell: Cell) {
    const slice = verifyEventHeader(cell, EVENT_TYPE_ADVERTISER_REMOVED_AFFILIATE_FROM_ALLOWED_LIST);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
	const affiliateAddressStr = slice.loadAddress().toString();
    return { $$type: 'AdvertiserRemovedAffiliateFromAllowedListEvent', campaignId, advertiserAddressStr, affiliateAddressStr };
}

export function loadAdvertiserApprovedAffiliateToJoinAllowedListEvent(cell: Cell) {
    const slice = verifyEventHeader(cell, EVENT_TYPE_ADVERTISER_APPROVED_AFFILIATE_TO_JOIN_ALLOWED_LIST);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
	const affiliateAddressStr = slice.loadAddress().toString();
    return { $$type: 'AdvertiserApprovedAffiliateToJoinAllowedListEvent', campaignId, advertiserAddressStr, affiliateAddressStr };
}