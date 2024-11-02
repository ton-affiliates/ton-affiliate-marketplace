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

// Events - always emitted from parent contract
message AdvertiserWithdrawFundsEvent{
    campaignId: Int as uint32;
    advertiser: Address;
    campaignBalance: Int as coins;
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

message CampaignBalanceUnderFiveTonEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    campaignBalance: Int as coins;
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

// Bot functions
message BotDeployNewCampaign {}

message BotUserAction {
    campaignId: Int as uint32;
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

// Advertiser API
message AdvertiserWithdrawFunds{}

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
    campaignBalance: Int as coins;
}

message ChildToParentCampaignBalanceUnderFiveTon {
    campaignId: Int as uint32;
    advertiser: Address;
    campaignBalance: Int as coins;
}

message ChildToParentBotUserActionFee {
    campaignId: Int as uint32;
}

message ChildToParentInsufficientCampaignFunds {
    campaignId: Int as uint32;
    advertiser: Address;
    campaignBalance: Int as coins;
    maxCpaValue: Int as coins;
}

// * ------ END Campaign API ------ *

