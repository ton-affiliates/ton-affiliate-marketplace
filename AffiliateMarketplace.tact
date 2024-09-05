import "@stdlib/stoppable";
import "@stdlib/ownable";
import "@stdlib/deploy";

    // constants
    const MAX_NUM_AFFILIATES: Int = 10000;  // ten thousand

    // affiliate contract state
    const STATE_CAMPAIGN_CREATED: Int = 0;
    const STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER: Int = 1;

    // fees
    const SIGN_UP_FEE: Int = ton("0.1");  
    const MIN_COST_PER_USER_ACTION: Int = ton("0.05"); 
    const MIN_TON_FOR_STORAGE: Int = ton("0.019");
    const GAS_CONSUMPTION_FEE: Int = ton("0.013");
    const FORWARD_MSG_FEE: Int = ton("0.015");

    struct CampaignDetails {
        regularUsers: map<Int, Int>; // userAction => price
        premiumUsers: map<Int, Int>; // userAction => price
        allowedAffiliates: map<Address, Bool>;  // address -> dummy (closed campaign)
        isOpenCampaign: Bool; // anyone can be an affiliate
        campaignInitialAmount: Int as coins;  // e.g. 100 TON
        daysWithoutUserActionForWithdrawFunds: Int as uint32;
    }

    struct AffiliateData {
        publisher: Address;
        userActionsStats: map<Int, Int>;  // stats - user action -> num user actions
    }

    struct CampaignData {
        campaignId: Int as uint32;
        advertiser: Address;
        campaignDetails: CampaignDetails;
        affiliates: map<Int, AffiliateData>;
        state: Int as uint32;
        lastUserAction: Int as uint32;
        contractBalance: Int as coins;
        contractAddress: Address;
    }

    message InternalCreatecampaign{campaignId: Int as uint32}

    // messages
    message AdvertiserSigned {
        campaignDetails: CampaignDetails;
    }

    message PublisherSigned{}
    message InternalUserAction{
        affiliateId: Int as uint32;
        userAction: Int as uint32;
        isPremiumUser: Bool;
    }
    message RemoveAffiliateAndWithdrawFunds{}


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
        
        init(parent: Address, campaignId: Int) { 
            
            require(sender() == parent, "parent must be deployer");

            self.parent = parent;
            self.campaignId = campaignId;
            self.advertiser = parent;

            self.currAffiliateId = 0;
            self.affiliates = emptyMap();

            self.campaignDetails = CampaignDetails{
                regularUsers: emptyMap(), 
                premiumUsers: emptyMap(),
                allowedAffiliates: emptyMap(),
                isOpenCampaign: false,
                campaignInitialAmount: ton("0"),
                daysWithoutUserActionForWithdrawFunds: 0
            }; 

            self.numAffiliates = 0;
            self.state = STATE_CAMPAIGN_CREATED;
            self.lastUserAction = 0;
        }

        fun minMsgValue(numForwards: Int, msgValue: Int) : Int {
            let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
            let storageFee: Int = MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, MIN_TON_FOR_STORAGE);
            return storageFee + ((numForwards+1)*(GAS_CONSUMPTION_FEE + FORWARD_MSG_FEE));
        }

        // piggyback deployment of contract on this message
        receive(msg: InternalCreatecampaign) {
            dump(msg.campaignId);  // for debugging
        }

        receive (msg: AdvertiserSigned) {
            
            require(self.state == STATE_CAMPAIGN_CREATED, "Must be in state: STATE_CAMPAIGN_CREATED");

            // verify values
            foreach (key, val in msg.campaignDetails.regularUsers) {
                require(val >= MIN_COST_PER_USER_ACTION, "cpa must be greater than min cost for user action");
            }

            foreach (key, val in msg.campaignDetails.premiumUsers) {
                require(val >= MIN_COST_PER_USER_ACTION, "cpa must be greater than min cost for premium user action");
            }

            let msgValue = context().value;
            require(msgValue >= self.minMsgValue(1, msgValue) + SIGN_UP_FEE + msg.campaignDetails.campaignInitialAmount, "Insufficient funds");

            self.advertiser = sender();
            self.campaignDetails = msg.campaignDetails;
            self.state = STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER;

            // tx fee to parent
            send(SendParameters{
                to: self.parent,
                body: InternalChildToParentTxFee{
                    campaignId: self.campaignId
                }.toCell(),
                value: 0,
                mode: SendRemainingValue
            });
        }

        receive(msg: PublisherSigned) {
            
            require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
            require(context().value >= self.minMsgValue(1, context().value) + SIGN_UP_FEE, "Insufficient funds");
            require(self.numAffiliates <= MAX_NUM_AFFILIATES, "Reached max number of affiliates for this campagn");
            
            if (!self.campaignDetails.isOpenCampaign) {
                require(self.campaignDetails.allowedAffiliates.get(sender()) != null, "Publisher not on allowed list");
            }

            let affilateId = self.currAffiliateId;
            self.currAffiliateId = self.currAffiliateId + 1; 

            self.affiliates.set(affilateId, AffiliateData{publisher: sender(), userActionsStats: emptyMap()});
            self.numAffiliates = self.numAffiliates + 1;

            // tx fee to parent
            send(SendParameters{
                to: self.parent,
                bounce: true,
                body: InternalAffiliateCreated{
                    campaignId: self.campaignId,
                    affiliateId: affilateId
                }.toCell(),                
                value: 0,
                mode: SendRemainingValue
            });
        }

        receive(msg: RemoveAffiliateAndWithdrawFunds) {

            require(sender() == self.advertiser, "Only the advertiser can remove the affiliate");            
            require((self.lastUserAction > 0) && (now() - self.lastUserAction > self.campaignDetails.daysWithoutUserActionForWithdrawFunds*24*60*60), "Advertiser can withdraw funds only after agreed upon time period with no user action");
            require(context().value >= self.minMsgValue(1, context().value), "Insufficient funds");

            send(SendParameters{
                to: self.advertiser,
                bounce: true,
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
                costPerActionOptional = self.campaignDetails.regularUsers.get(msg.userAction);
            } else {
                costPerActionOptional = self.campaignDetails.premiumUsers.get(msg.userAction);
            }
                
            require(costPerActionOptional != null, "Invalid user action");
            let costPerAction: Int = costPerActionOptional!!;

            let numActions: Int? = affiliateData.userActionsStats.get(msg.userAction);
            if (numActions == null) {
                affiliateData.userActionsStats.set(msg.userAction, 1);    
            } else {
                affiliateData.userActionsStats.set(msg.userAction, numActions!! + 1);
            }

            // Calculate fees
            let percentage: Int = 50;  // Represents 0.5% to take from each party
            let feeFromPublisher: Int = (costPerAction * percentage + 9999) / 10000;  // 0.5% of CPC to be deducted from payment to publisher
            let feeFromContract: Int = feeFromPublisher;  // 0.5% additional fee taken from the contract balance

            // Ensure sufficient balance after both fees
            require(myBalance() >= costPerAction + feeFromContract + self.minMsgValue(2, context().value), "Insufficient contract balance to pay publisher and cover fees");

            // Total fee
            let totalFee: Int = feeFromPublisher + feeFromContract;
            
            self.lastUserAction = now();

            // Transfer the remaining CPC to the publisher
            send(SendParameters{
                to: affiliateData.publisher,
                bounce: true,
                value: costPerAction - feeFromPublisher,
                mode: SendPayGasSeparately  // pay from the contract itself, not from incoming gas
            });

            // tx fee to parent
            send(SendParameters{
                to: self.parent,
                bounce: true,
                body: InternalChildToParentTxFee{
                    campaignId: self.campaignId
                }.toCell(),
                value: totalFee,
                mode: SendRemainingValue
            });
        }

        get fun campaignDetails(): CampaignData {
            return CampaignData {
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                campaignDetails: self.campaignDetails, 
                affiliates: self.affiliates,
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
    }

    message InternalAffiliateCreated {
        campaignId: Int as uint32;
        affiliateId: Int as uint32;
    }

    message AdminWithdraw {
        amount: Int as coins;
    }

    message AdminRemoveCampaign {
        campaignId: Int as uint32;
    }

    message CreateCampaign {}

    message UserAction {
        campaignId: Int as uint32;
        affiliateId: Int as uint32;
        userAction: Int as uint32;
        isPremiumUser: Bool;
    }

    message AffiliateCreatedReply {
        campaignId: Int as uint32;
        affiliateId: Int as uint32;
    }

    message CampaignCreatedReply {
        campaignId: Int as uint32;
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

        fun campaignContractStateInit(campaignId: Int): StateInit {
            let initCode: StateInit = initOf Campaign(myAddress(), campaignId);
            return initCode;
        }

        get fun campaignContractAddress(campaignId: Int): Address {
            return contractAddress(self.campaignContractStateInit(campaignId));
        }

        fun minMsgValue(numForwards: Int, msgValue: Int) : Int {
            let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
            let storageFee: Int = MIN_TON_FOR_STORAGE - min(tonBalanceBeforeMsg, MIN_TON_FOR_STORAGE);
            return storageFee + ((numForwards+1)*(GAS_CONSUMPTION_FEE + FORWARD_MSG_FEE));
        }

        receive(msg: InternalChildToParentTxFee) {
            let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
            require(sender() == expectedAddress, "Access denied");
        }

        // in case where advertiser does not sign
        receive(msg: AdminRemoveCampaign) {

            self.requireOwner();
            require(context().value >= self.minMsgValue(1, context().value), "Insufficient funds");


            let init: StateInit = self.campaignContractStateInit(msg.campaignId);
            let campaignContractAddress: Address = contractAddress(init);

            send(SendParameters{
                to: campaignContractAddress,
                value: 0, 
                mode: SendRemainingValue,
                body: RemoveAffiliateAndWithdrawFunds{}.toCell()
            });

        }

        receive(msg: AdminWithdraw) {
            
            self.requireOwner();
            
            require(myBalance() > msg.amount + MIN_TON_FOR_STORAGE, "Insufficient funds");
            
            send(SendParameters{
                to: self.owner,
                bounce: true,
                value: msg.amount,
                mode: SendRemainingValue 
            });
        }

        // Function to create a new campaign
        receive(msg: CreateCampaign) {

            require(sender() == self.bot, "Only bot can create new Affiliates");
            require(context().value >= self.minMsgValue(2, context().value) + 2*SIGN_UP_FEE, "Insufficient funds");
                        
            let campaignId = self.currCampaignId;
            self.currCampaignId = campaignId + 1;

            let init: StateInit = self.campaignContractStateInit(campaignId);
            let campaignContractAddress: Address = contractAddress(init);

            // 1. deploy contract
            send(SendParameters{
                to: campaignContractAddress,
                value: SIGN_UP_FEE, 
                code: init.code, 
                data: init.data,
                body: InternalCreatecampaign{campaignId: campaignId}.toCell()
            });

            send(SendParameters{
                to: self.bot,
                bounce: true,
                value: SIGN_UP_FEE,
                body: CampaignCreatedReply{campaignId: campaignId}.toCell()
            });
        }

        receive(msg: InternalAffiliateCreated) {
            
            let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId));
            require(sender() == expectedAddress, "Access denied");

            send(SendParameters{
                to: self.bot,
                bounce: true,
                value: 0, 
                mode: SendRemainingValue,
                body: AffiliateCreatedReply{campaignId: msg.campaignId, affiliateId: msg.affiliateId}.toCell()
            });
        }

        // Function to handle user click
        receive(msg: UserAction) {
            
            require(sender() == self.bot, "Only bot can invoke UserClicks");
            require(context().value >= self.minMsgValue(1, context().value), "Insufficient funds");
            
            let init: StateInit = self.campaignContractStateInit(msg.campaignId);
            let campaignContractAddress: Address = contractAddress(init);

            

            send(SendParameters{
                to: campaignContractAddress,
                body: InternalUserAction{affiliateId: msg.affiliateId, userAction: msg.userAction, isPremiumUser: msg.isPremiumUser}.toCell(),
                value: 0, 
                mode: SendRemainingValue
            });
        }

        // receive("Resume") is added automatically to allow owner to resume the contract
        // receive("Stop") is added automatically to allow owner to stop the contract
        // get fun stopped(): Bool is added automatically to query if contract is stopped
        // get fun owner(): Address is added automatically to query who the owner is
    }
