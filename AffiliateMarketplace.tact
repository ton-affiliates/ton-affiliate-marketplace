import "@stdlib/deploy";
import "@stdlib/ownable";
import "./jetton";  // Import Jetton interfaces

// Constants
const STATE_AFFILIATE_CREATED: Int = 0;
const STATE_SIGNED_BY_ADVERTISER: Int = 1;
const STATE_SIGNED_BY_PUBLISHER: Int = 2;
const STATE_SIGNED_BY_BOTH: Int = 3;
const storageFee: Int = ton("0.1");

// Messages
message InternalCreateAffiliate {
    affiliateId: Int as uint32;
}
message AdvertiserSigned{}
message PublisherSigned{}
message InternalUserClick{}
message RemoveAffiliateAndWithdrawFunds{}

// Events
message AdvertiserSignedEvent{
    affiliateId: Int as uint32;
    advertiser: Address;
    publisher: Address;
    cpc: Int as coins;
    jettonBalance: Int as coins;
}

message PublisherSignedEvent{
    affiliateId: Int as uint32;
    advertiser: Address;
    publisher: Address;
    cpc: Int as coins;
    jettonBalance: Int as coins;
}

message FundsAddedToAffiliateEvent {
    affiliateId: Int as uint32;
    amountAdded: Int as coins; 
    jettonBalance: Int as coins;
}

message PublisherPaidEvent {
    affiliateId: Int as uint32;
    advertiser: Address;
    publisher: Address;
    cpc: Int as coins;
    txFee: Int as coins;
    jettonBalance: Int as coins;
}

message AffiliateRemovedEvent {
    affiliateId: Int as uint32;
    advertiser: Address;
    publisher: Address;
    cpc: Int as coins;
    jettonBalance: Int as coins;
}

// Affiliate Contract
contract Affiliate {

    parent: Address;
    advertiser: Address;
    publisher: Address;  
    affiliateId: Int as uint32;
    cpc: Int as coins;
    state: Int as uint32;
    numUserClicks: Int as uint32;
    internalJettonBalance: Int as coins;
    walletCreated: Bool;
    jettonMasterAddress: Address;  // Jetton Master address

    init(parent: Address, affiliateId: Int, advertiser: Address, publisher: Address, cpc: Int, jettonMasterAddress: Address) {   
        require(sender() == parent, "parent must be deployer");

        self.parent = parent;
        self.affiliateId = affiliateId;
        self.advertiser = advertiser;
        self.publisher = publisher;
        self.cpc = cpc; 

        self.state = STATE_AFFILIATE_CREATED;
        self.numUserClicks = 0;
        self.internalJettonBalance = 0;
        self.walletCreated = false;
        self.jettonMasterAddress = jettonMasterAddress;  // Initialize Jetton Master address
    }

    // Deploy the Jetton Wallet if needed
    fun deployJettonWalletIfNeeded(): Address {
        if (!self.walletCreated) {
            let init: StateInit = JettonMaster(self.jettonMasterAddress).get_wallet_address(myAddress());
            let walletAddress: Address = contractAddress(init);

            send(SendParameters{
                to: walletAddress,
                value: storageFee,
                bounce: true,
                code: init.code,
                data: init.data
            });

            self.walletCreated = true;
            return walletAddress;
        }
        return JettonMaster(self.jettonMasterAddress).get_wallet_address(myAddress());
    }

    // Handling incoming Jetton transfers to update the internal balance
    receive(msg: TokenNotification) {
        self.internalJettonBalance += msg.amount;

        emit FundsAddedToAffiliateEvent{
            affiliateId: self.affiliateId,
            amountAdded: msg.amount,
            jettonBalance: self.internalJettonBalance
        }.toCell();
    }

    receive(msg: AdvertiserSigned) {
        require(self.state == STATE_AFFILIATE_CREATED || self.state == STATE_SIGNED_BY_PUBLISHER, "Advertiser can only sign if in the created or publisher signed state.");
        require(self.advertiser == sender(), "Only the advertiser can sign.");

        if (self.state == STATE_AFFILIATE_CREATED) {
            self.state = STATE_SIGNED_BY_ADVERTISER;
        } else if (self.state == STATE_SIGNED_BY_PUBLISHER) {
            self.state = STATE_SIGNED_BY_BOTH;
        }

        emit(AdvertiserSignedEvent{
            affiliateId: self.affiliateId,
            advertiser: self.advertiser,
            publisher: self.publisher,
            cpc: self.cpc,
            jettonBalance: self.internalJettonBalance
        }.toCell());
    }

    receive(msg: PublisherSigned) {
        require(self.state == STATE_AFFILIATE_CREATED || self.state == STATE_SIGNED_BY_ADVERTISER, "Publisher can only sign if in the created or advertiser signed state.");
        require(self.publisher == sender(), "Only the publisher can sign.");

        if (self.state == STATE_AFFILIATE_CREATED) {
            self.state = STATE_SIGNED_BY_PUBLISHER;
        } else if (self.state == STATE_SIGNED_BY_ADVERTISER) {
            self.state = STATE_SIGNED_BY_BOTH;
        }

        emit(PublisherSignedEvent{
            affiliateId: self.affiliateId,
            advertiser: self.advertiser,
            publisher: self.publisher,
            cpc: self.cpc,
            jettonBalance: self.internalJettonBalance
        }.toCell());
    }

    receive(msg: InternalUserClick) {
        self.requireParent();
        require(self.state == STATE_SIGNED_BY_BOTH, "Must be in state: STATE_SIGNED_BY_BOTH");

        self.numUserClicks += 1;

        // Calculate fees
        let percentage: Int = 50;  // Represents 0.5%
        let feeFromPublisher: Int = (self.cpc * percentage + 9999) / 10000;  // 0.5% of CPC to be deducted from payment to publisher
        let feeFromContract: Int = feeFromPublisher;  // 0.5% additional fee taken from the contract balance

        // Total fee
        let totalFee: Int = feeFromPublisher + feeFromContract;

        // Ensure sufficient balance after both fees
        require(self.internalJettonBalance >= self.cpc + feeFromContract, "Insufficient Jetton balance to pay publisher and cover fees");

        // Update internal balance before sending
        self.internalJettonBalance -= self.cpc;

        // Transfer the remaining CPC to the publisher
        send(SendParameters{
            to: self.publisher,
            value: self.cpc - feeFromPublisher,
            bounce: true,
            body: TokenTransferInternal{
                query_id: 0,
                amount: self.cpc - feeFromPublisher,
                from: myAddress(),
                response_destination: self.parent,
                forward_ton_amount: 0,
                forward_payload: beginCell().endCell().asSlice()
            }.toCell()
        });

        // tx fee to parent
        send(SendParameters{
            to: self.parent,
            bounce: false,
            body: InternalChildToParentTxFee{advertiser: self.advertiser, publisher: self.publisher, affiliateId: self.affiliateId, cpc: self.cpc}.toCell(),
            value: totalFee,
            mode: SendRemainingValue
        });

        emit PublisherPaidEvent{affiliateId: self.affiliateId, advertiser: self.advertiser, publisher: self.publisher, cpc: self.cpc, txFee: totalFee, jettonBalance: self.internalJettonBalance}.toCell();
    }

    receive(msg: RemoveAffiliateAndWithdrawFunds) {
        require((sender() == self.advertiser) || (sender() == self.publisher), "Only the advertiser/publisher can remove the affiliate");

        let balance = self.internalJettonBalance;
        self.internalJettonBalance = 0;

        // Withdraw the remaining Jettons
        send(SendParameters{
            to: self.advertiser,
            bounce: true,
            value: 0,
            body: TokenTransferInternal{
                query_id: 0,
                amount: balance,
                from: myAddress(),
                response_destination: self.advertiser,
                forward_ton_amount: 0,
                forward_payload: beginCell().endCell().asSlice()
            }.toCell(),
            mode: SendRemainingBalance
        });

        emit AffiliateRemovedEvent{affiliateId: self.affiliateId, advertiser: self.advertiser, publisher: self.publisher, cpc: self.cpc, jettonBalance: balance}.toCell();
    }

    get fun balance(): Int {
        return self.internalJettonBalance;
    }

    get fun numUserClicks(): Int {
        return self.numUserClicks;
    }
}


// Parent Contract 
contract AffiliateMarketplace with Deployable, Ownable {

    // State variables
    owner: Address;
    bot: Address;
    currAffiliateId: Int as uint32;
    jettonMasterAddress: Address;  // Jetton Master address

    // Constructor
    init(bot: Address, jettonMasterAddress: Address) {
        self.owner = sender();
        self.bot = bot;
        self.currAffiliateId = 0;
        self.jettonMasterAddress = jettonMasterAddress;  // Initialize Jetton Master address
    }

    fun requireBot() {
        require(sender() == self.bot, "Only the bot is permitted here");
    }

    get fun balance(): Int {
        return myBalance();
    }

    fun affiliateContractStateInit(affiliateId: Int, advertiser: Address, publisher: Address, cpc: Int): StateInit {
        let initCode: StateInit = initOf Affiliate(myAddress(), affiliateId, advertiser, publisher, cpc, self.jettonMasterAddress);
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
        require(self.balance() >= msg.amount, "Insufficient funds");
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
            value: storageFee,
            mode: SendIgnoreErrors,
            code: init.code,
            data: init.data,
            body: InternalCreateAffiliate{affiliateId: affiliateId}.toCell()
        });

        emit AffiliateCreatedEvent{
            affiliateId: affiliateId,
            advertiser: msg.advertiser,
            publisher: msg.publisher,
            cpc: msg.cpc,
            affiliateContractAddress: affiliateContractAddress
        }.toCell();
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

import "@stdlib/deploy";
import "@stdlib/ownable";

// Parent Contract 
contract AffiliateMarketplace with Deployable, Ownable {

    // State variables
    owner: Address;
    bot: Address;
    currAffiliateId: Int as uint32;
    jettonMasterAddress: Address;  // Jetton Master address

    // Constructor
    init(bot: Address, jettonMasterAddress: Address) {
        self.owner = sender();
        self.bot = bot;
        self.currAffiliateId = 0;
        self.jettonMasterAddress = jettonMasterAddress;  // Initialize Jetton Master address
    }

    fun requireBot() {
        require(sender() == self.bot, "Only the bot is permitted here");
    }

    get fun balance(): Int {
        return myBalance();
    }

    fun affiliateContractStateInit(affiliateId: Int, advertiser: Address, publisher: Address, cpc: Int): StateInit {
        let initCode: StateInit = initOf Affiliate(myAddress(), affiliateId, advertiser, publisher, cpc, self.jettonMasterAddress);
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
        require(self.balance() >= msg.amount, "Insufficient funds");
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
            value: storageFee,
            mode: SendIgnoreErrors,
            code: init.code,
            data: init.data,
            body: InternalCreateAffiliate{affiliateId: affiliateId}.toCell()
        });

        emit AffiliateCreatedEvent{
            affiliateId: affiliateId,
            advertiser: msg.advertiser,
            publisher: msg.publisher,
            cpc: msg.cpc,
            affiliateContractAddress: affiliateContractAddress
        }.toCell();
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

