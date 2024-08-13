    import "@stdlib/deploy";
    import "@stdlib/ownable";

    // constants
    const STATE_AFFILIATE_CREATED: Int = 0;
    const STATE_SIGNED_BY_ADVERTISER: Int = 1;
    const STATE_SIGNED_BY_PUBLISHER: Int = 2;
    const STATE_SIGNED_BY_BOTH: Int = 3;
    const storageFee: Int = ton("0.1");

    // messages
    message InternalCreateAffiliate {
        affiliateId: Int as uint32;
    }
    message AdvertiserSigned{}
    message PublisherSigned{}
    message AddFunds{}
    message InternalUserClick{}
    message RemoveAffiliateAndWithdrawFunds{}

    // events
    message AdvertiserSignedEvent{
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
        cpc: Int as coins;
        contractBalance: Int as coins;
    }

    message PublisherSignedEvent{
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
        cpc: Int as coins;
        contractBalance: Int as coins;
    }

    message FundsAddedToAffiliateEvent {
        affiliateId: Int as uint32;
        amountAdded: Int as coins; 
        contractBalance: Int as coins;
    }

    message PublisherPaidEvent {
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
        cpc: Int as coins;
        txFee: Int as coins;
        contractBalance: Int as coins;
    }

    message AffiliateRemovedEvent {
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
        cpc: Int as coins;
        contractBalance: Int as coins;
    }

    // Child contract for each affiliate
    contract Affiliate {

        parent: Address;
        advertiser: Address;
        publisher: Address;  
        affiliateId: Int as uint32;
        cpc: Int as coins;
        state: Int as uint32;
        numUserClicks: Int as uint32;

        init(parent: Address, affiliateId: Int, advertiser: Address, publisher: Address, cpc: Int) {   
            
            require(sender() == parent, "parent must be deployer");

            self.parent = parent;
            self.affiliateId = affiliateId;
            self.advertiser = advertiser;
            self.publisher = publisher;
            self.cpc = cpc; 

            self.state = STATE_AFFILIATE_CREATED;
            self.numUserClicks = 0;
        }

        // piggyback deployment of contract on this message
        receive(msg: InternalCreateAffiliate) {
            // dump(msg.affiliateId);  // for debugging
        }

        fun requireParent() {
            require(sender() == self.parent, "Only the parent contract can invoke this function");
        }


    receive(msg: AdvertiserSigned) {
        require(self.state == STATE_AFFILIATE_CREATED || self.state == STATE_SIGNED_BY_PUBLISHER, "Advertiser can only sign if in the created or publisher signed state.");
        require(self.advertiser == sender(), "Only the advertiser can sign.");

        if (self.state == STATE_AFFILIATE_CREATED) {
            // Advertiser signs first
            self.state = STATE_SIGNED_BY_ADVERTISER;
        } else if (self.state == STATE_SIGNED_BY_PUBLISHER) {
            // Publisher already signed, so this makes both parties signed
            self.state = STATE_SIGNED_BY_BOTH;
        }

        emit(AdvertiserSignedEvent{
            affiliateId: self.affiliateId,
            advertiser: self.advertiser,
            publisher: self.publisher,
            cpc: self.cpc,
            contractBalance: myBalance()
        }.toCell());
    }

    receive(msg: PublisherSigned) {
        require(self.state == STATE_AFFILIATE_CREATED || self.state == STATE_SIGNED_BY_ADVERTISER, "Publisher can only sign if in the created or advertiser signed state.");
        require(self.publisher == sender(), "Only the publisher can sign.");

        if (self.state == STATE_AFFILIATE_CREATED) {
            // Publisher signs first
            self.state = STATE_SIGNED_BY_PUBLISHER;
        } else if (self.state == STATE_SIGNED_BY_ADVERTISER) {
            // Advertiser already signed, so this makes both parties signed
            self.state = STATE_SIGNED_BY_BOTH;
        }

        emit(PublisherSignedEvent{
            affiliateId: self.affiliateId,
            advertiser: self.advertiser,
            publisher: self.publisher,
            cpc: self.cpc,
            contractBalance: myBalance()
        }.toCell());
    }


        // Funds added directly to the contract's balance
        receive(msg: AddFunds) {
            
            require(sender() == self.advertiser, "Only advertiser can add funds");
            require(context().value >= storageFee, "Amount must be greater than storageFee");
            
            emit(FundsAddedToAffiliateEvent{affiliateId: self.affiliateId, amountAdded: context().value, contractBalance: myBalance()}.toCell());
        }

        // 0.5 % from cpc and 0.5% from contract (e.g. half from publisher and half from advertiser)
        receive(msg: InternalUserClick) {
            
            self.requireParent();
            
            require(self.state == STATE_SIGNED_BY_BOTH, "Must be in state: STATE_SIGNED_BY_BOTH");

            self.numUserClicks = self.numUserClicks + 1;

            // Calculate fees
            let percentage: Int = 50;  // Represents 0.5%
            let feeFromPublisher: Int = (self.cpc * percentage + 9999) / 10000;  // 0.5% of CPC to be deducted from payment to publisher
            let feeFromContract: Int = feeFromPublisher;  // 0.5% additional fee taken from the contract balance

            // Total fee
            let totalFee: Int = feeFromPublisher + feeFromContract;

            // Ensure sufficient balance after both fees
            require(myBalance() >= self.cpc + feeFromContract, "Insufficient contract balance to pay publisher and cover fees");
  
            // Transfer the remaining CPC to the publisher
            send(SendParameters{
                to: self.publisher,
                bounce: true,
                value: self.cpc - feeFromPublisher,
                mode: SendIgnoreErrors
            });

            // tx fee to parent
            send(SendParameters{
                to: self.parent,
                bounce: false,
                body: InternalChildToParentTxFee{advertiser: self.advertiser, publisher: self.publisher, affiliateId: self.affiliateId, cpc: self.cpc}.toCell(),
                value: totalFee,
                mode: SendIgnoreErrors + SendRemainingValue
            });

            emit(PublisherPaidEvent{affiliateId: self.affiliateId, advertiser: self.advertiser, publisher: self.publisher, cpc: self.cpc, txFee: totalFee, contractBalance: myBalance()}.toCell());
        }

        receive(msg: RemoveAffiliateAndWithdrawFunds) {
            
            require((sender() == self.advertiser) || (sender() == self.publisher), "Only the advertiser/publisher can remove the affiliate");            
            
            emit(AffiliateRemovedEvent{affiliateId: self.affiliateId, advertiser: self.advertiser, publisher: self.publisher, cpc: self.cpc, contractBalance: myBalance()}.toCell());

            send(SendParameters{
                to: self.advertiser,
                bounce: true,
                value: 0,
                mode: SendRemainingBalance,
            });
        }

        get fun balance(): Int {
            return myBalance(); // in nano-tons (like cents, just with 9 decimals)
        }

        get fun numUserClicks(): Int {
            return self.numUserClicks; 
        }
    }

    // messages
    message InternalChildToParentTxFee {
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
        cpc: Int as coins;
    }

    message AdminWithdraw {
        amount: Int as coins;
    }

    message CreateAffiliate {
        advertiser: Address;
        publisher: Address;
        cpc: Int as coins;
    }

    message UserClick {
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
        cpc: Int as coins;
    }

    // events   
    message AffiliateCreatedEvent {
        affiliateId: Int as uint32;
        advertiser: Address;
        publisher: Address;
        cpc: Int as coins;
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

        fun requireBot() {
            require(sender() == self.bot, "Only the bot is permitted here");
        } 

        get fun balance(): Int {
            return myBalance(); // in nano-tons (like cents, just with 9 decimals)
        }

        fun affiliateContractStateInit(affiliateId: Int, advertiser: Address, publisher: Address, cpc: Int): StateInit {
            let initCode: StateInit = initOf Affiliate(myAddress(), affiliateId, advertiser, publisher, cpc);
            return initCode;
        }

        get fun affiliateContractAddress(affiliateId: Int, advertiser: Address, publisher: Address, cpc: Int): Address {
            return contractAddress(self.affiliateContractStateInit(affiliateId, advertiser, publisher, cpc));
        }

        receive(msg: InternalChildToParentTxFee) {
            let expectedAddress: Address = self.affiliateContractAddress(msg.affiliateId, msg.advertiser, msg.publisher, msg.cpc);
            require(sender() == expectedAddress, "Access denied");
        }

        receive(msg: AdminWithdraw) {
            
            self.requireOwner();
            
            require(myBalance() >= msg.amount, "Insufficient funds");
            
            send(SendParameters{
                to: self.owner,
                bounce: true,
                value: msg.amount,
                mode: SendRemainingValue 
            });
        }

        // Function to create a new affiliate
        receive(msg: CreateAffiliate) {
            
            self.requireBot();
            
            require(context().value >= storageFee, "Insufficient funds to perform this operation");
            
            let affiliateId = self.currAffiliateId;
            self.currAffiliateId = affiliateId + 1;

            let init: StateInit = self.affiliateContractStateInit(affiliateId, msg.advertiser, msg.publisher, msg.cpc);
            let affiliateContractAddress: Address = contractAddress(init);

            send(SendParameters{
                to: affiliateContractAddress,
                value: storageFee, // strgaeFee is for child contract to keep for rent payments 
                mode: SendIgnoreErrors,
                code: init.code, // deploy the child if needed
                data: init.data,
                body: InternalCreateAffiliate{affiliateId: affiliateId}.toCell()
            });

            emit(AffiliateCreatedEvent{affiliateId: affiliateId, advertiser: msg.advertiser, publisher: msg.publisher, cpc: msg.cpc, affiliateContractAddress: affiliateContractAddress}.toCell());
        }

        // Function to handle user click
        receive(msg: UserClick) {
            
            self.requireBot();
            
            let init: StateInit = self.affiliateContractStateInit(msg.affiliateId, msg.advertiser, msg.publisher, msg.cpc);
            let affiliateContractAddress: Address = contractAddress(init);

            send(SendParameters{
                to: affiliateContractAddress,
                body: InternalUserClick{}.toCell(),
                value: 0, 
                mode: SendRemainingValue + SendIgnoreErrors,
                bounce: false
            });

        }
    }
