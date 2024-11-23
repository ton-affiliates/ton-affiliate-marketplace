// * ------ AffiliateMarketplace API ------ *

// Admin functions 
message AdminWithdraw {
    amount: Int as coins;
    wallets: map<Address, Bool>;
}

message AdminReplenish {}

message AdminModifyCampaignFeePercentage {
    campaignId: Int as uint32;
    feePercentage: Int as uint32;
}

message AdminStopCampaign {
	campaignId: Int as uint32;
}

message AdminResumeCampaign {
	campaignId: Int as uint32;
}

message AdminSeizeCampaignBalance {
    campaignId: Int as uint32;
}

message AdminJettonNotificationMessageFailure {
	campaignId: Int as uint32;
	amount: Int as coins;
}

message AdminWithdrawUSDTToPayout {
	campaignId: Int as uint32;
	amount: Int as coins;
}

message AdminPayAffiliateUSDTBounced {
	campaignId: Int as uint32;
	affiliateId: Int as uint64;
	amount: Int as coins;
}

// Events - always emitted from parent contract
message AdvertiserWithdrawFundsEvent{
    campaignId: Int as uint32;
    advertiser: Address;
    amount: Int as coins;
}

message CampaignCreatedEvent {
    campaignId: Int as uint32;
    campaignContractAddress: Address;
}

message AdvertiserSignedCampaignDetailsEvent {
	campaignId: Int as uint32;
	advertiser: Address;
}

message CampaignSeizedEvent{
    campaignId: Int as uint32;
    amountSeized: Int as coins;
}

message AffiliateCreatedEvent {
    campaignId: Int as uint32;
    affiliateId: Int as uint32;
    advertiser: Address;
    affiliate: Address;
}

message InsufficientCampaignFundsEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    campaignBalance: Int as coins;
    maxCpaValue: Int as coins;
}

message AffiliateWithdrawEarningsEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    affiliateId: Int as uint32;
    earnings: Int as coins;
	fee: Int as coins;
}

message AffiliateAskToJoinAllowedListEvent {
	campaignId: Int as uint32;
    advertiser: Address;
	affiliate: Address;
}

message AdvertiserModifiedAllowedListEvent {
	campaignId: Int as uint32;
    advertiser: Address;
	affiliate: Address;
	isAdded: Bool;
}

// Bot functions
message BotDeployNewCampaign {}

message BotUserAction {
    affiliateId: Int as uint32;
    userActionOpCode: Int as uint32;
    isPremiumUser: Bool;
}

// parent to child INTERNAL messages
message ParentToChildDeployCampaign {
    campaignId: Int as uint32;
}

message ParentToChildUpdateFeePercentage{
    feePercentage: Int as uint32
}

message ParentToChildBotUserAction{
    affiliateId: Int as uint32;
    userActionOpCode: Int as uint32;
    isPremiumUser: Bool;
}

message ParentToChildSeizeCampaign{}


message ParentToChildJettonNotificationMessageFailure {
	amount: Int as coins;
}

message ParentToChildWithdrawUSDTToPayout {
	amount: Int as coins;
}

message ParentToChildPayAffiliateUSDTBounced {
	affiliateId: Int as uint64;
	amount: Int as coins;
}


// * ------ END AffiliateMarketplace API ------ *


// * ------ Campaign API ------ *

message PayAffiliate{
    affiliateId: Int as uint32;
    amount: Int as coins;
}

// Affiliate API
message AffiliateCreateNewAffiliate{}
message AffiliateWithdrawEarnings {
    affiliateId: Int as uint32;
}

message AffiliateAskToJoinAllowedList{}

// Advertiser API
message AdvertiserWithdrawFunds{
	amount: Int as coins;
}

message AdvertiserSetCampaignDetails {
    campaignDetails: CampaignDetails;
}

message AdvertiserUserAction {
    affiliateId: Int as uint32;
    userActionOpCode: Int as uint32;
    isPremiumUser: Bool;
} 

message AdvertiserAddNewAffiliateToAllowedList{affiliate: Address}
message AdvertiserRemoveExistingAffiliateFromAllowedList{affiliate: Address}

message AdvertiserReplenish {}

message AdvertiserModifyAffiliateRequiresApprovalForWithdrawlFlag{
	affiliateId: Int as uint32;
	requiresAdvertiserApprovalForWithdrawl: Bool;
}

message AdvertiserModifyAffiliateAccruedEarnings{
	affiliateId: Int as uint32;
	amount: Int as coins;
}

message AdvertiserWithdrawEarningsForAffiliates {
	affiliatesEarnings: map<Int, Int>;  // affiliateId -> withdrawalAmount
}


// Child to Parent - INTERNAL Messages
message ChildToParentCampaignDeployedSuccessfully {
    campaignId: Int as uint32; 
}

message ChildToParentSeizeCampaign {
    campaignId: Int as uint32;
}

message ChildToParentAffiliateCreated {
    campaignId: Int as uint32;
    affiliateId: Int as uint32;
    advertiser: Address;
    affiliate: Address;
}

message ChildToParentAffiliateWithdrawEarningsFee {
    campaignId: Int as uint32;
    advertiser: Address;
    affiliateId: Int as uint32;
    earnings: Int as coins;
	fee: Int as coins;
}

message ChildToParentAdvertiserDeplyContractFee {
    campaignId: Int as uint32;
    advertiser: Address;
}

message ChildToParentAdvertiserWithdrawFunds{
    campaignId: Int as uint32;
    advertiser: Address;
    amount: Int as coins;
}

message ChildToParentInsufficientCampaignFunds {
    campaignId: Int as uint32;
    advertiser: Address;
    campaignBalance: Int as coins;
    maxCpaValue: Int as coins;
}

message ChildToParentAffiliateAskToJoinAllowedList {
	campaignId: Int as uint32;
    advertiser: Address;
	affiliate: Address;
}

message ChildToParentAdvertiserModifiedAllowedList {
	campaignId: Int as uint32;
    advertiser: Address;
	affiliate: Address;
	isAdded: Bool;
}


// Jetton
message(0x7362d09c) JettonTransferNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
}


message(0xd53276db) TokenExcesses {
    query_id: Int as uint64;
}

// * ------ END Campaign API ------ *
