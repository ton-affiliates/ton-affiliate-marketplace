import "@stdlib/stoppable";
import "@stdlib/ownable";
import "@stdlib/deploy";

    // constants
    const MAX_NUM_AFFILIATES: Int = 10000;  // ten thousand
    const MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS: Int = 10;

    // affiliate contract state
    const STATE_CAMPAIGN_CREATED: Int = 0;
    const STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER: Int = 1;

    const SIGN_UP_FEE: Int = ton("1");  
    const DEPLOY_NEW_CAMPAIGN_COST: Int = ton("0.1");

    const MIN_COST_PER_USER_ACTION: Int = ton("0.008");  // ~ 4 cents 
    

    struct CampaignDetails {
        regularUsers: map<Int, Int>; // userAction => price
        premiumUsers: map<Int, Int>; // userAction => price
        allowedAffiliates: map<Address, Bool>;  // address -> dummy (closed campaign)
        isOpenCampaign: Bool; // anyone can be an affiliate
        daysWithoutUserActionForWithdrawFunds: Int as uint32;
    }

    struct AffiliateData {
        publisher: Address;
        userActionsStats: map<Int, Int>;  // stats - user action -> num user actions
        accruedEarnings: Int as coins;  // accumulated earnings since the last payment
        lastPaymentTime: Int as uint32;  // timestamp of the last payment
    }

    struct CampaignData {
        campaignId: Int as uint32;
        advertiser: Address;
        campaignDetails: CampaignDetails;
        affiliates: map<Int, AffiliateData>;
        state: Int as uint32;
        numUserActions: Int as uint32;
        lastUserAction: Int as uint32;
        contractBalance: Int as coins;
        contractAddress: Address;
    }

    message InternalCreatecampaign{campaignId: Int as uint32}

    // messages
    message AdvertiserSigned {
        campaignDetails: CampaignDetails;
    }

    message AddNewAffiliateToAllowedList{publisher: Address}
    message AdvertiserReplenish {}

    message PublisherSigned{}
    message InternalUserAction{
        affiliateId: Int as uint32;
        userAction: Int as uint32;
        isPremiumUser: Bool;
    }

    message PublisherWithdrawEarnings {
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
        numAffiliates: Int as uint32;
        
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

            self.numAffiliates = 0;
            self.state = STATE_CAMPAIGN_CREATED;
            self.lastUserAction = 0;
            self.numUserActions = 0;
            self.totalAccruedEarnings = 0;
        }

        // piggyback deployment of contract on this message
        receive(msg: InternalCreatecampaign) {
            dump(msg.campaignId);  // for debugging
        }

        receive (msg: AdvertiserSigned) {
            
            require(sender() == self.advertiser, "Only advertiser can invoke this function");
            require(self.state == STATE_CAMPAIGN_CREATED, "Must be in state: STATE_CAMPAIGN_CREATED");
            require(msg.campaignDetails.daysWithoutUserActionForWithdrawFunds >= MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS, "daysWithoutUserActionForWithdrawFunds must be greater than MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS");
            
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
            // Ensure that the sender is the advertiser
            require(sender() == self.advertiser, "Only the advertiser can replenish the contract");
        }


        receive(msg: PublisherSigned) {
            
            require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
            require(self.numAffiliates <= MAX_NUM_AFFILIATES, "Reached max number of affiliates for this campagn");
            require(context().value >= SIGN_UP_FEE, "Insufficient funds");

            if (!self.campaignDetails.isOpenCampaign) {
                require(self.campaignDetails.allowedAffiliates.get(sender()) != null, "Publisher not on allowed list");
            }

            let affilateId = self.currAffiliateId;
            self.currAffiliateId = self.currAffiliateId + 1; 

            self.affiliates.set(affilateId, AffiliateData{publisher: sender(), userActionsStats: emptyMap(), accruedEarnings: 0, lastPaymentTime: 0});
            self.numAffiliates = self.numAffiliates + 1;

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

            // Check if the campaign is not open (closed campaign)
            require(!self.campaignDetails.isOpenCampaign, "Cannot manually add affiliates to an open campaign");

            require(self.campaignDetails.allowedAffiliates.get(msg.publisher) == null, "Publisher is on allowed list already");

            // Add the new affiliate to the allowed affiliates list
            self.campaignDetails.allowedAffiliates.set(msg.publisher, true);

        }


        receive(msg: RemoveCampaignAndWithdrawFunds) {

            require(sender() == self.advertiser, "Only the advertiser can remove the affiliate");            
            require(now() - self.lastUserAction > self.campaignDetails.daysWithoutUserActionForWithdrawFunds*24*60*60, "Advertiser can withdraw funds only after agreed upon time period with no user action");

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

            require(myBalance() > self.totalAccruedEarnings + costPerAction, "Insufficient funds in contract");

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

             // Make gas and transaction fee payments every 10 actions
            if (self.numUserActions > 0 && self.numUserActions % 10 == 0) {
                
                // advertiser to cover gas costs
                 send(SendParameters{
                    to: self.parent,
                    body: InternalChildToParentTxFee{
                        campaignId: self.campaignId,
                        advertiser: self.advertiser
                    }.toCell(),                
                    value: ton("0.05") // 10 * 0.005
                });
            }            
        }

        receive(msg: PublisherWithdrawEarnings) {
    
            let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
            require(affiliateDataOptional != null, "Affiliate does not exist");
            let affiliateData: AffiliateData = affiliateDataOptional!!;

            require(sender() == affiliateData.publisher, "Only publisher can withdraw earnings");

            let paymentAmount: Int = affiliateData.accruedEarnings;
            require(paymentAmount > 0, "No earnings to withdraw");
            
            require(myBalance() >= paymentAmount, "Insufficient contract funds to make payment");

            // Calculate the 2% fee to be deducted from the payment amount
            let fee: Int = (paymentAmount * 200 + 9999) / 10000;  // 2% fee
            let finalPayment: Int = paymentAmount - fee;

            // Reset accrued earnings and update last payment time
            affiliateData.accruedEarnings = 0;
            affiliateData.lastPaymentTime = now();
            self.affiliates.set(msg.affiliateId, affiliateData);

            // Adjust the total accrued earnings to reflect the withdrawal
            self.totalAccruedEarnings = self.totalAccruedEarnings - paymentAmount;

            // Transfer the remaining earnings (after deducting the fee) to the publisher
            send(SendParameters{
                to: affiliateData.publisher,
                value: finalPayment,
                mode: SendIgnoreErrors
            });

            // Optionally, the deducted fee can be sent to the parent or retained by the contract
            send(SendParameters{
                to: self.parent,  // Or another address to receive the fee
                value: fee,
                mode: SendIgnoreErrors
            });
        }


        get fun campaignDetails(): CampaignData {
            return CampaignData {
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                campaignDetails: self.campaignDetails, 
                affiliates: self.affiliates,
                numUserActions: self.numUserActions,
                lastUserAction: self.lastUserAction,
                state: self.state,
                contractBalance: myBalance(),
                contractAddress: myAddress()
            }
        }
    }

    // messages
    message InternalChildToParentTxFee {
        campaignId: Int as uint32;
        advertiser: Address;
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

        receive(msg: InternalChildToParentTxFee) {
            let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
            require(sender() == expectedAddress, "Access denied");
        }

        receive(msg: AdminWithdraw) {
            
            self.requireOwner();
                        
            send(SendParameters{
                to: self.owner,
                bounce: true,
                value: msg.amount,
                mode: SendRemainingValue 
            });
        }

        // Function to create a new campaign
        receive(msg: CreateCampaign) {

            require(context().value >= DEPLOY_NEW_CAMPAIGN_COST + SIGN_UP_FEE, "Insufficient funds");
                        
            let campaignId = self.currCampaignId;
            self.currCampaignId = campaignId + 1;

            let init: StateInit = self.campaignContractStateInit(campaignId, sender());
            let campaignContractAddress: Address = contractAddress(init);

            // 1. deploy contract
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
