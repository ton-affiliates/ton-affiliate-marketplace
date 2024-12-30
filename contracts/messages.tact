// * ------ AffiliateMarketplace API ------ *

// Admin functions 
message AdminWithdraw {
    amount: Int as coins;
    wallets: map<Address, Bool>;
}

message AdminUpdateFeeBalance {
    advertiserFeePercentage: Int as uint32;  // 200 = 2% fee
    affiliateFeePercentage: Int as uint32; // 200 = 2% fee
}

message AdminReplenish {}

message AdminModifyCampaignFeePercentage {
    campaignId: Int as uint32;
	advertiser: Address;
    feePercentage: Int as uint32;
}

message AdminStopCampaign {
	campaignId: Int as uint32;
	advertiser: Address;
}

message AdminResumeCampaign {
	campaignId: Int as uint32;
	advertiser: Address;
}

message AdminSeizeCampaignBalance {
    campaignId: Int as uint32;
	advertiser: Address;
}

message AdminJettonNotificationMessageFailure {
	campaignId: Int as uint32;
	advertiser: Address;
	amount: Int as coins;
}

message AdminWithdrawUSDTToPayout {
	campaignId: Int as uint32;
	advertiser: Address;
	amount: Int as coins;
}

message AdminPayAffiliateUSDTBounced {
	campaignId: Int as uint32;
	advertiser: Address;
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
	advertiser: Address;
    campaignContractAddress: Address;
}

message AdvertiserSignedCampaignDetailsEvent {
	campaignId: Int as uint32;
	advertiser: Address;
}

message AffiliateCreatedEvent {
    campaignId: Int as uint32;
	advertiser: Address;
    affiliateId: Int as uint32;
    affiliate: Address;
    state: Int as uint8;
}

message AdvertiserRemovedAffiliateEvent {
	campaignId: Int as uint32;
    advertiser: Address;
    affiliateId: Int as uint32;
    affiliate: Address;
}

message AdvertiserApprovedAffiliateListEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    affiliateId: Int as uint32;
    affiliate: Address;
}

//---------------------------------------------------------------------------------------------

message AdvertiserDeployNewCampaign {}

// parent to child INTERNAL messages
message ParentToChildDeployCampaign {
    campaignId: Int as uint32;
	advertiser: Address;
}

message ParentToChildUpdateFeePercentage{
    feePercentage: Int as uint32
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

// Bot functions
message BotUserAction {
    affiliateId: Int as uint32;
    userActionOpCode: Int as uint32;
    isPremiumUser: Bool;
}

// Affiliate API
message PayAffiliate{
    affiliateId: Int as uint32;
    amount: Int as coins;
}

message AffiliateCreateNewAffiliate{}
message AffiliateWithdrawEarnings {
    affiliateId: Int as uint32;
}

// Advertiser API
message AdvertiserWithdrawFunds{
	amount: Int as coins;
}

message AdvertiserAddNewUserOpCode {
	userOpCode: Int as uint32;
    isPremiumUserOpCode: Bool;
    costPerAction: Int as coins;
}

message AdvertiserSetCampaignDetails {
    campaignDetails: CampaignDetails;
}

message AdvertiserUserAction {
    affiliateId: Int as uint32;
    userActionOpCode: Int as uint32;
    isPremiumUser: Bool;
} 

message AdvertiserRemoveAffiliate {
    affiliateId: Int as uint32;
}

message AdvertiserApproveAffiliate{
    affiliateId: Int as uint32;
}

message AdvertiserReplenish {}
message AdvertiserReplenishGasFeesForUSDTCampaign{}

message AdvertiserSignOffWithdraw {
	setAffiliatesWithdrawEarnings: map<Int, Int>;  // affiliateId -> withdrawalAmount
}

// Child to Parent - INTERNAL Messages
message ChildToParentCampaignDeployedSuccessfully {
    campaignId: Int as uint32; 
	advertiser: Address;
}

message ChildToParentAffiliateCreated {
    campaignId: Int as uint32;
    affiliateId: Int as uint32;
    advertiser: Address;
    affiliate: Address;
    state: Int as uint8;  // 0 - ACTIVE, 1 - PENDING_APPROVAL
}

message ChildToParentAdvertiserSignedCampaignDetails {
    campaignId: Int as uint32;
    advertiser: Address;
}

message ChildToParentAdvertiserWithdrawFunds{
    campaignId: Int as uint32;
    advertiser: Address;
    amount: Int as coins;
}

message ChildToParentAdvertiserApprovedAffiliate {
    campaignId: Int as uint32;
    advertiser: Address;
    affiliateId: Int as uint32;
    affiliate: Address;
}

message ChildToParentAdvertiserRemovedAffiliate {
    campaignId: Int as uint32;
    advertiser: Address;
    affiliateId: Int as uint32;
    affiliate: Address;
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

