// parent to child messages
message InternalAdminUpdateFeePercentage{feePercentage: Int as uint32}


// Campaign API
message CreateNewAffiliate{}
message PayAffiliate{
    affiliateId: Int as uint32;
    amount: Int as coins;
}
message AffiliateUserAction{
    affiliateId: Int as uint32;
    userActionOpCode: Int as uint32;
    isPremiumUser: Bool;
}

message AffiliateWithdrawEarnings {
    affiliateId: Int as uint32;
}
message RemoveCampaignAndWithdrawFunds{}

message AdvertiserSetCampaignDetails {
    campaignDetails: CampaignDetails;
}

message AddNewAffiliateToAllowedList{affiliate: Address}

message AdvertiserReplenish {}


// Child to Parent - Internal Messages
message ChildToParentCampaignContractDeployed {
    campaignId: Int as uint32; 
    advertiser: Address;
    campaignContractAddress: Address;
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

message ChildToParentAffiliateUserActionFee {
    campaignId: Int as uint32;
}

message ChildToParentInsufficientCampaignFunds {
    campaignId: Int as uint32;
    advertiser: Address;
    campaignBalance: Int as coins;
    contractBalance: Int as coins;
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
    contractBalance: Int as coins;
}

message AffiliateWithdrawEarningsEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    affiliateId: Int as uint32;
    earnings: Int as coins;
	fee: Int as coins;
}


// Admin functions for parent contract
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

// Parent contract API
message CreateCampaign {}

message UserAction {
    campaignId: Int as uint32;
    affiliateId: Int as uint32;
    userActionOpCode: Int as uint32;
    isPremiumUser: Bool;
}
