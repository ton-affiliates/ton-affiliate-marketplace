import "@stdlib/stoppable";
import "@stdlib/ownable";
import "@stdlib/deploy";
import "./messages.tact";


// constants
const MAX_NUM_AFFILIATES: Int = 20000;  // twenty thousand

// affiliate contract state
const STATE_CAMPAIGN_CREATED: Int = 0;
const STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER: Int = 1;

const DEPLOY_NEW_CAMPAIGN_COST: Int = ton("0.1");

const GAS_FEE: Int = ton("0.02");
const CAMPAIGN_BUFFER: Int = ton("1");

const USER_ACTION_OP_CODES_BOT: Int = 2000;  // 2000 first user action op codes are saved for bot's acrions.  Anything above that is the advertiser's


struct CampaignDetails {
    regularUsersCostPerAction: map<Int, Int>; // op code -> cpa
    premiumUsersCostPerAction: map<Int, Int>; // op code -> cpa
    allowedAffiliates: map<Address, Bool>;  // address -> dummy (closed campaign). Relevant only is 'ifOpenCampaign' is false
    isOpenCampaign: Bool; // anyone can be an affiliate
    campaignValidForNumDays: Int? as uint32; // optional - advetiser can set campaign as valid only for one week
}

struct AffiliateData {
    affiliate: Address;
    userActionsStats: map<Int, Int>;  // stats - user action -> num user actions
    premiumUserActionsStats: map<Int, Int>;  // stats - user action -> num user actions
    accruedEarnings: Int as coins;  // accumulated earnings since the last payment
}

struct CampaignData {
    campaignId: Int as uint32;
    advertiser: Address;
    owner: Address;
    campaignDetails: CampaignDetails;
    numAffiliates: Int as uint32;
    state: Int as uint32;
    campaignStartTimestamp: Int as uint32;
    lastUserActionTimestamp: Int as uint32;
    numUserActions: Int as uint32;
    campaignBalance: Int as coins;
    contractBalance: Int as coins;
    contractAddress: Address;
    feePercentage: Int as uint32;  // 200 for 2 %, 150 for 1.5 % etc...
    campaignHasSufficientFundsToPayMaxCpa: Bool;  // campaignBalance > highest CPA
    isCampaignExpired: Bool;
    isCampaignPausedByAdmin: Bool;
}

// Child contract for each affiliate
contract Campaign with Resumable  {

    owner: Address; // The Resumable trait requires you to add this exact state variable
    stopped: Bool;  // The Resumable trait requires you to add this exact state variable

    campaignId: Int as uint32;

    advertiser: Address;
    campaignDetails: CampaignDetails;

    currAffiliateId: Int as uint32; // runningId
    affiliates: map<Int, AffiliateData>;

    state: Int as uint32;  // state of the contract
    campaignStartTimestamp: Int as uint32; // timestamp of campaign start
    lastUserActionTimestamp: Int as uint32; // timestamp of last user action
    numUserActions: Int as uint32;  // Track number of user actions
    totalAccruedEarnings: Int as coins; // accrued earnings of all affiliates
    maxCpaValue: Int as coins; // minimum balance needed for a campaign to be considered as 'ACTIVE'
    feePercentage: Int as uint32 = 200;  // for affiliates when withdrawing funds. default is 200 which is 2%

    init(owner: Address, campaignId: Int) {

        require(sender() == owner, "owner must be deployer");

        self.owner = owner;
        self.stopped = false;
        self.campaignId = campaignId;
        self.advertiser = owner; // tmp until set details

        self.currAffiliateId = 0;  // running id
        self.affiliates = emptyMap();

        self.campaignDetails = CampaignDetails {
            regularUsersCostPerAction: emptyMap(),
            premiumUsersCostPerAction: emptyMap(),
            allowedAffiliates: emptyMap(),
            isOpenCampaign: false,
            campaignValidForNumDays: null
        };

        self.state = STATE_CAMPAIGN_CREATED;
        self.lastUserActionTimestamp = 0;
        self.campaignStartTimestamp = 0;
        self.numUserActions = 0;
        self.totalAccruedEarnings = 0;
        self.maxCpaValue = ton("0");
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

    receive(msg: ParentToChildUpdateFeePercentage) {
        self.requireOwner();
        self.feePercentage = msg.feePercentage;
    }

    receive(msg: ParentToChildSeizeCampaign) {
        self.requireOwner();
         send(SendParameters{
            to: self.owner,
            body: ChildToParentSeizeCampaign{
                campaignId: self.campaignId
            }.toCell(),
            value: 0,
            mode: SendRemainingBalance
        });
    }

    // Reserve funds for affiliate withdrawals
    fun currentCampaignBalance(): Int {
        let campaignBalance: Int = myBalance() - (self.totalAccruedEarnings + CAMPAIGN_BUFFER);  // can be negative
        return max(campaignBalance, ton("0"));  // if negative return 0
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

    // advetiser sets campaign details 
    receive (msg: AdvertiserSetCampaignDetails) {

        require(self.state == STATE_CAMPAIGN_CREATED, "Must be in state: STATE_CAMPAIGN_CREATED");
        require(context().value > DEPLOY_NEW_CAMPAIGN_COST, "Insufficient funds to repay parent for deployment");

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
                advertiser: self.advertiser
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

        let userActionsStats: map<Int, Int> = emptyMap();
        let premiumUserActionsStats: map<Int, Int> = emptyMap();
        foreach (userActionOpCode, cpa in self.campaignDetails.regularUsersCostPerAction) {
            userActionsStats.set(userActionOpCode, 0);
            premiumUserActionsStats.set(userActionOpCode, 0);
        }

        self.affiliates.set(affiliateId, AffiliateData{affiliate: sender(), userActionsStats: userActionsStats, premiumUserActionsStats: premiumUserActionsStats, accruedEarnings: 0});

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

    receive(msg: AdvertiserRemoveCampaignAndWithdrawFunds) {

        self.requireNotStopped();
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
        require(sender() == self.advertiser, "Only the advertiser can remove the campaign and withdraw all funds");

        let campaignBalance: Int = self.currentCampaignBalance();
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
        
        send(SendParameters{
            to: self.advertiser,
            value: campaignBalance,
            mode: SendPayGasSeparately
        });
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
        let campaignBalance: Int = self.currentCampaignBalance();

        require(campaignBalance >= costPerAction, "Insufficient campaign balance to make payment");

        let newCampaignBalance: Int = campaignBalance - costPerAction;
        
        // process user action - no need to check optional because we set it when advertiser setup the campaign
        if (isPremiumUser) {
            let numActions: Int? = affiliateData.premiumUserActionsStats.get(userActionOpCode);
            affiliateData.premiumUserActionsStats.set(userActionOpCode, numActions!! + 1);
        } else {
            let numActions: Int? = affiliateData.userActionsStats.get(userActionOpCode);
            affiliateData.userActionsStats.set(userActionOpCode, numActions!! + 1);
        }

        // Accumulate the earnings for the affiliate
        affiliateData.accruedEarnings = affiliateData.accruedEarnings + costPerAction;
        self.affiliates.set(affiliateId, affiliateData);  // update affiliate data

        self.lastUserActionTimestamp = now();
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
                    contractBalance: myBalance(),
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

    receive(msg: AffiliateWithdrawEarnings) {

        self.requireNotStopped();

        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Affiliate does not exist");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        require(sender() == affiliateData.affiliate, "Only affiliate can withdraw earnings");

        let paymentAmount: Int = affiliateData.accruedEarnings;
        require(paymentAmount > ton("0"), "No earnings to withdraw");
        require(myBalance() >= paymentAmount, "Insufficient contract funds to make payment");  // should never reach this

        // Reset accrued earnings and update last payment time
        affiliateData.accruedEarnings = ton("0");
        self.affiliates.set(msg.affiliateId, affiliateData);

        // Adjust the total accrued earnings to reflect the withdrawal
        self.totalAccruedEarnings = self.totalAccruedEarnings - paymentAmount;

        // send 2% fee to owner
        let fee: Int = (paymentAmount * self.feePercentage + 9999) / 10000;  // 2% fee calculation

        send(SendParameters{
            to: self.owner,
            body: ChildToParentAffiliateWithdrawEarningsFee{
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                affiliateId: msg.affiliateId,
                earnings: paymentAmount,
                fee: fee
            }.toCell(),
            value: fee,
            mode: SendPayGasSeparately
        });

        send(SendParameters{
            to: affiliateData.affiliate,
            value: paymentAmount - fee,
            bounce: true,
            body: PayAffiliate{affiliateId: msg.affiliateId, amount: paymentAmount}.toCell(),
            mode: SendPayGasSeparately
        });

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
            campaignDetails: self.campaignDetails,
            numAffiliates: self.currAffiliateId,
            campaignStartTimestamp: self.campaignStartTimestamp,
            lastUserActionTimestamp: self.lastUserActionTimestamp,
            numUserActions: self.numUserActions,
            state: self.state,
            campaignBalance: self.currentCampaignBalance(),
            contractBalance: myBalance(),
            contractAddress: myAddress(),
            feePercentage: self.feePercentage,
            campaignHasSufficientFundsToPayMaxCpa: self.campaignHasSufficientFundsToPayMaxCpa(self.currentCampaignBalance()), // ha sufficient balance to pay max CPA
            isCampaignExpired: self.isCampaignExpired(),
            isCampaignPausedByAdmin: self.stopped
        }
    }

    get fun affiliateData(affiliateId: Int): AffiliateData? {
        return self.affiliates.get(affiliateId);
    }

    get fun affiliatesData(affiliateId: Int): map<Int, AffiliateData> {
        return self.affiliates;
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
        let initCode: StateInit = initOf Campaign(myAddress(), campaignId);
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
            contractBalance: msg.contractBalance,
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

    // receive("Resume") is added automatically to allow owner to resume the contract
    // receive("Stop") is added automatically to allow owner to stop the contract
    // get fun stopped(): Bool is added automatically to query if contract is stopped
    // get fun owner(): Address is added automatically to query who the owner is
}