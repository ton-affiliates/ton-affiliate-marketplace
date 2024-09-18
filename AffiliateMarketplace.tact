import "@stdlib/stoppable";
import "@stdlib/ownable";
import "@stdlib/deploy";

    // constants
    const MAX_NUM_AFFILIATES: Int = 10000;  // ten thousand
    const MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS: Int = 60;

    // affiliate contract state
    const STATE_CAMPAIGN_CREATED: Int = 0;
    const STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER: Int = 1;

    const SIGN_UP_FEE: Int = ton("0.1");  
    const DEPLOY_NEW_CAMPAIGN_COST: Int = ton("0.1");
    const MAX_MESSAGE_VAL_NO_REPLENISH: Int = ton("0.15");
    const MIN_AMOUNT_REPLENISH_CAMPAIGN: Int = ton("20");
    
    const AVG_GAS_CONSUMPTION: Int = ton("0.005");
    const MIN_COST_PER_USER_ACTION: Int = ton("0.01");   
    

    struct CampaignDetails {
        regularUsers: map<Int, Int>; // userAction => price
        premiumUsers: map<Int, Int>; // userAction => price
        allowedAffiliates: map<Address, Bool>;  // address -> dummy (closed campaign)
        isOpenCampaign: Bool; // anyone can be an affiliate
        daysWithoutUserActionForWithdrawFunds: Int as uint32;
    }

    struct AffiliateData {
        affiliate: Address;
        userActionsStats: map<Int, Int>;  // stats - user action -> num user actions
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
    }

    message InternalCreatecampaign{campaignId: Int as uint32}

    // messages
    message AdvertiserSigned {
        campaignDetails: CampaignDetails;
    }

    message AddNewAffiliateToAllowedList{affiliate: Address}
    message AdvertiserReplenish {}

    message CreateNewAffiliate{}
    message PayAffiliate{
        affiliateId: Int as uint32;
        amount: Int as uint32;
    }
    message InternalUserAction{
        affiliateId: Int as uint32;
        userAction: Int as uint32;
        isPremiumUser: Bool;
    }

    message AffiliateWithdrawEarnings {
        affiliateId: Int as uint32;
    }
    message RemoveCampaignAndWithdrawFunds{}


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
        totalAccruedEarnings: Int as uint32;
        
        init(parent: Address, campaignId: Int, advertiser: Address) { 
            
            require(sender() == parent, "parent must be deployer");

            self.parent = parent;
            self.campaignId = campaignId;
            self.advertiser = advertiser;

            self.currAffiliateId = 0;  // running id
            self.affiliates = emptyMap();

            self.campaignDetails = CampaignDetails{
                regularUsers: emptyMap(), 
                premiumUsers: emptyMap(),
                allowedAffiliates: emptyMap(),
                isOpenCampaign: false,
                daysWithoutUserActionForWithdrawFunds: MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS
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

        // Reserve funds for affiliate withdrawals
        fun currentCampaignBalance(): Int {
            let buffer: Int = ton("2");  // Additional buffer to pay for gas fees
            let campaginBalance: Int = myBalance() - (self.totalAccruedEarnings + buffer);  // can be negative
            return max(campaginBalance, 0);  // if negative return simply 0
        }

        receive (msg: AdvertiserSigned) {
            
            require(sender() == self.advertiser, "Only advertiser can invoke this function");
            require(self.state == STATE_CAMPAIGN_CREATED, "Must be in state: STATE_CAMPAIGN_CREATED");
            require(msg.campaignDetails.daysWithoutUserActionForWithdrawFunds >= MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS, "daysWithoutUserActionForWithdrawFunds must be greater than MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS");
            require(context().value <= MAX_MESSAGE_VAL_NO_REPLENISH, "Can only replenish via 'AdvertiserReplenish' function");

            // verify values
            foreach (key, val in msg.campaignDetails.regularUsers) {
                require(val >= MIN_COST_PER_USER_ACTION, "cpa must be greater than min cost for user action");
            }

            foreach (key, val in msg.campaignDetails.premiumUsers) {
                require(val >= MIN_COST_PER_USER_ACTION, "cpa must be greater than min cost for premium user action");
            }

            self.campaignDetails = msg.campaignDetails;
            self.state = STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER;
        }

        // Function to handle advertiser replenishment
        receive(msg: AdvertiserReplenish) {
            
            require(sender() == self.advertiser, "Only the advertiser can replenish the contract");
            require(context().value >= MIN_AMOUNT_REPLENISH_CAMPAIGN, "Insufficient funds.  Need at least 20 Ton.");
            require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
            
            // send 2% fee to parent
            let fee: Int = (context().value * 200 + 9999) / 10000;  // 2% fee calculation

            // advertiser to cover gas costs
            send(SendParameters{
                to: self.parent,
                body: InternalAdvertiserReplenishFee{
                    campaignId: self.campaignId,
                    advertiser: self.advertiser,
                    replenishAmount: context().value
                }.toCell(),                
                value: fee
            });
        }


        receive(msg: CreateNewAffiliate) {
            
            require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
            require(context().value >= SIGN_UP_FEE, "Insufficient funds.  Need at least 0.1 Ton to register");
            
            let numAffiliates = self.currAffiliateId + 1;
            require(numAffiliates <= MAX_NUM_AFFILIATES, "Reached max number of affiliates for this campagn");
            
            if (!self.campaignDetails.isOpenCampaign) {
                require(self.campaignDetails.allowedAffiliates.get(sender()) != null, "affiliate not on allowed list");
            }

            let affilateId = self.currAffiliateId;
            self.currAffiliateId = self.currAffiliateId + 1; 

            self.affiliates.set(affilateId, AffiliateData{affiliate: sender(), userActionsStats: emptyMap(), accruedEarnings: 0});

            send(SendParameters{
                to: self.parent,
                body: InternalAffiliateCreated{
                    campaignId: self.campaignId,
                    affiliateId: affilateId,
                    advertiser: self.advertiser
                }.toCell(),                
                value: 0,
                mode: SendRemainingValue
            });
        }

        receive(msg: AddNewAffiliateToAllowedList) {
            
            // Ensure only the advertiser can invoke this function
            require(sender() == self.advertiser, "Only the advertiser can add a new affiliate");
            require(context().value <= MAX_MESSAGE_VAL_NO_REPLENISH, "Can only replenish via 'AdvertiserReplenish' function");
            require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
            
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

            send(SendParameters{
                to: self.advertiser,
                value: 0,
                mode: SendRemainingBalance | SendDestroyIfZero  // send all TON in contract to advertiser and destroy contract
            });
        }

        receive(msg: InternalUserAction) {
            
            require(sender() == self.parent, "Only the parent contract can invoke this function");

            let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
            require(affiliateDataOptional != null, "Affiliate does not exist");
            let affiliateData: AffiliateData = affiliateDataOptional!!;

            let costPerActionOptional: Int? = null;
            if (msg.isPremiumUser) {
                costPerActionOptional = self.campaignDetails.premiumUsers.get(msg.userAction);
            } else {
                costPerActionOptional = self.campaignDetails.regularUsers.get(msg.userAction);
            }

            require(costPerActionOptional != null, "Invalid user action");
            let costPerAction: Int = costPerActionOptional!!;

            require(self.currentCampaignBalance() > costPerAction, "Insufficient funds in contract");

            let numActions: Int? = affiliateData.userActionsStats.get(msg.userAction);
            if (numActions == null) {
                affiliateData.userActionsStats.set(msg.userAction, 1);    
            } else {
                affiliateData.userActionsStats.set(msg.userAction, numActions!! + 1);
            }

            // Accumulate the earnings for the affiliate
            affiliateData.accruedEarnings = affiliateData.accruedEarnings + costPerAction;
            self.affiliates.set(msg.affiliateId, affiliateData);  // update affiliate data

            self.lastUserAction = now();
            self.numUserActions = self.numUserActions + 1;
            self.totalAccruedEarnings = self.totalAccruedEarnings + costPerAction;           
        }

        receive(msg: AffiliateWithdrawEarnings) {
    
            let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
            require(affiliateDataOptional != null, "Affiliate does not exist");
            let affiliateData: AffiliateData = affiliateDataOptional!!;
            
            require(sender() == affiliateData.affiliate, "Only affiliate can withdraw earnings");
            require(context().value <= MAX_MESSAGE_VAL_NO_REPLENISH, "Can only replenish via 'AdvertiserReplenish' function");

            let paymentAmount: Int = affiliateData.accruedEarnings;
            require(paymentAmount > 0, "No earnings to withdraw");
            
            require(myBalance() >= paymentAmount, "Insufficient contract funds to make payment");

            // Reset accrued earnings and update last payment time
            affiliateData.accruedEarnings = 0;            
            self.affiliates.set(msg.affiliateId, affiliateData);

            // Adjust the total accrued earnings to reflect the withdrawal
            self.totalAccruedEarnings = self.totalAccruedEarnings - paymentAmount;

            // send 2% fee to parent
            let fee: Int = (paymentAmount * 200 + 9999) / 10000;  // 2% fee calculation

            // advertiser to cover gas costs
            send(SendParameters{
                to: self.parent,
                body: InternalAffiliateWithdrawEarningsFee{
                    campaignId: self.campaignId,
                    advertiser: self.advertiser,
                    affiliateId: msg.affiliateId,
                    earnings: paymentAmount
                }.toCell(),                
                value: fee,
                mode: SendIgnoreErrors
            });

            send(SendParameters{
                to: affiliateData.affiliate,
                value: paymentAmount - fee,
                bounce: true,
                body: PayAffiliate{affiliateId: msg.affiliateId, amount: paymentAmount}.toCell()
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
                contractAddress: myAddress()
            }
        }

        get fun affiliateData(affiliateId: Int): AffiliateData? {
            return self.affiliates.get(affiliateId);
        }

        get fun affiliatesData(affiliateId: Int): map<Int, AffiliateData> {
            return self.affiliates;
        }
    }

    // messages
    message InternalAffiliateWithdrawEarningsFee {
        campaignId: Int as uint32;
        advertiser: Address;
        affiliateId: Int as uint32;
        earnings: Int as coins;
    }

    message AffiliateWithdrawEarningsEvent {
        campaignId: Int as uint32;
        advertiser: Address;
        affiliateId: Int as uint32;
        earnings: Int as coins;
    }

    message InternalAdvertiserReplenishFee {
        campaignId: Int as uint32;
        advertiser: Address;
        replenishAmount: Int as coins;
    }

    message AdvertiserReplenisEvent {
        campaignId: Int as uint32;
        advertiser: Address;
        replenishAmount: Int as coins;
    }

    message InternalAffiliateCreated {
        campaignId: Int as uint32;
        affiliateId: Int as uint32;
        advertiser: Address;
    }

    message AdminWithdraw {
        amount: Int as coins;
    }

    message CreateCampaign {}

    message UserAction {
        campaignId: Int as uint32;
        affiliateId: Int as uint32;
        advertiser: Address;
        userAction: Int as uint32;
        isPremiumUser: Bool;
    }

    // events
    message CampaignCreatedEvent {
        campaignId: Int as uint32;
        advertiser: Address;
        campaignContractAddress: Address;
    }

    message AffiliateCreatedEvent {
        campaignId: Int as uint32;
        affiliateId: Int as uint32;
        advertiser: Address;
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

        receive(msg: InternalAffiliateWithdrawEarningsFee) {
            let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
            require(sender() == expectedAddress, "Access denied");

            emit(AffiliateWithdrawEarningsEvent{
                campaignId: msg.campaignId, 
                advertiser: msg.advertiser, 
                affiliateId: msg.affiliateId,
                earnings: msg.earnings
            }.toCell());
        }

        receive(msg: InternalAdvertiserReplenishFee) {
            let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
            require(sender() == expectedAddress, "Access denied");

            emit(AdvertiserReplenisEvent{
                campaignId: msg.campaignId, 
                advertiser: msg.advertiser, 
                replenishAmount: msg.replenishAmount
            }.toCell());
        }

        receive(msg: AdminWithdraw) {
            
            self.requireOwner();

            require(myBalance() >= msg.amount + 1, "Insufficient contract funds to make payment");
                        
            send(SendParameters{
                to: self.owner,
                bounce: true,
                value: msg.amount,
                mode: SendRemainingValue 
            });
        }

        // Function to create a new campaign
        receive(msg: CreateCampaign) {

            require(context().value >= DEPLOY_NEW_CAMPAIGN_COST, "Insufficient funds");
                        
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

        receive(msg: InternalAffiliateCreated) {
            
            let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
            require(sender() == expectedAddress, "Access denied");

            emit(AffiliateCreatedEvent{
                campaignId: msg.campaignId, 
                affiliateId: msg.affiliateId, 
                advertiser: msg.advertiser
            }.toCell());
            
        }

        // Function to handle user click
        receive(msg: UserAction) {
            
            require(sender() == self.bot, "Only bot can invoke User Actions");
            
            let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
            let campaignContractAddress: Address = contractAddress(init);

            send(SendParameters{
                to: campaignContractAddress,
                body: InternalUserAction{
                    affiliateId: msg.affiliateId,
                    userAction: msg.userAction,
                    isPremiumUser: msg.isPremiumUser
                }.toCell(),
                value: 0, 
                mode: SendRemainingValue 
            });
        }

        // receive("Resume") is added automatically to allow owner to resume the contract
        // receive("Stop") is added automatically to allow owner to stop the contract
        // get fun stopped(): Bool is added automatically to query if contract is stopped
        // get fun owner(): Address is added automatically to query who the owner is
    }
