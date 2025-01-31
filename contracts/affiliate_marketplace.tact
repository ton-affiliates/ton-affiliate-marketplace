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
const FIXED_FEE_CREATE_AFFILIATE: Int = ton("0.04");

const USER_ACTION_OP_CODES_BOT: Int = 20000;  // first 20 thousand op codes for bot

// Payment method options
const PAYMENT_METHOD_TON: Int = 0;
const PAYMENT_METHOD_USDT: Int = 1;

// affiliate status
const STATE_AFFILIATE_PENDING_APPROVAL: Int = 0;
const STATE_AFFILIATE_ACTIVE: Int = 1;

struct CampaignDetails {
    regularUsersCostPerAction: map<Int, Int>; // op code -> cpa
    premiumUsersCostPerAction: map<Int, Int>; // op code -> cpa
    isPublicCampaign: Bool;
    campaignValidForNumDays: Int? as uint32; 
    paymentMethod: Int as uint32; 
    requiresAdvertiserApprovalForWithdrawl: Bool; 
}

struct UserActionStats {
    numActions: Int as uint32;
    lastUserActionTimestamp: Int as uint32;
}

struct AffiliateData {
    affiliate: Address;
    state: Int as uint8;
    userActionsStats: map<Int, UserActionStats>;
    premiumUserActionsStats: map<Int, UserActionStats>;
    pendingApprovalEarnings: Int as coins;
    totalEarnings: Int as coins;
    withdrawEarnings: Int as coins; 
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
    numAdvertiserWithdrawls: Int as uint32;
    numAdvertiserSignOffs: Int as uint32;
    numAdvertiserReplenishCampaign: Int as uint32;
    numAdvertiserReplenishGasFees: Int as uint32;
    numUserActions: Int as uint32;
    campaignBalance: Int as coins;
    maxCpaValue: Int as coins;
    contractTonBalance: Int as coins;  
    contractAddress: Address;
    contractUSDTBalance: Int as coins;
    contractUsdtWallet: Address;
    advertiserFeePercentage: Int as uint32;
    affiliateFeePercentage: Int as uint32;
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

fun calculateUSDTWalletAddress(
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
    numAdvertiserWithdrawls: Int as uint32;
    numAdvertiserSignOffs: Int as uint32;
    numAdvertiserReplenishCampaign: Int as uint32;
    numAdvertiserReplenishGasFees: Int as uint32;
    numUserActions: Int as uint32;
    totalAffiliateEarnings: Int as coins;
    maxCpaValue: Int as coins;
    affiliateFeePercentage: Int as uint32;
    advertiserFeePercentage: Int as uint32;

    topAffiliates: map<Int, Int>; // Affiliate ID -> Earnings

    contractUSDTBalance: Int as coins;
    contractUsdtWallet: Address;

    init(owner: Address, campaignId: Int, advertiser: Address, payout: Address, 
         bot: Address, usdtMasterAddress: Address, usdtWalletBytecode: Cell,
         advertiserFeePercentage: Int, affiliateFeePercentage: Int) {
        
        require(sender() == owner, "Deployment failed: Only the contract owner can deploy a new campaign.");
        require(advertiserFeePercentage <= 10000, "Fee cannot exceed 100%");
        require(affiliateFeePercentage <= 10000,  "Fee cannot exceed 100%");

        self.owner = owner;  // parent contract
        self.payout = payout;
        self.stopped = false;
        self.campaignId = campaignId;
        self.advertiser = advertiser; 
        self.bot = bot;
        self.advertiserFeePercentage = advertiserFeePercentage;
        self.affiliateFeePercentage = affiliateFeePercentage;

        self.currAffiliateId = 0; 
        self.affiliates = emptyMap();

        self.campaignDetails = CampaignDetails {
            regularUsersCostPerAction: emptyMap(),
            premiumUsersCostPerAction: emptyMap(),
            isPublicCampaign: true,
            campaignValidForNumDays: null,
            paymentMethod: PAYMENT_METHOD_TON,
            requiresAdvertiserApprovalForWithdrawl: false
        };

        self.state = STATE_CAMPAIGN_CREATED;
        self.lastUserActionTimestamp = 0;
        self.campaignStartTimestamp = 0;
        self.numAdvertiserWithdrawls = 0;
        self.numAdvertiserSignOffs = 0;
        self.numAdvertiserReplenishCampaign = 0;
        self.numAdvertiserReplenishGasFees = 0;
        self.numUserActions = 0;
        self.totalAffiliateEarnings = 0;
        self.maxCpaValue = ton("0");

        self.topAffiliates = emptyMap();

        self.contractUSDTBalance = 0;
        self.contractUsdtWallet = calculateUSDTWalletAddress(myAddress(), usdtMasterAddress, usdtWalletBytecode);
    }

    receive(msg: ParentToChildDeployCampaign) {
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
            return now() - self.campaignStartTimestamp >
                self.campaignDetails.campaignValidForNumDays!! * (24*60*60);
        }
    }

    fun campaignHasSufficientFundsToPayMaxCpa(): Bool {
        return self.calcCampaignBalance() > self.maxCpaValue;
    }

    fun transferJettonUSDT(to: Address, amount: Int) {  
        require(self.contractUSDTBalance >= amount, "Transfer USDT failed: insufficient USDT in this campaign.");

        let adjustedAmount = amount / 1000;

        let forwardPayload = beginCell()
            .storeUint(0, 32)
            .storeSlice("USDT from campaign".asSlice())
            .endCell();

        let forwardTonAmount = ton("0.01");
        let randomQueryId = random(0, 18446744073709551614);

        let jettonTransferPayload: Cell = beginCell()
            .storeUint(0xf8a7ea5, 32)
            .storeUint(randomQueryId, 64)
            .storeCoins(adjustedAmount)
            .storeAddress(to)
            .storeAddress(myAddress())
            .storeBit(false)
            .storeCoins(forwardTonAmount)
            .storeBit(true)
            .storeRef(forwardPayload)
            .endCell();

        send(SendParameters{
            to: self.contractUsdtWallet,
            value: GAS_FEE*3,
            body: jettonTransferPayload,
            mode: SendPayGasSeparately | SendIgnoreErrors
        });

        self.contractUSDTBalance -= amount;
    }

    receive(msg: TokenExcesses) {
        require(sender() == self.contractUsdtWallet, "Excess TON rejected: only the contract's USDT wallet can send this message.");
        require(self.campaignDetails.paymentMethod == PAYMENT_METHOD_USDT, "Excess TON only makes sense for a USDT-based campaign.");
    }

    receive(msg: JettonTransferNotification) {
        require(sender() == self.contractUsdtWallet, "Jetton notification rejected: must come from the campaign's USDT wallet.");
        require(msg.sender == self.advertiser, "Jetton deposit failed: only the advertiser can fund this USDT-based campaign.");
        require(self.campaignDetails.paymentMethod == PAYMENT_METHOD_USDT, "Jetton deposit failed: this campaign is not set to USDT.");
        
        self.numAdvertiserReplenishCampaign += 1;

        let depositAmount = (msg.amount * 1000);
        let fee: Int = (depositAmount * self.advertiserFeePercentage + 9999) / 10000;
        let netAmount: Int = depositAmount - fee;

        if (fee > ton("0")) {
            self.transferJettonUSDT(self.payout, fee);
        }
        self.contractUSDTBalance += netAmount;
    }

    receive(msg: AffiliateWithdrawEarnings) {
        self.requireNotStopped();
        require(context().value >= GAS_FEE*2, "Withdrawal failed: not enough TON attached for gas fees.");
        
        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Withdrawal failed: specified affiliate does not exist.");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        require(sender() == affiliateData.affiliate, "Withdrawal failed: only the affiliate can withdraw their earnings.");
        require(affiliateData.withdrawEarnings > 0, "Withdrawal failed: no positive earnings to withdraw.");

        let withdrawalAmount = affiliateData.withdrawEarnings;
        affiliateData.withdrawEarnings = ton("0");
        self.affiliates.set(msg.affiliateId, affiliateData);

        self.totalAffiliateEarnings -= withdrawalAmount;

        let fee: Int = (withdrawalAmount * self.affiliateFeePercentage + 9999) / 10000;
        let netAmount: Int = withdrawalAmount - fee;

        if (self.campaignDetails.paymentMethod == PAYMENT_METHOD_TON) {
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
            self.transferJettonUSDT(self.payout, fee);
            self.transferJettonUSDT(affiliateData.affiliate, netAmount);
        }
    }

    receive(msg: AdvertiserSignOffWithdraw) {
        self.requireNotStopped();
        require(self.isCampaignActive(), "Advertiser sign-off failed: campaign is not active.");
        require(self.campaignDetails.requiresAdvertiserApprovalForWithdrawl, 
            "Sign-off unavailable: advertiser approval is not required for this campaign's affiliate earnings.");

        foreach(affiliateId, affiliateData in self.affiliates) {
            let amountToWithdrawOptional = msg.setAffiliatesWithdrawEarnings.get(affiliateId); 
            if (amountToWithdrawOptional != null) {
                let amountToWithdraw = amountToWithdrawOptional!!;
                require(amountToWithdraw <= affiliateData.pendingApprovalEarnings, 
                    "Sign-off mismatch: requested sign-off is greater than the pending approval earnings.");
                
                let diff: Int = (affiliateData.pendingApprovalEarnings - amountToWithdraw);
                affiliateData.pendingApprovalEarnings -= diff;
                affiliateData.totalEarnings -= diff;
                self.totalAffiliateEarnings -= diff;
            } 
            affiliateData.withdrawEarnings += affiliateData.pendingApprovalEarnings;
            affiliateData.pendingApprovalEarnings = ton("0");
            self.affiliates.set(affiliateId, affiliateData);
        }

        self.numAdvertiserSignOffs += 1;

        send(SendParameters{
            to: self.advertiser,
            value: 0,
            mode: SendRemainingValue 
        });
    }

    receive(msg: ParentToChildSeizeCampaign) {
        self.requireOwner();

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

    receive (msg: AdvertiserSetCampaignDetails) {
        require(sender() == self.advertiser, 
            "Setting campaign details failed: only the advertiser can set the details.");
        require(self.state == STATE_CAMPAIGN_CREATED, 
            "Campaign details failed: not in 'STATE_CAMPAIGN_CREATED' state.");
        require(msg.campaignDetails.paymentMethod == PAYMENT_METHOD_TON ||
                msg.campaignDetails.paymentMethod == PAYMENT_METHOD_USDT, 
            "Unsupported payment method: must be TON (0) or USDT (1).");
        require((msg.campaignDetails.campaignValidForNumDays == null) ||
                msg.campaignDetails.campaignValidForNumDays!! > 0, 
            "Invalid setting: 'campaignValidForNumDays' must be greater than 0 (or null).");

        let maxCpaValue: Int = ton("0");
        foreach (key, val in msg.campaignDetails.regularUsersCostPerAction) {
            self.updateMaxCpaValue(val);
        }
        foreach (key, val in msg.campaignDetails.premiumUsersCostPerAction) {
            self.updateMaxCpaValue(val);
        }

        self.campaignDetails = msg.campaignDetails;
        self.campaignStartTimestamp = now();
        self.state = STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER;

        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserSignedCampaignDetails{
                campaignId: self.campaignId,
                advertiser: self.advertiser
            }.toCell(),
            value: 0,
            mode: SendRemainingValue
        });
    }

    receive(msg: AdvertiserReplenish) {
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, 
            "Replenish failed: campaign must be in 'STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER'.");
        require(sender() == self.advertiser, 
            "Replenish failed: only the advertiser can fund the campaign with TON.");

        self.numAdvertiserReplenishCampaign += 1;

        let depositAmount = context().value;
        let fee: Int = (depositAmount * self.advertiserFeePercentage + 9999) / 10000;
        let netAmount: Int = depositAmount - fee;

        if (fee > ton("0")) {
            send(SendParameters{
                to: self.payout,
                value: fee,
                bounce: true,
                mode: SendPayGasSeparately | SendIgnoreErrors
            });
        }
    }

    receive(msg: AdvertiserReplenishGasFeesForUSDTCampaign) {
        require(sender() == self.advertiser, 
            "Gas-fee replenish failed: only advertiser can add TON for gas fees.");
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, 
            "Gas-fee replenish failed: campaign must be in 'STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER'.");
        require(self.campaignDetails.paymentMethod == PAYMENT_METHOD_USDT, 
            "Gas-fee replenish mismatch: this is not a USDT campaign.");
    
        self.numAdvertiserReplenishGasFees += 1;
    }

    receive(msg: AffiliateCreateNewAffiliate) {
        require(self.isCampaignActive(), 
            "Affiliate creation failed: campaign is not currently active.");
        require(context().value >= FIXED_FEE_CREATE_AFFILIATE, 
            "Affiliate creation failed: not enough TON attached to cover fees.");

        let numAffiliates = self.currAffiliateId;
        require(numAffiliates < MAX_NUM_AFFILIATES, 
            "Creation failed: maximum number of affiliates for this campaign has been reached.");

        let affiliateId = self.currAffiliateId;
        self.currAffiliateId += 1;

        let affiliateInitialState: Int = self.campaignDetails.isPublicCampaign 
            ? STATE_AFFILIATE_ACTIVE 
            : STATE_AFFILIATE_PENDING_APPROVAL;

        self.affiliates.set(affiliateId, AffiliateData{
            affiliate: sender(),
            state: affiliateInitialState,
            userActionsStats: emptyMap(),
            premiumUserActionsStats: emptyMap(),
            pendingApprovalEarnings: ton("0"),
            totalEarnings: ton("0"),
            withdrawEarnings: ton("0")
        });

        send(SendParameters{
            to: self.owner,
            body: ChildToParentAffiliateCreated{
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                affiliateId: affiliateId,
                affiliate: sender(),
                state: affiliateInitialState
            }.toCell(),
            value: 0,
            mode: SendRemainingValue,
        });
    }

    receive(msg: AdvertiserApproveAffiliate) {
        require(sender() == self.advertiser, 
            "Approval failed: only the advertiser can approve an affiliate.");
        require(!self.campaignDetails.isPublicCampaign, 
            "Approval not needed: this campaign is public (affiliates are automatically active).");

        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Approval failed: affiliate ID does not exist.");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        require(affiliateData.state == STATE_AFFILIATE_PENDING_APPROVAL, 
            "Approval failed: affiliate is already active.");

        affiliateData.state = STATE_AFFILIATE_ACTIVE;
        self.affiliates.set(msg.affiliateId, affiliateData);

        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserApprovedAffiliate {
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                affiliateId: msg.affiliateId,
                affiliate: affiliateData.affiliate
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately 
        });
    }

    receive(msg: AdvertiserRemoveAffiliate) {
        require(sender() == self.advertiser, 
            "Removal failed: only the advertiser can remove an existing affiliate.");

        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Removal failed: affiliate does not exist.");

        let affiliateData: AffiliateData = affiliateDataOptional!!;
        self.affiliates.del(msg.affiliateId);

        send(SendParameters{
            to: self.owner,
            body: ChildToParentAdvertiserRemovedAffiliate {
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                affiliateId: msg.affiliateId,
                affiliate: affiliateData.affiliate
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately 
        });
    }

    receive(msg: AdvertiserWithdrawFunds) {
        self.requireNotStopped();
        require(self.state == STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER, 
            "Withdrawal failed: campaign must be in 'STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER' state.");
        require(sender() == self.advertiser, 
            "Withdrawal failed: only the advertiser can withdraw funds from the campaign.");

        let campaignBalance: Int = self.calcCampaignBalance();
        require(campaignBalance >= msg.amount, 
            "Withdrawal failed: insufficient campaign funds to cover the requested amount.");

        self.numAdvertiserWithdrawls += 1;

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
        require(sender() == self.bot, "User action failed: only the authorized bot can call this function.");
        require(msg.userActionOpCode <= USER_ACTION_OP_CODES_BOT, 
            "User action mismatch: the bot can only verify op codes below 20000.");
        require(myBalance() >= context().value + GAS_FEE, 
            "User action failed: insufficient contract balance to reimburse bot.");

        self.applyUserAction(msg.userActionOpCode, msg.affiliateId, msg.isPremiumUser);

        send(SendParameters{
            to: self.bot,
            value: context().value,
            mode: SendPayGasSeparately
        });
    }

    // receive(msg: AdvertiserAddNewUserOpCode) {
    //     require(sender() == self.advertiser, "Adding user op code failed: only advertiser can do this.");
    //     require(self.isCampaignActive(), "Cannot add user op code: campaign is inactive.");

    //     let newUserOpCode: Int = msg.userOpCode;
    //     let isPremiumUserOpCode: Bool = msg.isPremiumUserOpCode;
    //     let cpa: Int = msg.costPerAction;

    //     if (isPremiumUserOpCode) {
    //         require(self.campaignDetails.premiumUsersCostPerAction.get(newUserOpCode) != null, 
    //             "Add op code failed: code not recognized in premium user dictionary.");
    //         self.updateMaxCpaValue(cpa);
    //         self.campaignDetails.premiumUsersCostPerAction.set(newUserOpCode, cpa);
    //     } else {
    //         require(self.campaignDetails.regularUsersCostPerAction.get(newUserOpCode) != null, 
    //             "Add op code failed: code not recognized in regular user dictionary.");
    //         self.updateMaxCpaValue(cpa);
    //         self.campaignDetails.regularUsersCostPerAction.set(newUserOpCode, cpa);
    //     }
    // }

    receive(msg: AdvertiserUserAction) {
        require(sender() == self.advertiser, 
            "User action failed: only the advertiser can verify these particular op codes.");
        require(msg.userActionOpCode > USER_ACTION_OP_CODES_BOT, 
            "User action mismatch: advertiser can only verify op codes over 20000.");

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
        require(self.isCampaignActive(), 
            "User action failed: campaign is not active or is paused/expired.");

        let affiliateDataOptional = self.affiliates.get(affiliateId);
        require(affiliateDataOptional != null, "User action failed: affiliate does not exist for this ID.");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        require(affiliateData.state == STATE_AFFILIATE_ACTIVE, 
            "User action ignored: affiliate is not active or is pending approval.");

        let cpaOptional: Int? = null;
        if (isPremiumUser) {
            cpaOptional = self.campaignDetails.premiumUsersCostPerAction.get(userActionOpCode);
        } else {
            cpaOptional = self.campaignDetails.regularUsersCostPerAction.get(userActionOpCode);
        }

        require(cpaOptional != null, 
            "User action failed: no cost-per-action found for the provided op code.");

        let costPerAction: Int = cpaOptional!!;
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

        if (self.campaignDetails.requiresAdvertiserApprovalForWithdrawl) {
            affiliateData.pendingApprovalEarnings += costPerAction;
        } else {
            affiliateData.withdrawEarnings += costPerAction;
        }

        affiliateData.totalEarnings += costPerAction;
        self.affiliates.set(affiliateId, affiliateData);

        self.lastUserActionTimestamp = currTime;
        self.numUserActions += 1;
        self.totalAffiliateEarnings += costPerAction;
        self.updateTopAffiliates(affiliateId, affiliateData.totalEarnings);
    }

    fun updateTopAffiliates(affiliateId: Int, earnings: Int) {
        if (self.topAffiliates.get(affiliateId) != null) {
            self.topAffiliates.set(affiliateId, earnings);
            return;
        }

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

        if (numAffiliates < 3) {
            self.topAffiliates.set(affiliateId, earnings);
            return;
        }

        if (minEarnings != null && earnings > minEarnings!!) {
            self.topAffiliates.del(minId);
            self.topAffiliates.set(affiliateId, earnings);
        }
    }

    receive(msg: ParentToChildJettonNotificationMessageFailure) {
        self.requireOwner();
        self.contractUSDTBalance += msg.amount;
    }

    receive(msg: ParentToChildWithdrawUSDTToPayout) {
        self.requireOwner();
        self.transferJettonUSDT(self.payout, msg.amount);       
    }

    fun bouncedPayment(affiliateId: Int, amount: Int) {
        let affiliateDataOptional = self.affiliates.get(affiliateId);
        require(affiliateDataOptional != null, 
            "Bounced payment update failed: affiliate does not exist for this ID.");

        let affiliateData: AffiliateData = affiliateDataOptional!!;
        affiliateData.withdrawEarnings += amount;
        self.affiliates.set(affiliateId, affiliateData);

        self.totalAffiliateEarnings += amount;
    }

    receive(msg: ParentToChildPayAffiliateUSDTBounced) {
        self.requireOwner();
        self.bouncedPayment(msg.affiliateId, msg.amount);
        self.contractUSDTBalance += msg.amount;
    }

    bounced(msg: PayAffiliate) {
        self.bouncedPayment(msg.affiliateId, msg.amount);
    }

    fun isCampaignActive(): Bool {
        if (self.state != STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER) {
            return false;
        }
        if (self.stopped) {
            return false;
        }
        if (self.isCampaignExpired()) {
            return false;
        }
        if (!self.campaignHasSufficientFundsToPayMaxCpa()) {
            return false;
        }
        if (!self.campaignHasSufficientTonToPayGasFees()) {
            return false;
        }
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
            numAdvertiserWithdrawls: self.numAdvertiserWithdrawls,
            numUserActions: self.numUserActions,
            numAdvertiserSignOffs: self.numAdvertiserSignOffs,
            numAdvertiserReplenishCampaign: self.numAdvertiserReplenishCampaign,
            numAdvertiserReplenishGasFees: self.numAdvertiserReplenishGasFees,
            state: self.state,
            campaignBalance: self.calcCampaignBalance(),
            maxCpaValue: self.maxCpaValue,
            contractTonBalance: myBalance(),
            contractAddress: myAddress(),
            contractUSDTBalance: self.contractUSDTBalance,
            contractUsdtWallet: self.contractUsdtWallet,
            advertiserFeePercentage: self.advertiserFeePercentage,
            affiliateFeePercentage: self.affiliateFeePercentage,
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
        require(toIdx > fromIdx, "Range error: toIdx must be strictly greater than fromIdx.");

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
        return myBalance();
    }

}

// owner Contract
contract AffiliateMarketplace with Deployable, Resumable  {

    owner: Address;
    stopped: Bool;
    bot: Address;

    numCampaigns: Int as uint32; 
    usdtMasterAddress: Address;
    usdtWalletBytecode: Cell;
    affiliateFeePercentage: Int as uint32;
    advertiserFeePercentage: Int as uint32;
    
    init(bot: Address, usdtMasterAddress: Address, usdtWalletBytecode: Cell, 
         advertiserFeePercentage: Int, affiliateFeePercentage: Int) {
        self.owner = sender();
        self.stopped = false;
        self.bot = bot;
        self.usdtMasterAddress = usdtMasterAddress;
        self.usdtWalletBytecode = usdtWalletBytecode;
        self.advertiserFeePercentage = advertiserFeePercentage;
        self.affiliateFeePercentage = affiliateFeePercentage;
        self.numCampaigns = 0;
    }

    get fun balance(): Int {
        return myBalance();
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
        let initCode: StateInit = initOf Campaign(
            myAddress(), 
            campaignId, 
            advertiser, 
            self.owner, 
            self.bot, 
            self.usdtMasterAddress, 
            self.usdtWalletBytecode, 
            self.advertiserFeePercentage, 
            self.affiliateFeePercentage
        );
        return initCode;
    }

    receive(msg: AdminReplenish) {
        self.requireOwner();
    }

    receive(msg: AdminUpdateFeeBalance) {
        self.requireOwner();
        self.advertiserFeePercentage = msg.advertiserFeePercentage;
        self.affiliateFeePercentage = msg.affiliateFeePercentage;
    }

    receive(msg: AdminWithdraw) {
        self.requireOwner();

        let buffer: Int = ton("1");
        require(myBalance() >= msg.amount + buffer, 
            "AdminWithdraw failed: not enough contract TON to handle withdrawal plus buffer.");

        let numWallets: Int = 0;
        foreach(wallet, v in msg.wallets) {
            numWallets = numWallets + 1;
        }
        require(numWallets > 0, "AdminWithdraw failed: must specify at least one recipient wallet.");

        let fraction: Int = msg.amount;
        if (numWallets > 1) {
            fraction = fraction / numWallets;
        }

        foreach(wallet, v in msg.wallets) {
            send(SendParameters{
                to: wallet,
                bounce: true,
                value: fraction,
                mode: SendPayGasSeparately
            });
        }
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

    receive(msg: ChildToParentAdvertiserApprovedAffiliate) {
        let expectedAddress: Address = contractAddress(
            self.campaignContractStateInit(msg.campaignId, msg.advertiser)
        );
        require(sender() == expectedAddress, "Access denied: message does not come from the expected campaign contract.");

        emit(AdvertiserApprovedAffiliateListEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            affiliateId: msg.affiliateId,
            affiliate: msg.affiliate
        }.toCell());
    }

    receive(msg: ChildToParentAdvertiserRemovedAffiliate) {
        let expectedAddress: Address = contractAddress(
            self.campaignContractStateInit(msg.campaignId, msg.advertiser)
        );
        require(sender() == expectedAddress, "Removal event denied: must come from the correct campaign contract.");

        emit(AdvertiserRemovedAffiliateEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            affiliateId: msg.affiliateId,
            affiliate: msg.affiliate
        }.toCell());
    }

    receive(msg: ChildToParentAdvertiserWithdrawFunds) {
        let expectedAddress: Address = contractAddress(
            self.campaignContractStateInit(msg.campaignId, msg.advertiser)
        );
        require(sender() == expectedAddress, "Withdrawal event denied: must come from the correct campaign contract.");

        emit(AdvertiserWithdrawFundsEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            amount: msg.amount
        }.toCell());
    }

    receive(msg: ChildToParentAdvertiserSignedCampaignDetails) {
        let expectedAddress: Address = contractAddress(
            self.campaignContractStateInit(msg.campaignId, msg.advertiser)
        );
        require(sender() == expectedAddress, "Signature event denied: must come from the correct campaign contract.");

        emit(AdvertiserSignedCampaignDetailsEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser
        }.toCell());
    }

    receive(msg: ChildToParentAffiliateCreated) {
        let expectedAddress: Address = contractAddress(
            self.campaignContractStateInit(msg.campaignId, msg.advertiser)
        );
        require(sender() == expectedAddress, 
            "Affiliate creation event denied: message does not come from the matching campaign contract.");

        emit(AffiliateCreatedEvent{
            campaignId: msg.campaignId,
            affiliateId: msg.affiliateId,
            advertiser: msg.advertiser,
            affiliate: msg.affiliate,
            state: msg.state
        }.toCell());
    }

    receive(msg: AdvertiserDeployNewCampaign) {
        self.requireNotStopped();
        require(context().value > DEPLOY_NEW_CONTRACT_COST + GAS_FEE, 
            "Campaign deployment failed: insufficient TON attached (must exceed DEPLOY_NEW_CONTRACT_COST + GAS_FEE).");

        let campaignId: Int = random(0, 4294967294);
        self.numCampaigns += 1;

        let init: StateInit = self.campaignContractStateInit(campaignId, sender());
        let campaignContractAddress: Address = contractAddress(init);

        send(SendParameters{
            to: campaignContractAddress,
            value: DEPLOY_NEW_CONTRACT_COST,
            code: init.code,
            data: init.data,
            body: ParentToChildDeployCampaign{
                campaignId: campaignId,
                advertiser: sender()
            }.toCell(),
            mode: SendPayGasSeparately
        });
    }

    receive(msg: ChildToParentCampaignDeployedSuccessfully) {
        let expectedAddress: Address = contractAddress(
            self.campaignContractStateInit(msg.campaignId, msg.advertiser)
        );
        require(sender() == expectedAddress, "Deployment success event denied: must come from correct contract.");

        emit(CampaignCreatedEvent{
            campaignId: msg.campaignId,
            advertiser: msg.advertiser,
            campaignContractAddress: expectedAddress
        }.toCell());
    }

    receive() {}

}
