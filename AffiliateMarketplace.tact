import "@stdlib/stoppable";
import "@stdlib/ownable";
import "@stdlib/deploy";

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
    const STORAGE_FEE: Int = ton("0.1");
    const MIN_COST_PER_USER_ACTION: Int = ton("0.01"); // so gas costs will not drain the contract
    

    // structs
    struct UserActions {
        
        // groups/channels/bots
        userClick: Int = 0;
        userStayedEnoughTime: Int = 0;

        // groups
        groupLike: Int = 0;
        groupShare: Int = 0;
        groupPost: Int = 0;
    }

    struct AffiliatePricing {
        regularUsers: UserActions;
        premiumUsers: UserActions;
    }

    struct AffiliateDetails {
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;  
        state: Int as uint32;
        numUserActions: Int as uint32;
        lastUserAction: Int as uint32;
        affiliatePricing: AffiliatePricing;
        daysWithoutUserActionForWithdrawFunds: Int as uint32;
        affiliateAmount: Int as coins;
        contractBalance: Int as coins;
        contractAddress: Address;
    }

    message InternalCreateAffiliate{affiliateId: Int as uint32}

    // messages
    message AdvertiserSigned {
        affiliatePricing: AffiliatePricing;
        daysWithoutUserActionForWithdrawFunds: Int as uint32; 
        affiliateAmount: Int as coins;  // amount of the affiliate (e.g. 10 TON)
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
        affiliatePricing: AffiliatePricing;
        daysWithoutUserActionForWithdrawFunds: Int as uint32;
        affiliateAmount: Int as coins;

        init(parent: Address, affiliateId: Int) { 
            
            require(sender() == parent, "parent must be deployer");

            self.parent = parent;
            self.affiliateId = affiliateId;
            self.advertiser = parent;  
            self.publisher = parent;  
            self.affiliatePricing = AffiliatePricing{
                regularUsers: UserActions{}, 
                premiumUsers: UserActions{}
            };
            self.daysWithoutUserActionForWithdrawFunds = 0; 
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

            self.advertiser = sender();
            self.state = STATE_AFFILIATE_DETAILS_SET_BY_ADVERTISER;
            self.lastUserAction = now();
            self.affiliatePricing = msg.affiliatePricing;
            self.affiliateAmount = msg.affiliateAmount;
            self.daysWithoutUserActionForWithdrawFunds = msg.daysWithoutUserActionForWithdrawFunds;

            // tx fee to parent
            send(SendParameters{
                to: self.parent,
                body: InternalChildToParentTxFee{
                    affiliateId: self.affiliateId
                }.toCell(),
                value: AFFILIATE_CONTRACT_FEE,
                mode: SendIgnoreErrors 
            });
        }

        receive(msg: PublisherSigned) {
            
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
                    affiliateId: self.affiliateId
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
            require((msg.userAction == USER_CLICK) || 
                    (msg.userAction == USER_STAYD_ENOUGH_TIME) ||
                    (msg.userAction == GROUP_LIKE) ||
                    (msg.userAction == GROUP_SHARE) ||
                    (msg.userAction == GROUP_POST), "Invalid user action");

            let costPerAction: Int = 0;
            if (msg.isPremiumUser) {
                if (msg.userAction == USER_CLICK) {
                    costPerAction = self.affiliatePricing.premiumUsers.userClick;
                } else if (msg.userAction == USER_STAYD_ENOUGH_TIME) {
                    costPerAction = self.affiliatePricing.premiumUsers.userStayedEnoughTime;
                } else if (msg.userAction == GROUP_LIKE) {
                    costPerAction = self.affiliatePricing.premiumUsers.groupLike;
                } else if (msg.userAction == GROUP_POST) {
                    costPerAction = self.affiliatePricing.premiumUsers.groupPost;
                } else if (msg.userAction == GROUP_SHARE) {
                    costPerAction = self.affiliatePricing.premiumUsers.groupShare;
                } 
                 
            } else {

                // regular user
                if (msg.userAction == USER_CLICK) {
                    costPerAction = self.affiliatePricing.regularUsers.userClick;
                } else if (msg.userAction == USER_STAYD_ENOUGH_TIME) {
                    costPerAction = self.affiliatePricing.regularUsers.userStayedEnoughTime;
                } else if (msg.userAction == GROUP_LIKE) {
                    costPerAction = self.affiliatePricing.regularUsers.groupLike;
                } else if (msg.userAction == GROUP_POST) {
                    costPerAction = self.affiliatePricing.regularUsers.groupPost;
                } else if (msg.userAction == GROUP_SHARE) {
                    costPerAction = self.affiliatePricing.regularUsers.groupShare;
                } 
            }

            require(costPerAction != 0, "Action does not exist at all");

            // Calculate fees
            let percentage: Int = 50;  // Represents 0.5%
            let feeFromPublisher: Int = (costPerAction * percentage + 9999) / 10000;  // 0.5% of CPC to be deducted from payment to publisher
            let feeFromContract: Int = feeFromPublisher;  // 0.5% additional fee taken from the contract balance

            // Total fee
            let totalFee: Int = feeFromPublisher + feeFromContract;

            // Ensure sufficient balance after both fees
            require(myBalance() >= costPerAction + feeFromContract, "Insufficient contract balance to pay publisher and cover fees");

            self.numUserActions = self.numUserActions + 1;
            self.lastUserAction = now();

            // Transfer the remaining CPC to the publisher
            send(SendParameters{
                to: self.publisher,
                bounce: true,
                value: costPerAction - feeFromPublisher,
                mode: SendIgnoreErrors
            });

            // tx fee to parent
            send(SendParameters{
                to: self.parent,
                bounce: true,
                body: InternalChildToParentTxFee{
                    affiliateId: self.affiliateId
                }.toCell(),
                value: totalFee,
                mode: SendIgnoreErrors + SendRemainingValue
            });
        }

        get fun affiliateDetails(): AffiliateDetails {

            return AffiliateDetails {
                affiliateId: self.affiliateId,
                advertiser: self.advertiser,
                publisher: self.publisher, 
                state: self.state,
                numUserActions: self.numUserActions,
                lastUserAction: self.lastUserAction,
                affiliatePricing: self.affiliatePricing,
                daysWithoutUserActionForWithdrawFunds: self.daysWithoutUserActionForWithdrawFunds,
                affiliateAmount: self.affiliateAmount,
                contractBalance: myBalance(),
                contractAddress: myAddress()
            }
        }
    }

    // messages
    message InternalChildToParentTxFee {
        affiliateId: Int as uint32;
    }

    message AdminWithdraw {
        amount: Int as coins;
    }

    message CreateAffiliate {}

    message UserAction {
        affiliateId: Int as uint32;
        userAction: Int as uint32;
        isPremiumUser: Bool;
    }

    message AffiliateCreatedReply {
        affiliateId: Int as uint32;
    }


    // Parent Contract 
    contract AffiliateMarketplace with Deployable, Resumable  {

        // state
        owner: Address;
        stopped: Bool; 
        bot: Address;

        currAffiliateId: Int as uint32;  // running id

        // Constructor
        init(bot: Address) {
            self.owner = sender();
            self.stopped = false;
            self.bot = bot;
            self.currAffiliateId = 0;
        }

        get fun balance(): Int {
            return myBalance(); // in nano-tons (like cents, just with 9 decimals)
        }

        fun affiliateContractStateInit(affiliateId: Int): StateInit {
            let initCode: StateInit = initOf Affiliate(myAddress(), affiliateId);
            return initCode;
        }

        get fun affiliateContractAddress(affiliateId: Int): Address {
            return contractAddress(self.affiliateContractStateInit(affiliateId));
        }

        receive(msg: InternalChildToParentTxFee) {
            let expectedAddress: Address = contractAddress(self.affiliateContractStateInit(msg.affiliateId));
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

            require(sender() == self.bot, "Only bot can create new Affiliates");
            require(context().value >= STORAGE_FEE, "Insufficient funds");
                        
            let affiliateId = self.currAffiliateId;
            self.currAffiliateId = affiliateId + 1;

            let init: StateInit = self.affiliateContractStateInit(affiliateId);
            let affiliateContractAddress: Address = contractAddress(init);

            // 1. deploy contract
            send(SendParameters{
                to: affiliateContractAddress,
                value: STORAGE_FEE, 
                mode: SendIgnoreErrors,
                code: init.code, 
                data: init.data,
                body: InternalCreateAffiliate{affiliateId: affiliateId}.toCell()
            });

            self.reply(AffiliateCreatedReply{affiliateId: affiliateId}.toCell());
        }

        // Function to handle user click
        receive(msg: UserAction) {
            
            require(sender() == self.bot, "Only bot can invoke UserClicks");
            
            let init: StateInit = self.affiliateContractStateInit(msg.affiliateId);
            let affiliateContractAddress: Address = contractAddress(init);

            send(SendParameters{
                to: affiliateContractAddress,
                body: InternalUserAction{userAction: msg.userAction, isPremiumUser: msg.isPremiumUser}.toCell(),
                value: 0, 
                mode: SendRemainingValue
            });
        }

        // receive("Resume") is added automatically to allow owner to resume the contract
        // receive("Stop") is added automatically to allow owner to stop the contract
        // get fun stopped(): Bool is added automatically to query if contract is stopped
        // get fun owner(): Address is added automatically to query who the owner is
    }
