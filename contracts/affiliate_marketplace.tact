import "@stdlib/stoppable";
import "@stdlib/ownable";
import "@stdlib/deploy";
import "./messages.tact";

// constants
const MAX_NUM_AFFILIATES: Int = 10000;  // ten thousand
const MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS: Int = 21;

// affiliate contract state
const STATE_CAMPAIGN_CREATED: Int = 0;
const STATE_CAMPAIGN_INACTIVE: Int = 1;
const STATE_CAMPAIGN_ACTIVE: Int = 2;

const DEPLOY_NEW_CAMPAIGN_COST: Int = ton("0.1");
const MAX_MESSAGE_VAL_NO_REPLENISH: Int = ton("0.15");
const MIN_AMOUNT_REPLENISH_CAMPAIGN: Int = ton("20");

const GAS_FEE: Int = ton("0.02");
const CAMPAIGN_BUFFER: Int = ton("1");
const MIN_COST_PER_USER_ACTION: Int = ton("0.01");

const USER_ACTION_OP_CODES_BOT: Int = 200;  // 200 first user action op codes are saved for bot's acrions.  Anything above that is the advertiser's


struct CampaignDetails {
    regularUsersCostPerAction: map<Int, Int>; // op code -> cpa
    premiumUsersCostPerAction: map<Int, Int>; // op code -> cpa
    allowedAffiliates: map<Address, Bool>;  // address -> dummy (closed campaign). Relevant only is 'ifOpenCampaign' is false
    isOpenCampaign: Bool; // anyone can be an affiliate
    daysWithoutUserActionForWithdrawFunds: Int as uint32;
    campaignBalanceNotifyAdvertiserThreshold: Int as coins;  // notify advertiser when campaign balance is under this amount
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
    campaignDetails: CampaignDetails;
    state: Int as uint32;
    numUserActions: Int as uint32;
    lastUserAction: Int as uint32;
    campaignBalance: Int as coins;
    contractBalance: Int as coins;
    contractAddress: Address;
    feePercentage: Int as uint32;  // 200 for 2 %, 150 for 1.5 % etc...
}

// Child contract for each affiliate
contract Campaign {

    parent: Address;
    campaignId: Int as uint32;

    advertiser: Address;
    campaignDetails: CampaignDetails;

    currAffiliateId: Int as uint32; // runningId
    affiliates: map<Int, AffiliateData>;

    state: Int as uint32;
    lastUserAction: Int as uint32;
    numUserActions: Int as uint32;  // Track number of user actions
    totalAccruedEarnings: Int as coins;

    feePercentage: Int as uint32 = 200;  // default - 2%

    init(parent: Address, campaignId: Int, advertiser: Address) {

        require(sender() == parent, "parent must be deployer");

        self.parent = parent;
        self.campaignId = campaignId;
        self.advertiser = advertiser;

        self.currAffiliateId = 0;  // running id
        self.affiliates = emptyMap();

        self.campaignDetails = CampaignDetails{
        regularUsersCostPerAction: emptyMap(),
        premiumUsersCostPerAction: emptyMap(),
        allowedAffiliates: emptyMap(),
        isOpenCampaign: false,
        daysWithoutUserActionForWithdrawFunds: MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS,
		campaignBalanceNotifyAdvertiserThreshold: ton("5")
        };

        self.state = STATE_CAMPAIGN_CREATED;
        self.lastUserAction = 0;
        self.numUserActions = 0;
        self.totalAccruedEarnings = 0;
    }

    // piggyback deployment of contract on this message
    receive(msg: InternalCreatecampaign) {
        // dump(msg.campaignId);  // for debugging
    }

    receive(msg: UpdateFeePercentage) {
        require(sender() == self.parent, "Only parent can upate fee percentage");
        self.feePercentage = msg.feePercentage;
    }

    // Reserve funds for affiliate withdrawals
    fun currentCampaignBalance(): Int {
        let campaginBalance: Int = myBalance() - (self.totalAccruedEarnings + CAMPAIGN_BUFFER);  // can be negative
        return max(campaginBalance, ton("0"));  // if negative return 0
    }

    // advetiser can set details for the first time, or update the details if no affilites started orling on the campaign
    receive (msg: AdvertiserSetCampaignDetails) {

        require(sender() == self.advertiser, "Only advertiser can invoke this function");
        require(self.state == STATE_CAMPAIGN_CREATED || self.currAffiliateId == 0, "Must be in state: STATE_CAMPAIGN_CREATED or have no affiliates at all");
        require(msg.campaignDetails.daysWithoutUserActionForWithdrawFunds >= MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS, "daysWithoutUserActionForWithdrawFunds must be greater than MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS");
        require(context().value <= MAX_MESSAGE_VAL_NO_REPLENISH, "Can only replenish via 'AdvertiserReplenish' function");

        // verify values
        foreach (key, val in msg.campaignDetails.regularUsersCostPerAction) {
            require(val >= MIN_COST_PER_USER_ACTION, "cpa must be greater than min cost for user action");
        }

        foreach (key, val in msg.campaignDetails.premiumUsersCostPerAction) {
            require(val >= MIN_COST_PER_USER_ACTION, "cpa must be greater than min cost for premium user action");
        }

        self.campaignDetails = msg.campaignDetails;
        self.state = STATE_CAMPAIGN_INACTIVE;
    }

    // Function to handle advertiser replenishment
    receive(msg: AdvertiserReplenish) {

        require(sender() == self.advertiser, "Only the advertiser can replenish the contract");
        require(context().value >= MIN_AMOUNT_REPLENISH_CAMPAIGN, "Insufficient funds.  Need at least 20 Ton.");
        require(self.state == STATE_CAMPAIGN_INACTIVE || self.state == STATE_CAMPAIGN_ACTIVE, "Must be in states: [STATE_CAMPAIGN_INACTIVE, STATE_CAMPAIGN_ACTIVE] ");

        self.state = STATE_CAMPAIGN_ACTIVE;

        // send 2% fee to parent
        let fee: Int = (context().value * self.feePercentage + 9999) / 10000;  // 2% fee calculation

        // advertiser to cover gas costs
        send(SendParameters{
        to: self.parent,
        body: InternalAdvertiserReplenishFee{
        campaignId: self.campaignId,
        advertiser: self.advertiser,
        replenishAmount: context().value,
        fee: fee
        }.toCell(),
        value: fee,
        mode: SendPayGasSeparately
        });
    }


    receive(msg: CreateNewAffiliate) {

        require(self.state == STATE_CAMPAIGN_ACTIVE, "Must be in state: STATE_CAMPAIGN_ACTIVE");

        let numAffiliates = self.currAffiliateId + 1;
        require(numAffiliates <= MAX_NUM_AFFILIATES, "Reached max number of affiliates for this campagn");

        if (!self.campaignDetails.isOpenCampaign) {
            require(self.campaignDetails.allowedAffiliates.get(sender()) != null, "affiliate not on allowed list");
        }

        let affilateId = self.currAffiliateId;
        self.currAffiliateId = self.currAffiliateId + 1;

        let userActionsStats: map<Int, Int> = emptyMap();
        foreach (userActionOpCode, cpa in self.campaignDetails.regularUsersCostPerAction) {
            userActionsStats.set(userActionOpCode, 0);
        }

        let premiumUserActionsStats: map<Int, Int> = emptyMap();
        foreach (userActionOpCode, cpa in self.campaignDetails.premiumUsersCostPerAction) {
            premiumUserActionsStats.set(userActionOpCode, 0);
        }

        self.affiliates.set(affilateId, AffiliateData{affiliate: sender(), userActionsStats: userActionsStats, premiumUserActionsStats: premiumUserActionsStats, accruedEarnings: 0});

        send(SendParameters{
        to: self.parent,
        body: InternalAffiliateCreated{
        campaignId: self.campaignId,
        affiliateId: affilateId,
        advertiser: self.advertiser,
        affiliate: sender()
        }.toCell(),
        value: 0,
        mode: SendRemainingValue
        });
    }

    receive(msg: AddNewAffiliateToAllowedList) {

        // Ensure only the advertiser can invoke this function
        require(sender() == self.advertiser, "Only the advertiser can add a new affiliate");
        require(context().value <= MAX_MESSAGE_VAL_NO_REPLENISH, "Can only replenish via 'AdvertiserReplenish' function");
        require(self.state == STATE_CAMPAIGN_INACTIVE || self.state == STATE_CAMPAIGN_ACTIVE, "Must be in states: [STATE_CAMPAIGN_INACTIVE, STATE_CAMPAIGN_ACTIVE]");

        // Check if the campaign is not open (closed campaign)
        require(!self.campaignDetails.isOpenCampaign, "Cannot manually add affiliates to an open campaign");

        require(self.campaignDetails.allowedAffiliates.get(msg.affiliate) == null, "affiliate is on allowed list already");

        // Add the new affiliate to the allowed affiliates list
        self.campaignDetails.allowedAffiliates.set(msg.affiliate, true);

    }

    receive(msg: RemoveCampaignAndWithdrawFunds) {

        require(sender() == self.advertiser, "Only the advertiser can remove the campaign and withdraw all funds");

        if (self.currAffiliateId > 0) {
            require(now() - self.lastUserAction > self.campaignDetails.daysWithoutUserActionForWithdrawFunds*24*60*60, "Advertiser can withdraw funds only after agreed upon time period with no user action");
        }  // else no affiliates

        let campaignBalance: Int = self.currentCampaignBalance();
        if (campaignBalance > 0) {
            send(SendParameters{
            to: self.advertiser,
            value: campaignBalance,
            mode: SendRemainingValue
            });
        }
    }

    receive(msg: AffiliateUserAction) {

        require(self.state == STATE_CAMPAIGN_ACTIVE, "Must be in state: STATE_CAMPAIGN_ACTIVE");

        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Affiliate does not exist");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        let verifier = self.parent;
        if (msg.userActionOpCode > USER_ACTION_OP_CODES_BOT) {
            verifier = self.advertiser;
        }

        require(sender() == verifier, "Only the verifier contract can invoke this function");

        let cpaOptional: Int? = null;
        if (msg.isPremiumUser) {
            cpaOptional = self.campaignDetails.premiumUsersCostPerAction.get(msg.userActionOpCode);
        } else {
            cpaOptional = self.campaignDetails.regularUsersCostPerAction.get(msg.userActionOpCode);
        }

        require(cpaOptional != null, "Cannot find cpa for the given op code");

        let costPerAction: Int = cpaOptional!!;
        let campaginBalance: Int = self.currentCampaignBalance();

        // if insufficient funds - remove this campaign to deny gas exhaustion to the bot
        if (campaginBalance < costPerAction) {

            self.state = STATE_CAMPAIGN_INACTIVE;

            send(SendParameters{
            to: self.parent,
            body: InternalInsufficientCampaignFunds {
            campaignId: self.campaignId,
            advertiser: self.advertiser,
            campaginBalance: campaginBalance,
            contractBalance: myBalance()
            }.toCell(),
            value: 0,
            mode: SendRemainingValue
            });
            
        } else {

            // process user action - no need to check optional because we set it when advertiser setup the campaign
            if (msg.isPremiumUser) {
                let numActions: Int? = affiliateData.premiumUserActionsStats.get(msg.userActionOpCode);
                affiliateData.premiumUserActionsStats.set(msg.userActionOpCode, numActions!! + 1);
            } else {
                let numActions: Int? = affiliateData.userActionsStats.get(msg.userActionOpCode);
                affiliateData.userActionsStats.set(msg.userActionOpCode, numActions!! + 1);
            }

            // Accumulate the earnings for the affiliate
            affiliateData.accruedEarnings = affiliateData.accruedEarnings + costPerAction;
            self.affiliates.set(msg.affiliateId, affiliateData);  // update affiliate data

            self.lastUserAction = now();
            self.numUserActions = self.numUserActions + 1;
            self.totalAccruedEarnings = self.totalAccruedEarnings + costPerAction;

            if (verifier == self.parent) {
                send(SendParameters{
                to: self.parent,
                body: InternalAffiliateUserAction{
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                campaginBalance: campaginBalance - costPerAction,
                campaignBalanceNotifyAdvertiserThreshold: self.campaignDetails.campaignBalanceNotifyAdvertiserThreshold
                }.toCell(),
                value: GAS_FEE,  // return gas fee paid by the parent contract
                mode: SendPayGasSeparately
                });
            } else {
                send(SendParameters{
                to: self.parent,
                body: InternalAffiliateUserAction{
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                campaginBalance: campaginBalance - costPerAction,
                campaignBalanceNotifyAdvertiserThreshold: self.campaignDetails.campaignBalanceNotifyAdvertiserThreshold
                }.toCell(),
                value: 0,  
                mode: SendRemainingValue
                });
            }

        }
    }

    receive(msg: AffiliateWithdrawEarnings) {

        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Affiliate does not exist");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        require(sender() == affiliateData.affiliate, "Only affiliate can withdraw earnings");
        require(context().value <= MAX_MESSAGE_VAL_NO_REPLENISH, "Can only replenish via 'AdvertiserReplenish' function");

        let paymentAmount: Int = affiliateData.accruedEarnings;
        require(paymentAmount > ton("0"), "No earnings to withdraw");
        require(myBalance() >= paymentAmount, "Insufficient contract funds to make payment");  // should never reach this

        // Reset accrued earnings and update last payment time
        affiliateData.accruedEarnings = ton("0");
        self.affiliates.set(msg.affiliateId, affiliateData);

        // Adjust the total accrued earnings to reflect the withdrawal
        self.totalAccruedEarnings = self.totalAccruedEarnings - paymentAmount;

        // send 2% fee to parent
        let fee: Int = (paymentAmount * self.feePercentage + 9999) / 10000;  // 2% fee calculation

        send(SendParameters{
        to: self.parent,
        body: InternalAffiliateWithdrawEarningsFee{
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
        campaignDetails: self.campaignDetails,
        numUserActions: self.numUserActions,
        lastUserAction: self.lastUserAction,
        state: self.state,
        campaignBalance: self.currentCampaignBalance(),
        contractBalance: myBalance(),
        contractAddress: myAddress(),
        feePercentage: self.feePercentage
        }
    }

    get fun affiliateData(affiliateId: Int): AffiliateData? {
        return self.affiliates.get(affiliateId);
    }

    get fun affiliatesData(affiliateId: Int): map<Int, AffiliateData> {
        return self.affiliates;
    }
}


// Parent Contract
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
        self.currCampaignId = 0;
    }

    get fun balance(): Int {
        return myBalance(); // in nano-tons (like cents, just with 9 decimals)
    }

    fun campaignContractStateInit(campaignId: Int, advertiser: Address): StateInit {
        let initCode: StateInit = initOf Campaign(myAddress(), campaignId, advertiser);
        return initCode;
    }

    get fun campaignContractAddress(campaignId: Int, advertiser: Address): Address {
        return contractAddress(self.campaignContractStateInit(campaignId, advertiser));
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

        let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
        to: campaignContractAddress,
        body: UpdateFeePercentage{
        feePercentage: msg.feePercentage
        }.toCell(),
        value: 0,
        mode: SendRemainingValue
        });
    }


    receive(msg: InternalAffiliateUserAction) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");
        
        if (msg.campaginBalance < msg.campaignBalanceNotifyAdvertiserThreshold) {
            emit(CampaignBalnceUnderThresholdEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            campaginBalance: msg.campaginBalance
            }.toCell());
        }
    }

    receive(msg: InternalInsufficientCampaignFunds) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");

        emit(InsufficientCampaignFundsEvent{
        campaignId: msg.campaignId,
        advertiser: msg.advertiser,
        campaginBalance: msg.campaginBalance,
        contractBalance: msg.contractBalance
        }.toCell());
    }

    receive(msg: InternalRemoveCampaign) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");

        emit(CampaignRemovedEvent{
        campaignId: msg.campaignId,
        advertiser: msg.advertiser,
        campaginBalance: msg.campaginBalance,
        contractBalance: msg.contractBalance
        }.toCell());
    }

    receive(msg: InternalAffiliateWithdrawEarningsFee) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");

        emit(AffiliateWithdrawEarningsEvent{
        campaignId: msg.campaignId,
        advertiser: msg.advertiser,
        affiliateId: msg.affiliateId,
        earnings: msg.earnings,
		fee: msg.fee
        }.toCell());
    }

    receive(msg: InternalAdvertiserReplenishFee) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");

        emit(AdvertiserReplenisEvent{
        campaignId: msg.campaignId,
        advertiser: msg.advertiser,
        replenishAmount: msg.replenishAmount,
        fee: msg.fee
        }.toCell());
    }

    receive(msg: InternalAffiliateCreated) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");

        emit(AffiliateCreatedEvent{
        campaignId: msg.campaignId,
        affiliateId: msg.affiliateId,
        advertiser: msg.advertiser,
        affiliate: msg.affiliate
        }.toCell());

    }

    // Function to create a new campaign
    receive(msg: CreateCampaign) {

        require(context().value >= DEPLOY_NEW_CAMPAIGN_COST, "Insufficient funds");
		require(context().value <= MAX_MESSAGE_VAL_NO_REPLENISH, "Can only replenish via 'AdvertiserReplenish' function");

        let campaignId = self.currCampaignId;
        self.currCampaignId = campaignId + 1;

        let init: StateInit = self.campaignContractStateInit(campaignId, sender());
        let campaignContractAddress: Address = contractAddress(init);

        // deploy contract
        send(SendParameters{
        to: campaignContractAddress,
        value: DEPLOY_NEW_CAMPAIGN_COST,
        code: init.code,
        data: init.data,
        body: InternalCreatecampaign{campaignId: campaignId}.toCell()
        });

        emit(CampaignCreatedEvent{
        campaignId: campaignId,
        advertiser: sender(),
        campaignContractAddress: campaignContractAddress
        }.toCell());
    }

    // Function to handle user click
    receive(msg: UserAction) {

        require(sender() == self.bot, "Only bot can invoke User Actions");

        let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
        to: campaignContractAddress,
        body: AffiliateUserAction{
        affiliateId: msg.affiliateId,
        userActionOpCode: msg.userActionOpCode,
        isPremiumUser: msg.isPremiumUser
        }.toCell(),
        value: GAS_FEE,
        mode: SendPayGasSeparately,
        bounce: true
        });
    }

    // receive("Resume") is added automatically to allow owner to resume the contract
    // receive("Stop") is added automatically to allow owner to stop the contract
    // get fun stopped(): Bool is added automatically to query if contract is stopped
    // get fun owner(): Address is added automatically to query who the owner is
}
