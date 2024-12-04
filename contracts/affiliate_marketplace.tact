import "@stdlib/stoppable";
import "@stdlib/ownable";
import "@stdlib/deploy";
import "./messages.tact";

// constants
const MAX_NUM_AFFILIATES: Int = 10000;

const STATE_CAMPAIGN_CREATED: Int = 0;
const STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER: Int = 1;

const DEPLOY_NEW_CONTRACT_COST: Int = ton("0.1");
const GAS_FEE: Int = ton("0.01");
const CAMPAIGN_BUFFER: Int = ton("0.5");

const USER_ACTION_OP_CODES_BOT: Int = 2000;

// Payment method options
const PAYMENT_METHOD_TON: Int = 0;
const PAYMENT_METHOD_USDT: Int = 1;

struct CampaignDetails {
    regularUsersCostPerAction: map<Int, Int>; // op code -> cpa
    premiumUsersCostPerAction: map<Int, Int>; // op code -> cpa
    allowedAffiliates: map<Address, Bool>;  // closed campaign affiliates list
    isOpenCampaign: Bool; // anyone can be an affiliate
    campaignValidForNumDays: Int? as uint32; // optional - campaign expiry period
    paymentMethod: Int as uint32; // TON (0) or USDT (1)
    requiresAdvertiserApprovalForWithdrawl: Bool;  // Flag indicating if advertiser withdraws earnings for affiliates by default or not
}

struct UserActionStats {
    numActions: Int as uint32;
    lastUserActionTimestamp: Int as uint32;
}

struct AffiliateData {
    affiliate: Address;
    userActionsStats: map<Int, UserActionStats>;
    premiumUserActionsStats: map<Int, UserActionStats>;
    pendingApprovalEarnings: Int as coins;
    totalEarnings: Int as coins; // over time
	withdrawEarnings: Int as coins; // earnings ready to withdraw now
}

struct CampaignData {
    campaignId: Int as uint32;
    advertiser: Address;
    owner: Address;
    payout: Address;
    campaignDetails: CampaignDetails;
    numAffiliates: Int as uint32;
    totalAffiliateEarnings: Int as coins;
    state: Int as uint32;
    campaignStartTimestamp: Int as uint32;
    lastUserActionTimestamp: Int as uint32;
    numUserActions: Int as uint32;
    campaignBalance: Int as coins;
    maxCpaValue: Int as coins;
    contractTonBalance: Int as coins;  // myBalance
    contractAddress: Address;
    contractUSDTBalance: Int as coins;
    contractUsdtJettonWallet: Address;
    feePercentage: Int as uint32;
    campaignHasSufficientFundsToPayMaxCpa: Bool;
    isCampaignExpired: Bool;
    isCampaignPausedByAdmin: Bool;
    campaignHasSufficientTonToPayGasFees: Bool;
    isCampaignActive: Bool;
    topAffiliates: map<Int, Int>;
}

struct JettonWalletData {
    status: Int as uint4;
    balance: Int as coins;
    ownerAddress: Address;
    jettonMasterAddress: Address;
}


// And the function to calculate the wallet address may look like this:
fun calculateJettonWalletAddress(
    ownerAddress: Address,
    jettonMasterAddress: Address,
    jettonWalletCode: Cell
): Address {

    let initData = JettonWalletData{
        status: 0,
        balance: 0,
        ownerAddress,
        jettonMasterAddress,
    };

    return contractAddress(StateInit{
        code: jettonWalletCode,
        data: initData.toCell(),
    });
}

// Child contract for each affiliate
contract Campaign with Resumable {

    owner: Address;
    stopped: Bool;

    campaignId: Int as uint32;
    payout: Address;
    advertiser: Address;
    campaignDetails: CampaignDetails;
    bot: Address;

    currAffiliateId: Int as uint32;
    affiliates: map<Int, AffiliateData>;

    state: Int as uint32;
    campaignStartTimestamp: Int as uint32;
    lastUserActionTimestamp: Int as uint32;
    numUserActions: Int as uint32;
    totalAffiliateEarnings: Int as coins;
    maxCpaValue: Int as coins;
    feePercentage: Int as uint32 = 200;

    topAffiliates: map<Int, Int>; // Affiliate ID -> Earnings

    contractUSDTBalance: Int as coins;
    contractUsdtJettonWallet: Address;
    processedJettonTransfers: map<Int, Bool>;

    init(owner: Address, campaignId: Int, advertiser: Address, payout: Address, bot: Address, usdtMasterAddress: Address, usdtWalletBytecode: Cell) {
        
        require(sender() == owner, "owner must be deployer");

        self.owner = owner;  // parent contract
        self.payout = payout;
        self.stopped = false;
        self.campaignId = campaignId;
        self.advertiser = advertiser; 
        self.bot = bot;

        self.currAffiliateId = 0; 
        self.affiliates = emptyMap();

        self.campaignDetails = CampaignDetails {
            regularUsersCostPerAction: emptyMap(),
            premiumUsersCostPerAction: emptyMap(),
            allowedAffiliates: emptyMap(),
            isOpenCampaign: true,
            campaignValidForNumDays: null,
            paymentMethod: PAYMENT_METHOD_TON, // Default to TON
            requiresAdvertiserApprovalForWithdrawl: false
        };

        self.state = STATE_CAMPAIGN_CREATED;
        self.lastUserActionTimestamp = 0;
        self.campaignStartTimestamp = 0;
        self.numUserActions = 0;
        self.totalAffiliateEarnings = 0;
        self.maxCpaValue = ton("0");

        // top 3 affiliates in campaign
        self.topAffiliates = emptyMap();

        // USDT details
		self.contractUSDTBalance = 0;
		self.contractUsdtJettonWallet = calculateJettonWalletAddress(myAddress(), usdtMasterAddress, usdtWalletBytecode);

        // replay attack protection
        self.processedJettonTransfers = emptyMap();
    }

    // piggyback on this message for deployment
    receive(msg: ParentToChildDeployCampaign) {
                
         // notify parent that contract was successfully deployed
        send(SendParameters{
            to: self.owner,
            body: ChildToParentCampaignDeployedSuccessfully{
                campaignId: msg.campaignId,
                advertiser: msg.advertiser
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });
    }

    // Function to calculate campaign balance (supports TON and USDT)
    fun calcCampaignBalance(): Int {
        if (self.campaignDetails.paymentMethod == PAYMENT_METHOD_TON) {
            let campaignBalance: Int = myBalance() - CAMPAIGN_BUFFER - self.totalAffiliateEarnings;
            return max(campaignBalance, ton("0"));
        } else {
            return self.contractUSDTBalance - self.totalAffiliateEarnings;
        }
    }

    fun isCampaignExpired(): Bool {
        if (self.campaignDetails.campaignValidForNumDays == null) {
            return false;
        } else {
            return now() - self.campaignStartTimestamp > self.campaignDetails.campaignValidForNumDays!! * (24*60*60);
        }
    }

    fun campaignHasSufficientFundsToPayMaxCpa(): Bool {
        return self.calcCampaignBalance() > self.maxCpaValue;
    }

    fun transferJettonUSDT(to: Address, amount: Int) {  
	
		require(self.contractUSDTBalance >= amount, "Insufficient USDT funds to make transfer");
		
		// adjust amount to send back to 6 decimals
		let adjustedAmount = amount / 1000;
		
		// Create forward payload (optional comment)
        let forwardPayload = beginCell()
            .storeUint(0, 32) // 0 opcode means we have a comment
            .storeSlice("USDT from campaign".asSlice())
            .endCell();

        let forwardTonAmount = ton("0.01"); // TON for forwarding to contract
		let randomQueryId = random(0, 18446744073709551614);
        
        let jettonTransferPayload: Cell = beginCell()
            .storeUint(0xf8a7ea5, 32) // OP code for Jetton transfer
            .storeUint(randomQueryId, 64) // Query ID
            .storeCoins(adjustedAmount) // Amount of USDT to send
            .storeAddress(to) // Recipient address
            .storeAddress(myAddress()) // Response address for excess gas
            .storeBit(false) // No custom payload
            .storeCoins(forwardTonAmount) // Forwarded TON amount
            .storeBit(true) // Forward payload is stored as a reference
            .storeRef(forwardPayload)
            .endCell();

        send(SendParameters{
            to: self.contractUsdtJettonWallet,  // The Jetton wallet to send from
            value: ton("0.1"),  // This TON is for paying for gas fees of the transfer
            body: jettonTransferPayload,
            mode: SendPayGasSeparately | SendIgnoreErrors
        });
				
		// Deduct amount from the contract's USDT balance
        self.contractUSDTBalance = self.contractUSDTBalance - amount;
    }

    // receive any amount of incoming TON
    receive() {}

    receive(msg: TokenExcesses) {
        // do nothing - excess ton will be added to the contract's TON balance
    }

    // Function to track received USDT Jettons and update balance
    receive(msg: JettonTransferNotification) {
        
        require(sender() == self.contractUsdtJettonWallet, "Only contract wallet allowed to invoke");
        require(msg.sender == self.advertiser, "Only advertiser can send tokens to this contract");
        require(self.campaignDetails.paymentMethod == PAYMENT_METHOD_USDT, "Only USDT Campaigns can accept USDT");
        
        // replay
        require(self.processedJettonTransfers.get(msg.queryId) != null, "Cannot replay message");
        self.processedJettonTransfers.set(msg.queryId, true);

        // Update the USDT balance in the state.  Adjust to 9 decimals (since we received 6 decimals)
        self.contractUSDTBalance = self.contractUSDTBalance + (msg.amount * 1000);
    }

    // Function to handle affiliate withdrawals (supports both TON and USDT)
    receive(msg: AffiliateWithdrawEarnings) {

        self.requireNotStopped();

        require(context().value >= GAS_FEE*2, "Insufficient gas fees to withdraw earnings");
        
        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Affiliate does not exist");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        require(sender() == affiliateData.affiliate, "Only affiliate can withdraw funds");

        let withdrawalAmount = affiliateData.withdrawEarnings;
        require(withdrawalAmount > 0,"Must withdraw a positive amount");

        // update state
        affiliateData.withdrawEarnings = ton("0");
        self.affiliates.set(msg.affiliateId, affiliateData);

         // Update campaign’s total affiliate earnings
        self.totalAffiliateEarnings = self.totalAffiliateEarnings - withdrawalAmount;

        // Calculate the net amount after fees
        let fee: Int = (withdrawalAmount * self.feePercentage + 9999) / 10000;  // e.g., fee=200 = 2%
        let netAmount: Int = withdrawalAmount - fee;

        // Send the approved or full amount directly to the affiliate’s wallet
        if (self.campaignDetails.paymentMethod == PAYMENT_METHOD_TON) {

            // Transfer fee to payout address
            send(SendParameters{
                to: self.payout,
                value: fee,
                bounce: true,
                mode: SendPayGasSeparately | SendIgnoreErrors
            });

            send(SendParameters{
                to: affiliateData.affiliate,
                value: netAmount,
                bounce: true,
                body: PayAffiliate{affiliateId: msg.affiliateId, amount: netAmount}.toCell(),
                mode: SendPayGasSeparately | SendIgnoreErrors
            });
        } else {
            // For USDT Jetton, transfer both fee and withdrawal amount
            self.transferJettonUSDT(self.payout, fee);
            self.transferJettonUSDT(affiliateData.affiliate, netAmount);
        }
    }

    receive(msg: AdvertiserSignOffAllAffilliates) {

        require(sender() == self.advertiser, "Only advertiser can approve withdrawal");
        require(self.campaignDetails.requiresAdvertiserApprovalForWithdrawl, "Advertiser can sin off affiliate earnings only if campaign is setup this requiresApprovalForWithdrawlFlag");

        foreach(affiliateId, affiliateData in self.affiliates) {            
            affiliateData.withdrawEarnings += affiliateData.pendingApprovalEarnings;
            affiliateData.pendingApprovalEarnings = ton("0");  
            self.affiliates.set(affiliateId, affiliateData);
        }

        // send remaining value back to advertiser
		send(SendParameters{
            to: self.advertiser,
            value: 0,
            mode: SendRemainingValue 
        });

    }

    // at the end of the month the advertiser signs off all affiliates to withdraw their earnings
    receive(msg: AdvertiserSignOffWithdraw) {

        require(sender() == self.advertiser, "Only advertiser can approve withdrawal");
        require(self.campaignDetails.requiresAdvertiserApprovalForWithdrawl, "Advertiser can only modify affiliate earnings only if campaign is setup this requiresApprovalForWithdrawlFlag");
        
        foreach(affiliateId, amountToWithdraw in msg.setAffiliatesWithdrawEarnings) {
		
			let affiliateDataOptional = self.affiliates.get(affiliateId);
			require(affiliateDataOptional != null, "Affiliate does not exist");
            let affiliateData: AffiliateData = affiliateDataOptional!!;
            
            require(amountToWithdraw <= affiliateData.pendingApprovalEarnings, "withdrawableAmount must be <= pendingApprovalEarnings");
            
            // update diff (diff can be zero)
            let diff: Int = affiliateData.pendingApprovalEarnings - amountToWithdraw;
            affiliateData.totalEarnings -= diff; // update affiliate's earnings
            self.totalAffiliateEarnings -= diff; // return diff to campaign
            
            affiliateData.withdrawEarnings += amountToWithdraw;
            affiliateData.pendingApprovalEarnings = ton("0");  // finally set pendingApprovalEarnings as zero
            self.affiliates.set(affiliateId, affiliateData);
        }
		
		// send remaining value back to advertiser
		send(SendParameters{
            to: self.advertiser,
            value: 0,
            mode: SendRemainingValue 
        });
    }

    receive(msg: ParentToChildUpdateFeePercentage) {
        self.requireOwner();
        self.feePercentage = msg.feePercentage;
    }

    receive(msg: ParentToChildSeizeCampaign) {
        
        self.requireOwner();

        // Check for TON or USDT based on the payment method
		if (self.contractUSDTBalance > 0) {
			self.transferJettonUSDT(self.payout, self.contractUSDTBalance);
		}
		
		send(SendParameters{
            to: self.payout,
            value: 0,
            mode: SendRemainingBalance
        });
    }

    fun updateMaxCpaValue(val: Int) {
        self.maxCpaValue = max(self.maxCpaValue, val);
    }

    fun validateUserActionOpCodeValue(val: Int, campaignDetails: CampaignDetails) {
        if (campaignDetails.paymentMethod == PAYMENT_METHOD_TON) {
            require(val >= ton("0.02"), "Value of user action has to be a minimum of 0.02 TON");
        } else {
            require(val >= ton("0.1"), "Value of user action has to be a minimum of 0.1 USDT");
        }
    }

    // advetiser sets campaign details 
    receive (msg: AdvertiserSetCampaignDetails) {

        require(sender() == self.advertiser, "Only advertiser can set campaign details");
        require((self.state == STATE_CAMPAIGN_CREATED) || (self.currAffiliateId == 0), "Must be in state: STATE_CAMPAIGN_CREATED or have zero affiliates");
        require(msg.campaignDetails.paymentMethod == PAYMENT_METHOD_TON || msg.campaignDetails.paymentMethod == PAYMENT_METHOD_USDT, "Only TON or USDT supported as payment methods");
        		
        // verify keys are the same in both sets
        // get maxCpaValue
        let maxCpaValue: Int = ton("0");
        foreach (key, val in msg.campaignDetails.regularUsersCostPerAction) {
            self.validateUserActionOpCodeValue(val, msg.campaignDetails);
            self.updateMaxCpaValue(val);
        }

        foreach (key, val in msg.campaignDetails.premiumUsersCostPerAction) {
            self.validateUserActionOpCodeValue(val, msg.campaignDetails);
            self.updateMaxCpaValue(val);
        }

        self.campaignDetails = msg.campaignDetails;
        self.campaignStartTimestamp = now();
        self.state = STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER;

        // return deploy costs to parent
        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserSignedCampaignDetails{
                campaignId: self.campaignId,
                advertiser: self.advertiser
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });
    }

    // Function to handle advertiser replenishment
    receive(msg: AdvertiserReplenish) {
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
        require(sender() == self.advertiser, "Only the advertiser can replenish the contract");
    }

    receive(msg: AffiliateCreateNewAffiliate) {

        require(self.isCampaignActive(), "Campaign is not active");
		require(context().value >= GAS_FEE*2, "Insufficient gas fees to create affiliate");

        let numAffiliates = self.currAffiliateId;
        require(numAffiliates <= MAX_NUM_AFFILIATES, "Reached max number of affiliates for this campaign");

        if (!self.campaignDetails.isOpenCampaign) {
            require(self.campaignDetails.allowedAffiliates.get(sender()) != null, "affiliate not on allowed list");
            require(self.campaignDetails.allowedAffiliates.get(sender())!! == true, "affiliate not approved yet");
        }

        let affiliateId = self.currAffiliateId;
        self.currAffiliateId = self.currAffiliateId + 1;

        self.affiliates.set(affiliateId, AffiliateData{
            affiliate: sender(), 
            userActionsStats: emptyMap(), 
            premiumUserActionsStats: emptyMap(), 
            pendingApprovalEarnings: ton("0"),
            totalEarnings: ton("0"),
			withdrawEarnings: ton("0")
        });

        // notify parent
        send(SendParameters{
            to: self.owner,
            body: ChildToParentAffiliateCreated{
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                affiliateId: affiliateId,
                affiliate: sender()
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately 
        });
    }

    fun setAffiliateAllowedListStatus(affiliate: Address, isAllowed: Bool?) {

        require(self.isCampaignActive(), "Campaign is not active");

        // Check if the campaign is not open (closed campaign)
        require(!self.campaignDetails.isOpenCampaign, "Cannot manually add affiliates to an open campaign");

        // verify isAllowed is always a different value
        require(self.campaignDetails.allowedAffiliates.get(affiliate) != isAllowed, "Invalid value for isAllowed");

        // Add the new affiliate to the allowed affiliates list
        self.campaignDetails.allowedAffiliates.set(affiliate, isAllowed);
    }


    receive(msg: AdvertiserAddNewAffiliateToAllowedList) {
        
        // Ensure only the advertiser can invoke this function
        require(sender() == self.advertiser, "Only the advertiser can add a new affiliate");
        self.setAffiliateAllowedListStatus(msg.affiliate, true);
		
		//emit event so parent will notify affiliate
        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserModifiedAllowedList {
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                affiliate: msg.affiliate,
				allowedListStatus: true
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately 
        });
    }

    receive(msg: AdvertiserRemoveExistingAffiliateFromAllowedList) {
        
        // Ensure only the advertiser can invoke this function
        require(sender() == self.advertiser, "Only the advertiser can remove an existing affiliate");
        self.setAffiliateAllowedListStatus(msg.affiliate, null);
		
		//emit event so parent will notify affiliate
        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserModifiedAllowedList {
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                affiliate: msg.affiliate,
				allowedListStatus: null
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately 
        });
    }

    receive(msg: AffiliateAskToJoinAllowedList) {
        
        require(context().value >= GAS_FEE, "Insufficient funds!");
        self.setAffiliateAllowedListStatus(sender(), false);

        //emit event so parent will notify advertiser
        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserModifiedAllowedList {
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                affiliate: sender(),
				allowedListStatus: false
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately 
        });
    }

    receive(msg: AdvertiserWithdrawFunds) {

        self.requireNotStopped();
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, "Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER");
        require(sender() == self.advertiser, "Only the advertiser can remove the campaign and withdraw all funds");

        let campaignBalance: Int = self.calcCampaignBalance();
        require(campaignBalance >= msg.amount, "Campaign has no funds");

        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserWithdrawFunds {
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                amount: msg.amount
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately | SendIgnoreErrors
        });

        // Check for TON or USDT based on the payment method
        if (self.campaignDetails.paymentMethod == PAYMENT_METHOD_TON) { 
            send(SendParameters{
                to: self.advertiser,
                value: msg.amount,
                mode: SendPayGasSeparately
            });
        } else {
            self.transferJettonUSDT(self.advertiser, msg.amount);
        }
    }

    receive(msg: BotUserAction) {

        require(sender() == self.bot, "Only bot can invoke this function");
        require(msg.userActionOpCode <= USER_ACTION_OP_CODES_BOT, "Bot can verify only op codes under 2000");
        require(myBalance() >= context().value + GAS_FEE, "Insufficient contract funds to repay bot");

        self.applyUserAction(msg.userActionOpCode, msg.affiliateId, msg.isPremiumUser);

        // return gas fees to bot
        send(SendParameters{
            to: self.bot,
            value: context().value,  // return gas fee paid by the bot
            mode: SendPayGasSeparately
        });
    }

    receive(msg: AdvertiserAddNewUserOpCode) {

        require(sender() == self.advertiser, "Only advertiser can add user op codes");
        require(self.isCampaignActive(), "Campaign is not active");

        let newUserOpCode: Int = msg.userOpCode;
        let isPremiumUserOpCode: Bool = msg.isPremiumUserOpCode;
        let cpa: Int = msg.costPerAction;

        if (isPremiumUserOpCode) {
            require(self.campaignDetails.premiumUsersCostPerAction.get(newUserOpCode) != null, "Can only add op codes");
            self.validateUserActionOpCodeValue(cpa, self.campaignDetails);
            self.updateMaxCpaValue(cpa);
            self.campaignDetails.premiumUsersCostPerAction.set(newUserOpCode, cpa);
        } else {
            require(self.campaignDetails.regularUsersCostPerAction.get(newUserOpCode) != null, "Can only add op codes");
            self.validateUserActionOpCodeValue(cpa, self.campaignDetails);
            self.updateMaxCpaValue(cpa);
            self.campaignDetails.regularUsersCostPerAction.set(newUserOpCode, cpa);
        }
    }

    receive(msg: AdvertiserUserAction) {
        
        require(sender() == self.advertiser, "Only advertiser can verify these events");
        require(msg.userActionOpCode > USER_ACTION_OP_CODES_BOT, "Advertiser can verify only op codes over 2000");

        self.applyUserAction(msg.userActionOpCode, msg.affiliateId, msg.isPremiumUser);
    }

    fun updateUserStat(userActionStatsOptional: UserActionStats?, currTime: Int): UserActionStats {

        let result = UserActionStats{lastUserActionTimestamp: 0, numActions: 0};
        if (userActionStatsOptional != null) {
            result = userActionStatsOptional!!;
        }
        result.numActions += 1;
        result.lastUserActionTimestamp = currTime; 
        return result;
    }

    fun applyUserAction(userActionOpCode: Int, affiliateId: Int, isPremiumUser: Bool) {

        require(self.isCampaignActive(), "Campaign is not active");

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
		        
        // process user action - no need to check optional because we set it when advertiser setup the campaign
        let currTime: Int = now();
        if (isPremiumUser) {
            let userActionStatsOptional: UserActionStats? = affiliateData.premiumUserActionsStats.get(userActionOpCode);
            let userActionStats = self.updateUserStat(userActionStatsOptional, currTime);
            affiliateData.premiumUserActionsStats.set(userActionOpCode, userActionStats);
        } else {
            let userActionStatsOptional: UserActionStats? = affiliateData.userActionsStats.get(userActionOpCode);
            let userActionStats = self.updateUserStat(userActionStatsOptional, currTime);
            affiliateData.userActionsStats.set(userActionOpCode, userActionStats);
        }

        // Accumulate the earnings for the affiliate
        if (self.campaignDetails.requiresAdvertiserApprovalForWithdrawl) {
            affiliateData.pendingApprovalEarnings += costPerAction;
        } else {
            affiliateData.withdrawEarnings += costPerAction;
        }

        affiliateData.totalEarnings += costPerAction;
        self.affiliates.set(affiliateId, affiliateData);  // update affiliate data

        // update campaign state
        self.lastUserActionTimestamp = currTime;
        self.numUserActions += 1;
        self.totalAffiliateEarnings += costPerAction;
		self.updateTopAffiliates(affiliateId, affiliateData.totalEarnings);
    }

    // Function to update the "Top 3 Affiliates" dynamically
    fun updateTopAffiliates(affiliateId: Int, earnings: Int) {

        // If the affiliate is already in the top 3, update their earnings
        if (self.topAffiliates.get(affiliateId) != null) {
            self.topAffiliates.set(affiliateId, earnings);
            return;
        }

        // Find the lowest earner in the current top 3 and count the number of affiliates in the list
        let minEarnings: Int? = null;
        let minId: Int = 0;
        let numAffiliates = 0;

        foreach (id, earning in self.topAffiliates) {
            numAffiliates += 1;
            if (minEarnings == null || earning < minEarnings!!) {
                minEarnings = earning;
                minId = id;
            }
        }

        // If there are fewer than 3 affiliates, simply add the new one
        if (numAffiliates < 3) {
            self.topAffiliates.set(affiliateId, earnings);
            return;
        }

        // If the new affiliate's earnings are higher than the current minimum, replace the lowest
        if (minEarnings != null && earnings > minEarnings!!) {
            self.topAffiliates.del(minId);
            self.topAffiliates.set(affiliateId, earnings);
        }
    }

    
    // Jetton notification did not arrive.  
    receive(msg: ParentToChildJettonNotificationMessageFailure) {
        self.requireOwner();
        self.contractUSDTBalance += msg.amount;
    } 

    // Function to withdraw any amount of USDT stuck in the contract for any reason
    receive(msg: ParentToChildWithdrawUSDTToPayout) {
        self.requireOwner();
        self.transferJettonUSDT(self.payout, msg.amount);		
    } 

    // if payment bounces - adjust the affiliate's pendingApprovalEarnings and totalAffiliateEarnings accordingly
    fun bouncedPayment(affiliateId: Int, amount: Int) {
        
        let affiliateDataOptional = self.affiliates.get(affiliateId);
		require(affiliateDataOptional != null, "Affiliate does not exist for this id");
		
		let affiliateData: AffiliateData = affiliateDataOptional!!;
		affiliateData.withdrawEarnings += amount;
		self.affiliates.set(affiliateId, affiliateData);

		self.totalAffiliateEarnings += amount;
    }

    // bounced USDT - amount in 9 decials already!
    receive(msg: ParentToChildPayAffiliateUSDTBounced) {     
        self.requireOwner();
        self.bouncedPayment(msg.affiliateId, msg.amount);
        self.contractUSDTBalance = self.contractUSDTBalance + msg.amount;
    }

    // bounced TON
    bounced(msg: PayAffiliate) {
        self.bouncedPayment(msg.affiliateId, msg.amount);
    }

    fun isCampaignActive(): Bool {
        
        // Check if the campaign details are set
        if (self.state != STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER) {
            return false;
        }

        // Check if the contract is not stopped (paused by admin)
        if (self.stopped) {
            return false;
        }

        // Check if the campaign is not expired
        if (self.isCampaignExpired()) {
            return false;
        }

        // Check if the campaign has sufficient funds to pay the maximum CPA
        if (!self.campaignHasSufficientFundsToPayMaxCpa()) {
            return false;
        }
		
		// Check if there are sufficient TON funds for gas fees
        if (!self.campaignHasSufficientTonToPayGasFees()) {
            return false;
        }

        // If all checks pass, the campaign is active
        return true;
    }

    fun campaignHasSufficientTonToPayGasFees(): Bool {
        return (myBalance() >= CAMPAIGN_BUFFER);
    }


    get fun campaignData(): CampaignData {
        return CampaignData {
            campaignId: self.campaignId,
            advertiser: self.advertiser,
            owner: self.owner,
            payout: self.payout,
            campaignDetails: self.campaignDetails,
            numAffiliates: self.currAffiliateId,
            totalAffiliateEarnings: self.totalAffiliateEarnings,
            campaignStartTimestamp: self.campaignStartTimestamp,
            lastUserActionTimestamp: self.lastUserActionTimestamp,
            numUserActions: self.numUserActions,
            state: self.state,
            campaignBalance: self.calcCampaignBalance(),
            maxCpaValue: self.maxCpaValue,
            contractTonBalance: myBalance(),
            contractAddress: myAddress(),
            contractUSDTBalance: self.contractUSDTBalance,  // 9 decimals
            contractUsdtJettonWallet: self.contractUsdtJettonWallet,
            feePercentage: self.feePercentage,
            campaignHasSufficientFundsToPayMaxCpa: self.campaignHasSufficientFundsToPayMaxCpa(), 
            isCampaignExpired: self.isCampaignExpired(),
            isCampaignPausedByAdmin: self.stopped,
            campaignHasSufficientTonToPayGasFees: self.campaignHasSufficientTonToPayGasFees(),
            isCampaignActive: self.isCampaignActive(),
            topAffiliates: self.topAffiliates
        }
    }

    get fun affiliateData(affiliateId: Int): AffiliateData? {
        return self.affiliates.get(affiliateId);
    }

    get fun affiliatesData(): map<Int, AffiliateData> {
        return self.affiliates;
    }

    get fun affiliatesDataInRange(fromIdx: Int, toIdx: Int): map<Int, AffiliateData> {
        require(toIdx > fromIdx, "Invalid indices");
        let result: map<Int, AffiliateData> = emptyMap();
        let i: Int = 0;
        repeat (toIdx - fromIdx) {  
            if (self.affiliates.get(fromIdx + i) != null) {
                result.set(fromIdx + i, self.affiliates.get(fromIdx + i));
            }
            i = i + 1;
        }
        return result;
    }
	
	get fun balance(): Int {
        return myBalance(); // in nano-tons (like cents, just with 9 decimals)
    }

}


// owner Contract
contract AffiliateMarketplace with Deployable, Resumable  {

    // state
    owner: Address;
    stopped: Bool;
    bot: Address;

    numCampaigns: Int as uint32; 
	usdtMasterAddress: Address;
    usdtWalletBytecode: Cell;
	
    // Constructor
    init(bot: Address, usdtMasterAddress: Address, usdtWalletBytecode: Cell) {
        self.owner = sender();
        self.stopped = false;
        self.bot = bot;
        self.usdtMasterAddress = usdtMasterAddress;
        self.usdtWalletBytecode = usdtWalletBytecode;
        self.numCampaigns = 0; 
    }

    get fun balance(): Int {
        return myBalance(); // in nano-tons (like cents, just with 9 decimals)
    }

    get fun bot(): Address {
        return self.bot; 
    }

    get fun numCampaigns(): Int {
        return self.numCampaigns; 
    }

    get fun campaignContractAddress(campaignId: Int, advertiser: Address): Address {
        return contractAddress(self.campaignContractStateInit(campaignId, advertiser));
    }

    fun campaignContractStateInit(campaignId: Int, advertiser: Address): StateInit {
        let initCode: StateInit = initOf Campaign(myAddress(), campaignId, advertiser, self.owner, self.bot, self.usdtMasterAddress, self.usdtWalletBytecode);
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

        let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: ParentToChildUpdateFeePercentage{
                feePercentage: msg.feePercentage
            }.toCell(),
            value: 0,
            mode: SendRemainingValue
        });
    }

    receive(msg: AdminStopCampaign) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: "Stop".asComment(), 
            value: 0,
            mode: SendRemainingValue
        });
    }

    receive(msg: AdminResumeCampaign) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: "Resume".asComment(), 
            value: 0,
            mode: SendRemainingValue
        });
    }

    receive(msg: AdminSeizeCampaignBalance) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: ParentToChildSeizeCampaign{}.toCell(), 
            value: 0,
            mode: SendRemainingValue
        });
    }

    receive(msg: AdminPayAffiliateUSDTBounced) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: ParentToChildPayAffiliateUSDTBounced{
                affiliateId: msg.affiliateId,
                amount: msg.amount
            }.toCell(),
            value: 0,
            mode: SendRemainingValue
        });
    }

    receive(msg: AdminJettonNotificationMessageFailure) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: ParentToChildJettonNotificationMessageFailure{
                amount: msg.amount
            }.toCell(),
            value: 0,
            mode: SendRemainingValue
        });
    }

    receive(msg: AdminWithdrawUSDTToPayout) {

        self.requireOwner();

        let init: StateInit = self.campaignContractStateInit(msg.campaignId, msg.advertiser);
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            body: ParentToChildWithdrawUSDTToPayout{
                amount: msg.amount
            }.toCell(),
            value: 0,
            mode: SendRemainingValue
        });
    }
	
	receive(msg: ChildToParentAdvertiserModifiedAllowedList) {
		
		let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");

        if (msg.allowedListStatus == null) {
            emit(AdvertiserRemovedAffiliateFromAllowedListEvent{
                campaignId: msg.campaignId,
                advertiser: msg.advertiser,
                affiliate: msg.affiliate}.toCell());

        } else if (msg.allowedListStatus!! == false) {
            emit(AffiliateAskToJoinAllowedListEvent{
                campaignId: msg.campaignId,
                advertiser: msg.advertiser,
                affiliate: msg.affiliate}.toCell());
        } else {
            emit(AdvertiserApprovedAffiliateToAllowedListEvent{
                campaignId: msg.campaignId,
                advertiser: msg.advertiser,
                affiliate: msg.affiliate}.toCell());
        }
	}
	
    receive(msg: ChildToParentAdvertiserWithdrawFunds) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");

        emit(AdvertiserWithdrawFundsEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            amount: msg.amount}.toCell());

    }

    receive(msg: ChildToParentAdvertiserSignedCampaignDetails) {
        
        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");

        emit(AdvertiserSignedCampaignDetailsEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser
        }.toCell());
    }

    receive(msg: ChildToParentAffiliateCreated) {

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
    receive(msg: AdvertiserDeployNewCampaign) {
        
		self.requireNotStopped();
        require(context().value > DEPLOY_NEW_CONTRACT_COST + GAS_FEE, "Insufficient funds to deploy new campaign");

        let campaignId: Int = random(0, 4294967294); // Generate a new random number, which is an unsigned 32-bit integer
        self.numCampaigns = self.numCampaigns + 1;

        let init: StateInit = self.campaignContractStateInit(campaignId, sender());
        let campaignContractAddress: Address = contractAddress(init);

        // deploy contract
        send(SendParameters{
            to: campaignContractAddress,
            value: DEPLOY_NEW_CONTRACT_COST,
            code: init.code,
            data: init.data,
            body: ParentToChildDeployCampaign{campaignId: campaignId, advertiser: sender()}.toCell(),
            mode: SendPayGasSeparately
        });
    }

    receive(msg: ChildToParentCampaignDeployedSuccessfully) {

        let expectedAddress: Address = contractAddress(self.campaignContractStateInit(msg.campaignId, msg.advertiser));
        require(sender() == expectedAddress, "Access denied");

        emit(CampaignCreatedEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            campaignContractAddress: expectedAddress
        }.toCell());
    }

    // receive any amount of incoming TON
    receive() {}

    // receive("Resume") is added automatically to allow owner to resume the contract
    // receive("Stop") is added automatically to allow owner to stop the contract
    // get fun stopped(): Bool is added automatically to query if contract is stopped
    // get fun owner(): Address is added automatically to query who the owner is
}