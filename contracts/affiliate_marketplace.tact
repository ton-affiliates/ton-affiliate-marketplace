import "@stdlib/stoppable";
import "@stdlib/ownable";
import "@stdlib/deploy";
// import "./messages.tact";
import "./jettonWallet.tact";

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



// constants
const MAX_NUM_AFFILIATES: Int = 20000;
const STATE_CAMPAIGN_CREATED: Int = 0;
const STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER: Int = 1;

const DEPLOY_NEW_CAMPAIGN_COST: Int = ton("0.1");
const GAS_FEE: Int = ton("0.01");
const CAMPAIGN_BUFFER: Int = ton("1");

const USER_ACTION_OP_CODES_BOT: Int = 2000;

// Payment method options
const PAYMENT_METHOD_TON: Int = 0;
const PAYMENT_METHOD_USDT: Int = 1;

struct CampaignDetails {
    regularUsersCostPerAction: map<Int, Int>; // op code -> cpa
    premiumUsersCostPerAction: map<Int, Int>; // op code -> cpa
    allowedAffiliates: map<Address, Bool>;  // closed campaign affiliates list
    isOpenCampaign: Bool; // anyone can be an affiliate
    campaignValidForNumDays: Int? as uint32; // optional - campaign expiry period
    paymentMethod: Int as uint32; // TON (0) or USDT (1)
}

struct UserActionStats {
    numActions: Int as uint32;
    lastUserActionTimestamp: Int as uint32;
}

struct AffiliateData {
    affiliate: Address;
    userActionsStats: map<Int, UserActionStats>;
    premiumUserActionsStats: map<Int, UserActionStats>;
    accruedEarnings: Int as coins;
    lastWithdrawlAmount: Int as coins;
    lastWithdrawlTimestamp: Int as uint32;
}

struct CampaignData {
    campaignId: Int as uint32;
    advertiser: Address;
    owner: Address;
    payout: Address;
    campaignDetails: CampaignDetails;
    numAffiliates: Int as uint32;
    totalAccruedEarnings: Int as coins;
    state: Int as uint32;
    campaignStartTimestamp: Int as uint32;
    lastUserActionTimestamp: Int as uint32;
    numUserActions: Int as uint32;
    campaignBalance: Int as coins;
    contractBalance: Int as coins;
    contractTonBalance: Int as coins;
    contractUSDTBalance: Int as coins; // NEW: USDT balance tracked manually
    contractAddress: Address;
    feePercentage: Int as uint32;
    campaignHasSufficientFundsToPayMaxCpa: Bool;
    isCampaignExpired: Bool;
    isCampaignPausedByAdmin: Bool;
}

struct JettonWalletData {
    status: Int as uint4;
    balance: Int as coins;
    ownerAddress: Address;
    jettonMasterAddress: Address;
}


fun calculateJettonWalletAddress(ownerAddress: Address, jettonMasterAddress: Address, jettonWalletCode: Cell): Address {
    
    let initData = JettonWalletData{
        status: 0,
        balance: 0,
        ownerAddress,
        jettonMasterAddress,
    };

    return contractAddress(StateInit{code: jettonWalletCode, data: initData.toCell()});
}

//https://github.com/Ton-Dynasty/tondynasty-contracts/blob/main/contracts/jetton_example.tact
contract ExampleJettonWallet with JettonWallet {
    balance: Int as coins = 0;
    owner: Address;
    jetton_master: Address;

    init(owner: Address, jetton_master: Address) {
        self.owner = owner;
        self.jetton_master = jetton_master;
    }

    override inline fun calculate_jetton_wallet_init(owner_address: Address): StateInit {
        return initOf ExampleJettonWallet(owner_address, self.jetton_master);
    }
}

// Child contract for each affiliate
contract Campaign with Resumable {

    owner: Address;
    stopped: Bool;

    campaignId: Int as uint32;
    payout: Address;
    advertiser: Address;
    campaignDetails: CampaignDetails;

    currAffiliateId: Int as uint32;
    affiliates: map<Int, AffiliateData>;

    state: Int as uint32;
    campaignStartTimestamp: Int as uint32;
    lastUserActionTimestamp: Int as uint32;
    numUserActions: Int as uint32;
    totalAccruedEarnings: Int as coins;
    maxCpaValue: Int as coins;
    feePercentage: Int as uint32 = 200;

    usdtMasterAddress: Address; 
    usdtWalletCode: Cell;
    contractUSDTBalance: Int as coins;
    contractUsdtJettonWallet: Address;

    init(owner: Address, campaignId: Int, payout: Address) {
        
        require(sender() == owner, "owner must be deployer");

        self.owner = owner;
        self.payout = payout;
        self.stopped = false;
        self.campaignId = campaignId;
        self.advertiser = owner; // temporary until set

        self.currAffiliateId = 0; 
        self.affiliates = emptyMap();

        self.campaignDetails = CampaignDetails {
            regularUsersCostPerAction: emptyMap(),
            premiumUsersCostPerAction: emptyMap(),
            allowedAffiliates: emptyMap(),
            isOpenCampaign: false,
            campaignValidForNumDays: null,
            paymentMethod: PAYMENT_METHOD_TON // Default to TON
        };

        self.state = STATE_CAMPAIGN_CREATED;
        self.lastUserActionTimestamp = 0;
        self.campaignStartTimestamp = 0;
        self.numUserActions = 0;
        self.totalAccruedEarnings = 0;
        self.maxCpaValue = ton("0");

        let usdtMasterAddress = address("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs");
        self.usdtMasterAddress =  usdtMasterAddress;// mainnet address of USDT

        let init: StateInit = initOf ExampleJettonWallet(myAddress(), usdtMasterAddress);
        let walletCode = init.code;
        self.usdtWalletCode = walletCode;
        self.contractUsdtJettonWallet = calculateJettonWalletAddress(myAddress(), usdtMasterAddress, walletCode);
        self.contractUSDTBalance = 0;
    }

    // piggyback on this message for deployment
    receive(msg: ParentToChildDeployCampaign) {
        
        // dump(msg.campaignId);  // for debugging
        
         // notify parent that contract was successfully deployed
        send(SendParameters{
            to: self.owner,
            body: ChildToParentCampaignDeployedSuccessfully{
                campaignId: self.campaignId
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });
    }

    // Function to calculate campaign balance (supports TON and USDT)
    fun calcCampaignBalance(): Int {
        let campaignBalance: Int = self.calcContractBalance() - self.totalAccruedEarnings;
        return max(campaignBalance, ton("0"));
    }

    // Helper function to calculate contract balance (TON case)
    fun calcContractBalance(): Int {
        if (self.campaignDetails.paymentMethod == PAYMENT_METHOD_TON) {
            let contractBalance: Int = myBalance() - CAMPAIGN_BUFFER;
            return max(contractBalance, ton("0"));
        } else {
            return self.contractUSDTBalance
        }
    }

    fun isCampaignExpired(): Bool {
        if (self.campaignDetails.campaignValidForNumDays == null) {
            return false;
        } else {
            return now() - self.campaignStartTimestamp > self.campaignDetails.campaignValidForNumDays!! * (24*60*60);
        }
    }

    fun campaignHasSufficientFundsToPayMaxCpa(campaignBalance: Int): Bool {
        return campaignBalance > self.maxCpaValue;
    }

    fun transferJettonUSDT(to: Address, amount: Int) {        
        send(SendParameters{
            to: self.contractUsdtJettonWallet,  // The Jetton wallet to send from
            value: ton("0.05"),  // This TON is for paying for gas fees of the transfer
            body: JettonTransfer{
                query_id: 42,
                amount: amount,  // Jetton amount to transfer
                destination: to,  // The recipient of the Jettons (owner of the jetton wallet)
                response_destination: myAddress(),  // Set the contract as the destination to receive any excess TON
                custom_payload: null,  // For simple transfers, this can be null
                forward_ton_amount: ton("0.1"),  // The TON amount forwarded to cover the recipient's processing cost
                forward_payload: rawSlice("F")  // Simple forward payload for the transfer
            }.toCell(),
            mode: SendPayGasSeparately
        }); 
    }

    // receive any amount of incoming TON
    receive() {}

    // Function to track received USDT Jettons and update balance
    receive(msg: JettonTransferNotification) {
        
        require(msg.sender == self.contractUsdtJettonWallet, "Only USDT Jetton transfers allowed");
        
        // Update the USDT balance in the state
        self.contractUSDTBalance = self.contractUSDTBalance + msg.amount;
    }

    // Function to handle affiliate withdrawals (supports both TON and USDT)
    receive(msg: AffiliateWithdrawEarnings) {
        
        self.requireNotStopped();

        require(context().value >= GAS_FEE*3, "Insufficient funds to pay gas");

        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Affiliate does not exist");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        require(sender() == affiliateData.affiliate, "Only affiliate can withdraw earnings");

        let paymentAmount: Int = affiliateData.accruedEarnings;
        require(paymentAmount > 0, "No earnings to withdraw");

        require(self.calcContractBalance() >= paymentAmount, "Insufficient contract funds for payment");

        // send 2% fee to owner
        let fee: Int = (paymentAmount * self.feePercentage + 9999) / 10000;  // fee=200 = 2%

        // Reset accrued earnings
        affiliateData.accruedEarnings = ton("0");
        affiliateData.lastWithdrawlAmount = paymentAmount - fee;
        affiliateData.lastWithdrawlTimestamp = now();
        self.affiliates.set(msg.affiliateId, affiliateData);

        self.totalAccruedEarnings = self.totalAccruedEarnings - paymentAmount;

        // Handle the payment based on the payment method
        if (self.campaignDetails.paymentMethod == PAYMENT_METHOD_TON) {

            // fee
            send(SendParameters{
                to: self.payout,
                value: fee,
                bounce: true,
                mode: SendPayGasSeparately
            });

            // Payment in TON
            send(SendParameters{
                to: affiliateData.affiliate,
                value: paymentAmount - fee,
                bounce: true,
                body: PayAffiliate{affiliateId: msg.affiliateId, amount: paymentAmount}.toCell(),
                mode: SendPayGasSeparately
            });

        } else {
            
            // fee also in USDT
            self.transferJettonUSDT(self.payout, fee);

            // Payment in USDT Jetton 
            self.transferJettonUSDT(affiliateData.affiliate, paymentAmount - fee);

            // Deduct amount from the contract's USDT balance
            self.contractUSDTBalance = self.contractUSDTBalance - paymentAmount;
        }
    }

    receive(msg: ParentToChildUpdateFeePercentage) {
        self.requireOwner();
        self.feePercentage = msg.feePercentage;
    }

    receive(msg: ParentToChildSeizeCampaign) {
        
        self.requireOwner();

        let contractBalance = self.calcContractBalance();

        // Check for TON or USDT based on the payment method
        if (self.campaignDetails.paymentMethod == PAYMENT_METHOD_TON) { 
            send(SendParameters{
                to: self.payout,
                body: ChildToParentSeizeCampaign{
                    campaignId: self.campaignId
                }.toCell(),
                value: contractBalance,
                mode: SendPayGasSeparately
            });
        } else {
            self.transferJettonUSDT(self.payout, contractBalance);
        }
    }

    // advetiser sets campaign details 
    receive (msg: AdvertiserSetCampaignDetails) {

        require(self.state == STATE_CAMPAIGN_CREATED, "Must be in state: STATE_CAMPAIGN_CREATED");
        require(context().value > DEPLOY_NEW_CAMPAIGN_COST + GAS_FEE + CAMPAIGN_BUFFER, "Insufficient funds to repay parent for deployment and keep buffer");
        require(msg.campaignDetails.paymentMethod == PAYMENT_METHOD_TON || msg.campaignDetails.paymentMethod == PAYMENT_METHOD_USDT, "Only TON or USDT supported as payment methods");
        
        // verify keys are the same in both sets
        // get maxCpaValue
        let maxCpaValue: Int = ton("0");
        foreach (key, val in msg.campaignDetails.regularUsersCostPerAction) {
            require(msg.campaignDetails.premiumUsersCostPerAction.get(key) != null, "OP codes for regular and premium users must match");
            if (val > maxCpaValue) {
                maxCpaValue = val;
            }
        }

        foreach (key, val in msg.campaignDetails.premiumUsersCostPerAction) {
            require(msg.campaignDetails.regularUsersCostPerAction.get(key) != null, "OP codes for regular and premium users must match");
            if (val > maxCpaValue) {
                maxCpaValue = val;
            }
        }

        self.advertiser = sender();
        self.maxCpaValue = maxCpaValue;
        self.campaignDetails = msg.campaignDetails;
        self.campaignStartTimestamp = now();
        self.state = STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER;

        // return deploy costs to parent
        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserDeplyContractFee{
                campaignId: self.campaignId,
                advertiser: sender()
            }.toCell(),
            value: DEPLOY_NEW_CAMPAIGN_COST + GAS_FEE,
            mode: SendPayGasSeparately
        });
    }

    // Function to handle advertiser replenishment
    receive(msg: AdvertiserReplenish) {
        self.requireNotStopped();
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
        require(sender() == self.advertiser, "Only the advertiser can replenish the contract");
    }


    receive(msg: AffiliateCreateNewAffiliate) {

        self.requireNotStopped();
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
        require(!self.isCampaignExpired(), "Campaign is expired");

        let numAffiliates = self.currAffiliateId;
        require(numAffiliates <= MAX_NUM_AFFILIATES, "Reached max number of affiliates for this campagn");

        if (!self.campaignDetails.isOpenCampaign) {
            require(self.campaignDetails.allowedAffiliates.get(sender()) != null, "affiliate not on allowed list");
        }

        let affiliateId = self.currAffiliateId;
        self.currAffiliateId = self.currAffiliateId + 1;

        let userActionsStats: map<Int, UserActionStats> = emptyMap();
        let premiumUserActionsStats: map<Int, UserActionStats> = emptyMap();
        foreach (userActionOpCode, cpa in self.campaignDetails.regularUsersCostPerAction) {
            userActionsStats.set(userActionOpCode, UserActionStats{numActions: 0, lastUserActionTimestamp: 0});
            premiumUserActionsStats.set(userActionOpCode, UserActionStats{numActions: 0, lastUserActionTimestamp: 0});
        }

        self.affiliates.set(affiliateId, AffiliateData{
            affiliate: sender(), 
            userActionsStats: userActionsStats, 
            premiumUserActionsStats: premiumUserActionsStats, 
            accruedEarnings: ton("0"),
            lastWithdrawlAmount: ton("0"),
            lastWithdrawlTimestamp: 0
        });

        // notify parent
        send(SendParameters{
            to: self.owner,
            body: ChildToParentAffiliateCreated{
                campaignId: self.campaignId,
                affiliateId: affiliateId,
                advertiser: self.advertiser,
                affiliate: sender()
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });
    }

    receive(msg: AdvertiserAddNewAffiliateToAllowedList) {

        self.requireNotStopped();
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
        require(!self.isCampaignExpired(), "Campaign is expired");

        // Ensure only the advertiser can invoke this function
        require(sender() == self.advertiser, "Only the advertiser can add a new affiliate");

        // Check if the campaign is not open (closed campaign)
        require(!self.campaignDetails.isOpenCampaign, "Cannot manually add affiliates to an open campaign");

        // Add the new affiliate to the allowed affiliates list
        self.campaignDetails.allowedAffiliates.set(msg.affiliate, true);

    }

    receive(msg: AdvertiserWithdrawFunds) {

        self.requireNotStopped();
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
        require(sender() == self.advertiser, "Only the advertiser can remove the campaign and withdraw all funds");

        let campaignBalance: Int = self.calcCampaignBalance();
        require(campaignBalance > ton("0"), "Campaign has no funds");

        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserWithdrawFunds {
                campaignId: self.campaignId,
                campaignBalance: campaignBalance,
                advertiser: self.advertiser
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });

        // Check for TON or USDT based on the payment method
        if (self.campaignDetails.paymentMethod == PAYMENT_METHOD_TON) { 
            send(SendParameters{
                to: self.advertiser,
                value: campaignBalance,
                mode: SendPayGasSeparately
            });
        } else {
            self.transferJettonUSDT(self.advertiser, campaignBalance);
        }
    }

    receive(msg: ParentToChildBotUserAction) {

        self.requireOwner();
        require(msg.userActionOpCode <= USER_ACTION_OP_CODES_BOT, "Bot can verify only op codes under 2000");

        self.applyUserAction(msg.userActionOpCode, msg.affiliateId, msg.isPremiumUser);

        // return gas fees to owner
        send(SendParameters{
            to: self.owner,
            body: ChildToParentBotUserActionFee{
                campaignId: self.campaignId
            }.toCell(),
            value: GAS_FEE*2,  // return gas fee paid by the owner contract
            mode: SendPayGasSeparately
        });
        
    }

    receive(msg: AdvertiserUserAction) {
        
        require(sender() == self.advertiser, "Only advertiser can verify these events");
        require(msg.userActionOpCode > USER_ACTION_OP_CODES_BOT, "Advertiser can verify only op codes over 2000");

        self.applyUserAction(msg.userActionOpCode, msg.affiliateId, msg.isPremiumUser);
    }

    fun applyUserAction(userActionOpCode: Int, affiliateId: Int, isPremiumUser: Bool): Bool {

        self.requireNotStopped();
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
        require(!self.isCampaignExpired(), "Campaign is expired");

        let affiliateDataOptional = self.affiliates.get(affiliateId);
        require(affiliateDataOptional != null, "Affiliate does not exist");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        let cpaOptional: Int? = null;
        if (isPremiumUser) {
            cpaOptional = self.campaignDetails.premiumUsersCostPerAction.get(userActionOpCode);
        } else {
            cpaOptional = self.campaignDetails.regularUsersCostPerAction.get(userActionOpCode);
        }

        require(cpaOptional != null, "Cannot find cpa for the given op code");

        let costPerAction: Int = cpaOptional!!;
        let campaignBalance: Int = self.calcCampaignBalance();

        require(campaignBalance >= costPerAction, "Insufficient campaign balance to make payment");

        let newCampaignBalance: Int = campaignBalance - costPerAction;
        
        // process user action - no need to check optional because we set it when advertiser setup the campaign
        let currTime: Int = now();
        if (isPremiumUser) {
            let userActionStats: UserActionStats = affiliateData.premiumUserActionsStats.get(userActionOpCode)!!;
            userActionStats.numActions = userActionStats.numActions + 1;
            userActionStats.lastUserActionTimestamp = currTime; 
            affiliateData.premiumUserActionsStats.set(userActionOpCode, userActionStats);
        } else {
            let userActionStats: UserActionStats = affiliateData.userActionsStats.get(userActionOpCode)!!;
            userActionStats.numActions = userActionStats.numActions + 1;
            userActionStats.lastUserActionTimestamp = currTime; 
            affiliateData.userActionsStats.set(userActionOpCode, userActionStats);
        }

        // Accumulate the earnings for the affiliate
        affiliateData.accruedEarnings = affiliateData.accruedEarnings + costPerAction;
        self.affiliates.set(affiliateId, affiliateData);  // update affiliate data

        self.lastUserActionTimestamp = currTime;
        self.numUserActions = self.numUserActions + 1;
        self.totalAccruedEarnings = self.totalAccruedEarnings + costPerAction;

        // messages
        if (!self.campaignHasSufficientFundsToPayMaxCpa(newCampaignBalance)) {
            send(SendParameters{
                to: self.owner,
                body: ChildToParentInsufficientCampaignFunds {
                    campaignId: self.campaignId,
                    advertiser: self.advertiser,
                    campaignBalance: newCampaignBalance,
                    maxCpaValue: self.maxCpaValue
                }.toCell(),
                value: GAS_FEE,
                mode: SendPayGasSeparately
            });
        } 
        
        if (newCampaignBalance < ton("5")) {
            send(SendParameters{
                to: self.owner,
                body: ChildToParentCampaignBalanceUnderFiveTon {
                    campaignId: self.campaignId,
                    advertiser: self.advertiser,
                    campaignBalance: newCampaignBalance
                }.toCell(),
                value: GAS_FEE,
                mode: SendPayGasSeparately
            });
        }

        return true;

    }

    // if payment bounces - adjust the affiliate's accruedEarnings and totalAccruedEarnings accordingly
    bounced(msg: PayAffiliate) {

        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Affiliate does not exist");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        affiliateData.accruedEarnings = affiliateData.accruedEarnings + msg.amount;

        self.affiliates.set(msg.affiliateId, affiliateData);

        self.totalAccruedEarnings = self.totalAccruedEarnings + msg.amount;
    }

    get fun campaignData(): CampaignData {
        return CampaignData {
            campaignId: self.campaignId,
            advertiser: self.advertiser,
            owner: self.owner,
            payout: self.payout,
            campaignDetails: self.campaignDetails,
            numAffiliates: self.currAffiliateId,
            totalAccruedEarnings: self.totalAccruedEarnings,
            campaignStartTimestamp: self.campaignStartTimestamp,
            lastUserActionTimestamp: self.lastUserActionTimestamp,
            numUserActions: self.numUserActions,
            state: self.state,
            campaignBalance: self.calcCampaignBalance(),
            contractBalance: self.calcContractBalance(),
            contractTonBalance: myBalance(),
            contractUSDTBalance: self.contractUSDTBalance,
            contractAddress: myAddress(),
            feePercentage: self.feePercentage,
            campaignHasSufficientFundsToPayMaxCpa: self.campaignHasSufficientFundsToPayMaxCpa(self.calcCampaignBalance()), // ha sufficient balance to pay max CPA
            isCampaignExpired: self.isCampaignExpired(),
            isCampaignPausedByAdmin: self.stopped
        }
    }

    get fun affiliateData(affiliateId: Int): AffiliateData? {
        return self.affiliates.get(affiliateId);
    }

    get fun affiliatesData(): map<Int, AffiliateData> {
        return self.affiliates;
    }

    get fun hundredAffiliatesDataFromIdx(idx: Int): map<Int, AffiliateData> {
        let hundredAffiliates: map<Int, AffiliateData> = emptyMap();
        let i: Int = 0;
        repeat (100) {  
            hundredAffiliates.set(idx + i, self.affiliates.get(idx + i));
            i = i + 1;
        }
        return hundredAffiliates;
    }
	
	get fun balance(): Int {
        return myBalance(); // in nano-tons (like cents, just with 9 decimals)
    }
}


// owner Contract
contract AffiliateMarketplace with Deployable, Resumable  {

    // state
    owner: Address;
    stopped: Bool;
    bot: Address;

    currCampaignId: Int as uint32;  // running id

    // Constructor
    init(bot: Address) {
        self.owner = sender();
        self.stopped = false;
        self.bot = bot;
        self.currCampaignId = 0; // running id
    }

    get fun balance(): Int {
        return myBalance(); // in nano-tons (like cents, just with 9 decimals)
    }

    get fun bot(): Address {
        return self.bot; 
    }

    get fun numCampaigns(): Int {
        return self.currCampaignId; 
    }

    get fun campaignContractAddress(campaignId: Int): Address {
        return contractAddress(self.campaignContractStateInit(campaignId));
    }

    fun campaignContractStateInit(campaignId: Int): StateInit {
        let initCode: StateInit = initOf Campaign(myAddress(), campaignId, self.owner);
        return initCode;
    }

    receive(msg: AdminReplenish) {
        self.requireOwner();
    }

    receive(msg: AdminWithdraw) {

        self.requireOwner();

        let buffer: Int = ton("1");
        require(myBalance() >= msg.amount + buffer, "Insufficient contract funds to make payment");

        let numWallets: Int = 0;
        foreach(wallet,v in msg.wallets) {
            numWallets = numWallets + 1;
        }

        require(numWallets > 0, "Must have at least one wallet to withdraw to");

        let fraction: Int = msg.amount;
        if (numWallets > 1) {
            fraction = fraction / numWallets;
        }

        foreach(wallet,v in msg.wallets) {
            send(SendParameters{
                to: wallet,
                bounce: true,
                value: fraction,
                mode: SendPayGasSeparately
            });
        }
    }

    receive(msg: AdminModifyCampaignFeePercentage) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: ParentToChildUpdateFeePercentage{
                feePercentage: msg.feePercentage
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });
    }

    receive(msg: AdminStopCampaign) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: "Stop".asComment(), 
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });
    }

    receive(msg: AdminResumeCampaign) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: "Resume".asComment(), 
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });
    }

    receive(msg: AdminSeizeCampaignBalance) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: ParentToChildSeizeCampaign{}.toCell(), 
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });
    }

    receive(msg: ChildToParentBotUserActionFee) {
        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
        require(sender() == expectedAddress, "Access denied");
    }

    receive(msg: ChildToParentAdvertiserWithdrawFunds) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
        require(sender() == expectedAddress, "Access denied");

        emit(AdvertiserWithdrawFundsEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            campaignBalance: msg.campaignBalance}.toCell());

    }

    receive(msg: ChildToParentInsufficientCampaignFunds) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
        require(sender() == expectedAddress, "Access denied");

        emit(InsufficientCampaignFundsEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            campaignBalance: msg.campaignBalance,
            maxCpaValue: msg.maxCpaValue
        }.toCell());
    }

    receive(msg: ChildToParentCampaignBalanceUnderFiveTon) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
        require(sender() == expectedAddress, "Access denied");

        emit(CampaignBalanceUnderFiveTonEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            campaignBalance: msg.campaignBalance
        }.toCell());
    }

    receive(msg: ChildToParentAffiliateWithdrawEarningsFee) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
        require(sender() == expectedAddress, "Access denied");

        emit(AffiliateWithdrawEarningsEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            affiliateId: msg.affiliateId,
            earnings: msg.earnings,
            fee: msg.fee
        }.toCell());
    }

    receive(msg: ChildToParentAdvertiserDeplyContractFee) {
        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
        require(sender() == expectedAddress, "Access denied");

        emit(AdvertiserSignedCampaignDetailsEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser
        }.toCell());
    }

    receive(msg: ChildToParentAffiliateCreated) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
        require(sender() == expectedAddress, "Access denied");

        emit(AffiliateCreatedEvent{
            campaignId: msg.campaignId,
            affiliateId: msg.affiliateId,
            advertiser: msg.advertiser,
            affiliate: msg.affiliate
        }.toCell());

    }

    // Function to create a new campaign
    receive(msg: BotDeployNewCampaign) {
		
		self.requireNotStopped();
        require(sender() == self.bot, "Only bot can Deploy new Campaign");

        let campaignId = self.currCampaignId;
        self.currCampaignId = campaignId + 1;

        let init: StateInit = self.campaignContractStateInit(campaignId);
        let campaignContractAddress: Address = contractAddress(init);

        // deploy contract
        send(SendParameters{
            to: campaignContractAddress,
            value: DEPLOY_NEW_CAMPAIGN_COST,
            code: init.code,
            data: init.data,
            body: ParentToChildDeployCampaign{campaignId: campaignId}.toCell(),
            mode: SendPayGasSeparately
        });
    }

    receive(msg: ChildToParentCampaignDeployedSuccessfully) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
        require(sender() == expectedAddress, "Access denied");

        emit(CampaignCreatedEvent{
            campaignId: msg.campaignId,
            campaignContractAddress: expectedAddress
        }.toCell());
    }

    receive(msg: ChildToParentSeizeCampaign) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
        require(sender() == expectedAddress, "Access denied");

        emit(CampaignSeizedEvent{
            campaignId: msg.campaignId,
            amountSeized: context().value
        }.toCell());
    } 

    // Function to handle user click
    receive(msg: BotUserAction) {

        self.requireNotStopped();
        require(sender() == self.bot, "Only bot can invoke User Actions");

        let init: StateInit = self.campaignContractStateInit(msg.campaignId);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: ParentToChildBotUserAction{
                affiliateId: msg.affiliateId,
                userActionOpCode: msg.userActionOpCode,
                isPremiumUser: msg.isPremiumUser
            }.toCell(),
            value: GAS_FEE*2,
            mode: SendPayGasSeparately
        });
    }

    // receive any amount of incoming TON
    receive() {}

    // receive("Resume") is added automatically to allow owner to resume the contract
    // receive("Stop") is added automatically to allow owner to stop the contract
    // get fun stopped(): Bool is added automatically to query if contract is stopped
    // get fun owner(): Address is added automatically to query who the owner is
}