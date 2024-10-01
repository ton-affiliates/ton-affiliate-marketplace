
message InternalCreateCampaign{
    campaignId: Int as uint32; 
    advertiser: Address;
}

message InternalCampaignContractDeployed {
    campaignId: Int as uint32; 
    advertiser: Address;
    campaignContractAddress: Address;
}

message AdvertiserSetCampaignDetails {
    campaignDetails: CampaignDetails;
}

message AddNewAffiliateToAllowedList{affiliate: Address}
message AdvertiserReplenish {}

message CreateNewAffiliate{}
message UpdateFeePercentage{feePercentage: Int as uint32}
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


message InternalAffiliateWithdrawEarningsFee {
    campaignId: Int as uint32;
    advertiser: Address;
    affiliateId: Int as uint32;
    earnings: Int as coins;
	fee: Int as coins;
}

message InternalAdvertiserReplenishFee {
    campaignId: Int as uint32;
    advertiser: Address;
    replenishAmount: Int as coins;
    fee: Int as coins;
}

message AdvertiserReplenisEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    replenishAmount: Int as coins;
    fee: Int as coins;
}

message InternalAffiliateUserAction {
    campaignId: Int as uint32;
    advertiser: Address;
    campaginBalance: Int as coins;
    campaignBalanceNotifyAdvertiserThreshold: Int as coins;
}

message CampaignBalnceUnderThresholdEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    campaginBalance: Int as coins;
}

message InternalInsufficientCampaignFunds {
    campaignId: Int as uint32;
    advertiser: Address;
    campaginBalance: Int as coins;
    contractBalance: Int as coins;
}

message InternalRemoveCampaign {
    campaignId: Int as uint32;
    advertiser: Address;
    campaginBalance: Int as coins;
    contractBalance: Int as coins;
}

message CampaignRemovedEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    campaginBalance: Int as coins;
    contractBalance: Int as coins;
}

message InternalAffiliateCreated {
    campaignId: Int as uint32;
    affiliateId: Int as uint32;
    advertiser: Address;
    affiliate: Address;
}

message AdminWithdraw {
    amount: Int as coins;
    wallets: map<Address, Bool>;
}

message AdminReplenish {}

message CreateCampaign {}

message UserAction {
    campaignId: Int as uint32;
    affiliateId: Int as uint32;
    advertiser: Address;
    userActionOpCode: Int as uint32;
    isPremiumUser: Bool;
}

// events
message CampaignCreatedEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    campaignContractAddress: Address;
}

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

message AffiliateCreatedEvent {
    campaignId: Int as uint32;
    affiliateId: Int as uint32;
    advertiser: Address;
    affiliate: Address;
}

message InsufficientCampaignFundsEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    campaginBalance: Int as coins;
    contractBalance: Int as coins;
}

message AffiliateWithdrawEarningsEvent {
    campaignId: Int as uint32;
    advertiser: Address;
    affiliateId: Int as uint32;
    earnings: Int as coins;
	fee: Int as coins;
}
