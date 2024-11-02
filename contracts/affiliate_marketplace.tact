    // Function to handle affiliate withdrawals (supports both TON and USDT)
    receive(msg: Withdrawal) {
        
        self.requireNotStopped();
        require(context().value >= GAS_FEE*2, "Insufficient funds for withdrawl");
        
        let affiliateDataOptional = self.affiliates.get(msg.affiliateId);
        require(affiliateDataOptional != null, "Affiliate does not exist");
        let affiliateData: AffiliateData = affiliateDataOptional!!;

        let affiliateAccruedEarnings = affiliateData.accruedEarnings;
        require(affiliateAccruedEarnings > 0, "No earnings available to withdraw");

        let withdrawalAmount: Int;

        // Check if approval is required for withdrawal
        if (affiliateData.requiresAdvertiserApprovalForWithdrawl) {
            require(sender() == self.advertiser, "Only advertiser can approve withdrawal");

            // Advertiser specifies the amount to withdraw (must be <= total accrued earnings)
            require(msg.amount <= affiliateAccruedEarnings, "Approved amount exceeds accrued earnings");
            withdrawalAmount = msg.amount;

        } else {
            require(sender() == affiliateData.affiliate, "Only affiliate can withdraw earnings");

            // Affiliate withdraws full amount
            withdrawalAmount = affiliateAccruedEarnings;
        }

        // Calculate the net amount after fees
        let fee: Int = (withdrawalAmount * self.feePercentage + 9999) / 10000;  // e.g., fee=200 = 2%
        let netAmount = withdrawalAmount - fee;

        // Update affiliate’s accrued earnings
        affiliateData.accruedEarnings = affiliateAccruedEarnings - withdrawalAmount;
        affiliateData.lastWithdrawlAmount = netAmount;
        affiliateData.lastWithdrawlTimestamp = now();
        self.affiliates.set(msg.affiliateId, affiliateData);

        // Update campaign’s total accrued earnings
        self.totalAccruedEarnings = self.totalAccruedEarnings - withdrawalAmount;

        // Transfer fee to payout address
        send(SendParameters{
            to: self.payout,
            value: fee,
            bounce: true,
            mode: SendPayGasSeparately
        });

        // Send the approved or full amount directly to the affiliate’s wallet
        if (self.campaignDetails.paymentMethod == PAYMENT_METHOD_TON) {
            send(SendParameters{
                to: affiliateData.affiliate,
                value: netAmount,
                bounce: true,
                body: PayAffiliate{affiliateId: msg.affiliateId, amount: withdrawalAmount}.toCell(),
                mode: SendPayGasSeparately
            });
        } else {
            // For USDT Jetton, transfer both fee and withdrawal amount
            self.transferJettonUSDT(self.payout, fee, DESTINATION_ID_PAYOUT);
            self.transferJettonUSDT(affiliateData.affiliate, netAmount, msg.affiliateId);
        }

        // Emit an event for logging purposes
        // notify parent
        send(SendParameters{
            to: self.owner,
            body: ChildToParentAffiliateWithdrawEarningsFee{
                campaignId: self.campaignId,
                advertiser: self.advertiser,
                affiliateId: msg.affiliateId,
                earnings: paymentAmount,
                fee: fee
            }.toCell(),
            value: GAS_FEE,
            mode: SendPayGasSeparately
        });
    }