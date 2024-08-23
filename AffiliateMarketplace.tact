    import "@stdlib/deploy";
    import "@stdlib/ownable";

    // constants
    const STATE_AFFILIATE_CREATED_BY_ADVERTISER: Int = 0;
    const STATE_SIGNED_BY_PUBLISHER: Int = 1;
    
    const txFee: Int = ton("0.1");

    // messages
    message InternalCreateAffiliate {
        affiliateId: Int as uint32;
    }
    message PublisherSigned{}
    message InternalUserClick{}

    // events
    message PublisherSignedEvent{
        affiliateId: Int as uint32;
        publisher: Address;
        cpc: Int as coins;
    }

    message PublisherPaidEvent {
        affiliateId: Int as uint32;
        publisher: Address;
        cpc: Int as coins;
        txFee: Int as coins;
    }

    // Child contract for each affiliate
    contract Affiliate {

        parent: Address;
        affiliateId: Int as uint32;
        publisher: Address;  
        cpc: Int as coins;
        state: Int as uint32;
        numUserClicks: Int as uint32;

        init(parent: Address, affiliateId: Int, publisher: Address, cpc: Int) {   
            
            require(sender() == parent, "parent must be deployer");

            self.parent = parent;
            self.affiliateId = affiliateId;
            self.publisher = publisher;
            self.cpc = cpc; 

            self.state = STATE_AFFILIATE_CREATED_BY_ADVERTISER;
            self.numUserClicks = 0;
        }

        // piggyback deployment of contract on this message
        receive(msg: InternalCreateAffiliate) {
            // dump(msg.affiliateId);  // for debugging
        }

        fun requireParent() {
            require(sender() == self.parent, "Only the parent contract can invoke this function");
        }

        receive(msg: PublisherSigned) {
            
            require(self.state == STATE_AFFILIATE_CREATED_BY_ADVERTISER, "Must be in state: STATE_AFFILIATE_CREATED_BY_ADVERTISER");
            require(self.publisher == sender(), "Only the publisher can sign");

            self.state = STATE_SIGNED_BY_PUBLISHER;

            emit(PublisherSignedEvent{
                affiliateId: self.affiliateId,
                publisher: self.publisher,
                cpc: self.cpc
            }.toCell());
        }

        receive(msg: InternalUserClick) {
            
            self.requireParent();
            
            require(self.state == STATE_SIGNED_BY_PUBLISHER, "Must be in state: STATE_SIGNED_BY_PUBLISHER");

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
                body: InternalChildToParentTxFee{publisher: self.publisher, affiliateId: self.affiliateId, cpc: self.cpc}.toCell(),
                value: totalFee,
                mode: SendIgnoreErrors + SendRemainingValue
            });

            emit(PublisherPaidEvent{affiliateId: self.affiliateId, publisher: self.publisher, cpc: self.cpc, txFee: totalFee}.toCell());
        }

        get fun balance(): Int {
            return myBalance(); // in nano-tons (like cents, just with 9 decimals)
        }

        get fun numUserClicks(): Int {
            return self.numUserClicks; 
        }
        
        get fun state(): Int {
            return self.state;
        }
    }

    // messages
    message InternalChildToParentTxFee {
        affiliateId: Int as uint32;
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
        amount: Int as coins;
    }

    message UserClick {
        affiliateId: Int as uint32;
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

        get fun balance(): Int {
            return myBalance(); // in nano-tons (like cents, just with 9 decimals)
        }

        fun affiliateContractStateInit(affiliateId: Int, publisher: Address, cpc: Int): StateInit {
            let initCode: StateInit = initOf Affiliate(myAddress(), affiliateId, publisher, cpc);
            return initCode;
        }

        get fun affiliateContractAddress(affiliateId: Int, publisher: Address, cpc: Int): Address {
            return contractAddress(self.affiliateContractStateInit(affiliateId, publisher, cpc));
        }

        receive(msg: InternalChildToParentTxFee) {
            let expectedAddress: Address = contractAddress(self.affiliateContractStateInit(msg.affiliateId, msg.publisher, msg.cpc));
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
                        
            require(sender() == msg.advertiser, "Only advertiser can deploy new Affiliate");  
            require(msg.publisher != msg.advertiser, "Publisher must be != advertiser");
            require(msg.publisher != newAddress(0, 0), "Publisher cannot be the zero address");          
            require(context().value >= msg.amount, "Insufficient funds!");
            require(msg.amount > txFee, "Insufficient funds for txFee");
            
            let affiliateId = self.currAffiliateId;
            self.currAffiliateId = affiliateId + 1;

            let init: StateInit = self.affiliateContractStateInit(affiliateId, msg.publisher, msg.cpc);
            let affiliateContractAddress: Address = contractAddress(init);

            send(SendParameters{
                to: affiliateContractAddress,
                value: msg.amount - txFee, 
                mode: SendIgnoreErrors,
                code: init.code, // deploy the child if needed
                data: init.data,
                body: InternalCreateAffiliate{affiliateId: affiliateId}.toCell()
            });

            emit(AffiliateCreatedEvent{
                affiliateId: affiliateId, 
                advertiser: msg.advertiser, 
                publisher: msg.publisher, 
                cpc: msg.cpc, 
                affiliateContractAddress: affiliateContractAddress
            }.toCell());
        }

        // Function to handle user click
        receive(msg: UserClick) {
            
            require(sender() == self.bot, "Only bot can invoke UserClicks");
            
            let init: StateInit = self.affiliateContractStateInit(msg.affiliateId, msg.publisher, msg.cpc);
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
