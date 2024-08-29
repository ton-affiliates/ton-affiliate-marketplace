    import "@stdlib/deploy";
    import "@stdlib/ownable";

    // constants

    // affiliate contract state
    const STATE_AFFILIATE_CREATED: Int = 0;
    const STATE_AFFILIATE_DETAILS_SET_BY_ADVERTISER: Int = 1;
    const STATE_AFFILIATE_DETAILS_SIGNED_BY_PUBLISHER: Int = 2;

    // user action types 
    const USER_CLICK: Int = 0; // user click
    const USER_STAYD_ENOUGH_TIME: Int = 1;  // user stayed in group/channel/bot enough time 
    const GROUP_LIKE: Int = 2;  // user like a post in a group
    const GROUP_SHARE: Int = 3;  // user made a comment in a group
    const GROUP_POST: Int = 4;  // user posted something in a group

    // fees
    const AFFILIATE_CONTRACT_FEE: Int = ton("0.1");  
    const STORAGE_FEE: Int = ton("0.01");
    const MIN_COST_PER_USER_ACTION: Int = ton("0.008"); // so gas costs will not drain the contract
    

    // structs
    struct UserActions {
        
        // groups/channels/bots
        userClick: Int;
        userStayedEnoughTime: Int;

        // groups
        groupLike: Int;
        groupShare: Int;
        groupPost: Int;
    }

    struct AffiliatePricing {
        regularUsers: UserActions;
        premiumUsers: UserActions;
    }

    message InternalCreateAffiliate{affiliateId: Int as uint32}

    // messages
    message AdvertiserSigned {
        affiliatePricing: AffiliatePricing;
        daysWithoutUserActionForWithdrawFunds: Int as uint32; 
        affiliateAmount: Int as coins;  // amount of the affiliate
    }

    message PublisherSigned{}
    message InternalUserAction{
        userAction: Int as uint32;
        isPremiumUser: Bool;
    }
    message RemoveAffiliateAndWithdrawFunds{}


    // Child contract for each affiliate
    contract Affiliate {

        parent: Address;
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;  
        state: Int as uint32;
        numUserActions: Int as uint32;
        lastUserAction: Int as uint32;
        regularUsers: map<Int, Int>;  // user action -> cost
        premiumUsers: map<Int, Int>; // user action -> cost 
        daysWithoutUserActionForWithdrawFunds: Int as uint32;
        affiliateAmount: Int as uint32;

        init(parent: Address, affiliateId: Int, advertiser: Address, publisher: Address) { 
            dump("Constructor!");
            require(sender() == parent, "parent must be deployer");

            self.parent = parent;
            self.affiliateId = affiliateId;
            self.advertiser = advertiser;  
            self.publisher = publisher;  
            self.regularUsers = emptyMap();  
            self.premiumUsers = emptyMap(); 
            self.daysWithoutUserActionForWithdrawFunds = 365; 
            self.state = STATE_AFFILIATE_CREATED;
            self.numUserActions = 0;
            self.lastUserAction = 0;
            self.affiliateAmount = 0;
        }

        fun requireValGTMinCPA(val: Int) {
            if (val > 0) {
                require(val >= MIN_COST_PER_USER_ACTION, "cpa must be greater than min cost for user action");
            }
        }

        // piggyback deployment of contract on this message
        receive(msg: InternalCreateAffiliate) {
            dump(msg.affiliateId);  // for debugging
        }

        receive (msg: AdvertiserSigned) {
            
            require(sender() == self.advertiser, "Only advertiser can sign");
            require(self.state == STATE_AFFILIATE_CREATED, "Must be in state: STATE_AFFILIATE_CREATED");
            require(context().value >= AFFILIATE_CONTRACT_FEE + msg.affiliateAmount, "Insufficient funds");

            // verify values
            self.requireValGTMinCPA(msg.affiliatePricing.regularUsers.userClick);
            self.requireValGTMinCPA(msg.affiliatePricing.regularUsers.userStayedEnoughTime);
            self.requireValGTMinCPA(msg.affiliatePricing.regularUsers.groupLike);
            self.requireValGTMinCPA(msg.affiliatePricing.regularUsers.groupShare);
            self.requireValGTMinCPA(msg.affiliatePricing.regularUsers.groupPost);

            self.requireValGTMinCPA(msg.affiliatePricing.premiumUsers.userClick);
            self.requireValGTMinCPA(msg.affiliatePricing.premiumUsers.userStayedEnoughTime);
            self.requireValGTMinCPA(msg.affiliatePricing.premiumUsers.groupLike);
            self.requireValGTMinCPA(msg.affiliatePricing.premiumUsers.groupShare);
            self.requireValGTMinCPA(msg.affiliatePricing.premiumUsers.groupPost);

            self.state = STATE_AFFILIATE_DETAILS_SET_BY_ADVERTISER;
            self.lastUserAction = now();

            self.regularUsers.set(USER_CLICK, msg.affiliatePricing.regularUsers.userClick);  
            self.regularUsers.set(USER_STAYD_ENOUGH_TIME, msg.affiliatePricing.regularUsers.userStayedEnoughTime);
            self.regularUsers.set(GROUP_LIKE, msg.affiliatePricing.regularUsers.groupLike);
            self.regularUsers.set(GROUP_SHARE, msg.affiliatePricing.regularUsers.groupShare);
            self.regularUsers.set(GROUP_POST, msg.affiliatePricing.regularUsers.groupPost);

            self.premiumUsers.set(USER_CLICK, msg.affiliatePricing.regularUsers.userClick);  
            self.premiumUsers.set(USER_STAYD_ENOUGH_TIME, msg.affiliatePricing.regularUsers.userStayedEnoughTime);
            self.premiumUsers.set(GROUP_LIKE, msg.affiliatePricing.regularUsers.groupLike);
            self.premiumUsers.set(GROUP_SHARE, msg.affiliatePricing.regularUsers.groupShare);
            self.premiumUsers.set(GROUP_POST, msg.affiliatePricing.regularUsers.groupPost);

            self.daysWithoutUserActionForWithdrawFunds = msg.daysWithoutUserActionForWithdrawFunds;
            self.affiliateAmount = msg.affiliateAmount;

            // tx fee to parent
            send(SendParameters{
                to: self.parent,
                bounce: true,
                body: InternalChildToParentTxFee{
                    affiliateId: self.affiliateId,
                    advertiser: self.advertiser, 
                    publisher: self.publisher
                }.toCell(),
                value: AFFILIATE_CONTRACT_FEE,
                mode: SendIgnoreErrors 
            });
        }

        receive(msg: PublisherSigned) {
            
            require(sender() == self.publisher, "Only publisher can sign");
            require(self.state == STATE_AFFILIATE_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_AFFILIATE_DETAILS_SET_BY_ADVERTISER");
            require(context().value >= AFFILIATE_CONTRACT_FEE, "Insufficient funds to pay contract fee");

            self.publisher = sender();
            self.state = STATE_AFFILIATE_DETAILS_SIGNED_BY_PUBLISHER;
            self.lastUserAction = now();

            // tx fee to parent
            send(SendParameters{
                to: self.parent,
                bounce: true,
                body: InternalChildToParentTxFee{
                    affiliateId: self.affiliateId,
                    advertiser: self.advertiser, 
                    publisher: self.publisher
                }.toCell(),                
                value: 0,
                mode: SendIgnoreErrors | SendRemainingValue
            });
        }

        receive(msg: RemoveAffiliateAndWithdrawFunds) {

            require(sender() == self.advertiser, "Only the advertiser can remove the affiliate");            
            require(now() - self.lastUserAction > self.daysWithoutUserActionForWithdrawFunds*24*60*60, "Advertiser can withdraw funds only after agreed upon time period with no user action");
            require(self.state > STATE_AFFILIATE_CREATED, "state must be in: [STATE_AFFILIATE_DETAILS_SET_BY_ADVERTISER, STATE_AFFILIATE_DETAILS_SIGNED_BY_PUBLISHER]");
            
            send(SendParameters{
                to: self.advertiser,
                bounce: true,
                value: 0,
                mode: SendRemainingBalance  // send all TON in contract to advertiser
            });
        }

        receive(msg: InternalUserAction) {
            
            require(sender() == self.parent, "Only the parent contract can invoke this function");
            require(self.state == STATE_AFFILIATE_DETAILS_SIGNED_BY_PUBLISHER, "Must be in state: STATE_AFFILIATE_DETAILS_SIGNED_BY_PUBLISHER");

            let costPerAction: Int? = null;
            if (msg.isPremiumUser) {
                costPerAction = self.premiumUsers.get(msg.userAction);
            } else {
                costPerAction = self.regularUsers.get(msg.userAction);
            }

            require(costPerAction != null, "Action does not exist at all");
            require(costPerAction!! > 0, "Action does not exist for affiliate");

            // Calculate fees
            let percentage: Int = 50;  // Represents 0.5%
            let feeFromPublisher: Int = (costPerAction!! * percentage + 9999) / 10000;  // 0.5% of CPC to be deducted from payment to publisher
            let feeFromContract: Int = feeFromPublisher;  // 0.5% additional fee taken from the contract balance

            // Total fee
            let totalFee: Int = feeFromPublisher + feeFromContract;

            // Ensure sufficient balance after both fees
            require(myBalance() >= costPerAction!! + feeFromContract, "Insufficient contract balance to pay publisher and cover fees");

            self.numUserActions = self.numUserActions + 1;
            self.lastUserAction = now();

            // Transfer the remaining CPC to the publisher
            send(SendParameters{
                to: self.publisher,
                bounce: true,
                value: costPerAction!! - feeFromPublisher,
                mode: SendIgnoreErrors
            });

            // tx fee to parent
            send(SendParameters{
                to: self.parent,
                bounce: true,
                body: InternalChildToParentTxFee{
                    affiliateId: self.affiliateId,
                    advertiser: self.advertiser,
                    publisher: self.publisher
                }.toCell(),
                value: totalFee,
                mode: SendIgnoreErrors + SendRemainingValue
            });
        }

        get fun balance(): Int {
            return myBalance(); // in nano-tons (like cents, just with 9 decimals)
        }

        get fun numUserActions(): Int {
            return self.numUserActions; 
        }
        
        get fun state(): Int {
            return self.state;
        }
    }

    // messages
    message InternalChildToParentTxFee {
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
    }

    message AdminWithdraw {
        amount: Int as coins;
    }

    message CreateAffiliate {
        advertiser: Address;
        publisher: Address;
    }

    message UserAction {
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
        userAction: Int as uint32;
        isPremiumUser: Bool;
    }

    // events   
    message AffiliateCreatedEvent {
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
        affiliateContractAddress: Address;
    }


    // Parent Contract 
    contract AffiliateMarketplace with Deployable, Ownable {

        // state
        owner: Address;
        bot: Address;

        currAffiliateId: Int as uint32;  // running id

        // Constructor
        init(bot: Address) {
            self.owner = sender();
            self.bot = bot;
            self.currAffiliateId = 0;
        }

        get fun balance(): Int {
            return myBalance(); // in nano-tons (like cents, just with 9 decimals)
        }

        fun affiliateContractStateInit(affiliateId: Int, advertiser: Address, publisher: Address): StateInit {
            let initCode: StateInit = initOf Affiliate(myAddress(), affiliateId, advertiser, publisher);
            return initCode;
        }

        get fun affiliateContractAddress(affiliateId: Int, advertiser: Address, publisher: Address): Address {
            return contractAddress(self.affiliateContractStateInit(affiliateId, advertiser, publisher));
        }

        receive(msg: InternalChildToParentTxFee) {
            let expectedAddress: Address = contractAddress(self.affiliateContractStateInit(msg.affiliateId, msg.advertiser, msg.publisher));
            require(sender() == expectedAddress, "Access denied");
        }

        receive(msg: AdminWithdraw) {
            
            self.requireOwner();
            
            require(myBalance() > msg.amount, "Insufficient funds");
            
            send(SendParameters{
                to: self.owner,
                bounce: true,
                value: msg.amount,
                mode: SendRemainingValue 
            });
        }

        // Function to create a new affiliate
        receive(msg: CreateAffiliate) {

            dump("1");

            require(sender() == self.bot, "Only bot can create new Affiliates");
            dump("2");
            require(context().value >= STORAGE_FEE, "Insufficient funds");
                        
            let affiliateId = self.currAffiliateId;
            self.currAffiliateId = affiliateId + 1;

            dump(affiliateId);

            let init: StateInit = self.affiliateContractStateInit(affiliateId, msg.advertiser, msg.publisher);
            dump("init");
            let affiliateContractAddress: Address = contractAddress(init);

            dump(affiliateContractAddress);

            // 1. deploy contract
            send(SendParameters{
                to: affiliateContractAddress,
                value: STORAGE_FEE, 
                code: init.code, 
                data: init.data,
                body: InternalCreateAffiliate{affiliateId: affiliateId}.toCell(),
                mode: SendIgnoreErrors | SendRemainingValue
            });

            emit(AffiliateCreatedEvent{
                affiliateId: affiliateId, 
                advertiser: msg.advertiser,
                publisher: msg.publisher,
                affiliateContractAddress: affiliateContractAddress
            }.toCell());
        }

        // Function to handle user click
        receive(msg: UserAction) {
            
            require(sender() == self.bot, "Only bot can invoke UserClicks");
            
            let init: StateInit = self.affiliateContractStateInit(msg.affiliateId, msg.advertiser, msg.publisher);
            let affiliateContractAddress: Address = contractAddress(init);

            send(SendParameters{
                to: affiliateContractAddress,
                body: InternalUserAction{userAction: msg.userAction, isPremiumUser: msg.isPremiumUser}.toCell(),
                value: 0, 
                mode: SendRemainingValue | SendIgnoreErrors
            });
        }
    }
