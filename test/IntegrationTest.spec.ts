import {
    Blockchain,
    printTransactionFees,
    prettyLogTransactions,
    SandboxContract,
    TreasuryContract
} from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary } from '@ton/core';
import { AffiliateMarketplace } from '../build/AffiliateMarketplace/tact_AffiliateMarketplace';
import { Campaign } from '../build/Campaign/tact_Campaign';
import '@ton/test-utils';
import {
    loadAffiliateCreatedEvent,
    loadCampaignCreatedEvent,
    loadAffiliateWithdrawEarningsEvent,
    loadAdvertiserReplenisEvent,
    loadCampaignUnderThresholdEvent,
    loadInsufficientCampaignFundsEvent
} from './events';


describe('AffiliateMarketplace Integration Test', () => {
    let blockchain: Blockchain;
    let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
    let deployer: SandboxContract<TreasuryContract>;
    let bot: SandboxContract<TreasuryContract>;
    let advertiser: SandboxContract<TreasuryContract>;
    let affiliate1: SandboxContract<TreasuryContract>;
    let affiliate2: SandboxContract<TreasuryContract>;


    let BOT_OP_CODE_USER_CLICK = BigInt(0);
    let ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = BigInt(201)

    beforeEach(async () => {

        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        bot = await blockchain.treasury('bot');
        advertiser = await blockchain.treasury('advertiser');
        affiliate1 = await blockchain.treasury('affiliate1');
        affiliate2 = await blockchain.treasury('affiliate2');

        affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address));

        // Deploy the contract
        const deployResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            deploy: true,
            success: true,
        });

        blockchain.now = deployResult.transactions[1].now;  // necessary only for 'moving forward in time' for feature - advertiser withdraw balance
    });

    it('should create campaign, add affiliate1, add affiliate2, and handle user actions', async () => {
	
        // 1. Advertiser Creates campaign
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            { value: toNano('0.13') },
            { $$type: 'CreateCampaign' }
        );

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        let decodedCampaign: any | null = null;
        for (const external of createCampaignResult.externals) {
            if (external.body) {
                decodedCampaign = loadCampaignCreatedEvent(external.body);
            }
        }

        expect(decodedCampaign).not.toBeNull();
        let campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContractAddress,
            deploy: true,
            success: true,
        });

        const campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));
        let campaignData = await campaignContract.getCampaignData();

        // assert: campaignBalance = 0
        // assert: contractBalance = 0.1 - deploy costs
        expect(campaignData.contractBalance).toBeLessThan(toNano("0.1"));
        expect(campaignData.contractBalance).toBeGreaterThan(toNano("0"));
        expect(campaignData.campaignBalance).toBe(toNano("0"));
		expect(campaignData.state).toBe(BigInt(0)); // state CAMPAIGN_CREATED

        // ---------------------------------------------------------------------------------------------------------------------------------------------------

        // Advertiser Signs Details of Campaign
        // User Click has op code <= 200 which means it is verified by the bot
        // Advertiser Customized event has op code > 200 which means it is verified by the advertiser
        // by embedding a javascript snippt in Telegeam Mini App UI button (such as User registered or User tranascted etc...)
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        const premiumUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();

        regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('1'));
        regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('2'));

        premiumUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('15'));
        premiumUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('15'));

        const advertiserSetCampaignDetailsResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: premiumUsersMapCostPerActionMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
                    isOpenCampaign: true,
                    daysWithoutUserActionForWithdrawFunds: 80n,
					campaignBalanceNotifyAdvertiserThreshold: toNano("3")
                }
            }
        );

        expect(advertiserSetCampaignDetailsResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });

        campaignData = await campaignContract.getCampaignData();
		
        expect("1").toBe(
            fromNano(campaignData.campaignDetails.regularUsersCostPerAction.get(BigInt(BOT_OP_CODE_USER_CLICK))!)
        );
		
		expect("15").toBe(
            fromNano(campaignData.campaignDetails.premiumUsersCostPerAction.get(BigInt(BOT_OP_CODE_USER_CLICK))!)
        );
		
		expect("2").toBe(
            fromNano(campaignData.campaignDetails.regularUsersCostPerAction.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))!)
        );
		
		expect("15").toBe(
            fromNano(campaignData.campaignDetails.premiumUsersCostPerAction.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))!)
        );
		
		expect(campaignData.state).toBe(BigInt(1)); // state STATE_CAMPAIGN_INACTIVE
		
		expect(fromNano(campaignData.campaignDetails.campaignBalanceNotifyAdvertiserThreshold)).toBe("3");

      
        // --------------------------------------------------------------------------------------------------------

        // Advertiser Replenishes contract with 20 TON
        let affiliateMarketplaceBalanceBeforeReplenish = await affiliateMarketplaceContract.getBalance();

        const advertiserReplenishResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('20'),
            },
            {
                $$type: 'AdvertiserReplenish'
            }
        );

        expect(advertiserReplenishResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });

        expect(advertiserReplenishResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        let decodedAdvertiserReplenish: any | null = null;
        for (const external of advertiserReplenishResult.externals) {
            if (external.body) {
                decodedAdvertiserReplenish = loadAdvertiserReplenisEvent(external.body);
            }
        }

        // 20 TON were sent to the campaign contract
        // 2% fee go to parent - 0.4 TON
        expect(decodedAdvertiserReplenish).not.toBeNull();
        expect(decodedAdvertiserReplenish.replenishAmount).toBe(toNano("20"));
        expect(decodedAdvertiserReplenish.fee).toBe(toNano("0.4"));  // 2%

        campaignData = await campaignContract.getCampaignData();

        // test: contractBalance = (20 - 0.4) + prevBalance which is a bit less than 0.13
        expect(campaignData.contractBalance).toBeLessThan(toNano("19.73"));
        expect(campaignData.contractBalance).toBeGreaterThan(toNano("19.63"));

        // test: campaignBalance = 1 TON less due to buffer of 0.13
        expect(campaignData.campaignBalance).toBeLessThan(toNano("18.73"));
        expect(campaignData.campaignBalance).toBeGreaterThan(toNano("18.63"))

        // test: AffiliateMarketplace balance is now 0.4 larger than it was before this replnishment
        expect(affiliateMarketplaceBalanceBeforeReplenish).toBeLessThan((await affiliateMarketplaceContract.getBalance()));
		
		expect(campaignData.state).toBe(BigInt(2)); // state STATE_CAMPAIGN_ACTIVE

        //------------------------------------------------------------------------------------------------------

        // CreateNewAffiliate - afiliate1
        const createAffiliate1Result = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            { $$type: 'CreateNewAffiliate' }
        );

        expect(createAffiliate1Result.transactions).toHaveTransaction({
            from: affiliate1.address,
            to: campaignContract.address,
            success: true,
        });

        let decodedAffiliate1: any | null = null
        for (const external of createAffiliate1Result.externals) {
            if (external.body) {
                decodedAffiliate1 = loadAffiliateCreatedEvent(external.body);
            }
        }

        expect(decodedAffiliate1).not.toBeNull();

        campaignData = await campaignContract.getCampaignData();
        let affiliateData1 : any | null = await campaignContract.getAffiliateData(decodedAffiliate1!.affiliateId);

         // test: affiliate1's accrued balance is 0 (no user actions yet)
         expect(affiliateData1!.accruedEarnings).toBe(toNano("0"));

         // expect stats to be 0
         expect(affiliateData1!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(0));
         expect(affiliateData1!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(0));

         expect(affiliateData1!.premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(0));
         expect(affiliateData1!.premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(0));

        //------------------------------------------------------------------------------------------------------

        // Affiliate - CreateNewAffiliate - afiliate2
        const createAffiliate2Result = await campaignContract.send(
            affiliate2.getSender(),
            { value: toNano('0.05') },
            { $$type: 'CreateNewAffiliate' }
        );

        expect(createAffiliate2Result.transactions).toHaveTransaction({
            from: affiliate2.address,
            to: campaignContract.address,
            success: true,
        });

        let decodedAffiliate2: any | null = null
        for (const external of createAffiliate2Result.externals) {
            if (external.body) {
                decodedAffiliate2 = loadAffiliateCreatedEvent(external.body);
            }
        }

        expect(decodedAffiliate2).not.toBeNull();

        campaignData = await campaignContract.getCampaignData();
        let affiliateData2 : any | null = await campaignContract.getAffiliateData(decodedAffiliate2!.affiliateId);

         // test: affiliate1's accrued balance is 0 (no user actions yet)
         expect(affiliateData2!.accruedEarnings).toBe(toNano("0"));

         // expect stats to be 0
         expect(affiliateData2!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(0));
         expect(affiliateData2!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(0));

         expect(affiliateData2!.premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(0));
         expect(affiliateData2!.premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(0));

        // ------------------------------------------------------------------------------------------


        let campaignDataBeforeUserAction = await campaignContract.getCampaignData();

        // User Action - Regular user (Affiliate1)
        const userActionResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'UserAction',
                campaignId: decodedCampaign!.campaignId,
                affiliateId: decodedAffiliate1!.affiliateId,
                advertiser: advertiser.address,
                userActionOpCode: BOT_OP_CODE_USER_CLICK,
                isPremiumUser: false,
            }
        );

        expect(userActionResult.transactions).toHaveTransaction({
            from: bot.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        expect(userActionResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true,
        });

        expect(userActionResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        campaignData = await campaignContract.getCampaignData();
        affiliateData1 = await campaignContract.getAffiliateData(decodedAffiliate1!.affiliateId);

		// contract balance - 0.02 GAS FEE goes to parent + gas on the message
        expect(campaignDataBeforeUserAction.contractBalance - campaignData.contractBalance)
            .toBeLessThan(toNano("0.025"));

        // campaignBalance = 1.01 less than it was before this user action
		// 1 for the user Action
		// 0.02 GAS fee for parent that was taken from the contract itself
		// Remember that the campaign balance is a derivative of the contractBalance (campaginBalance = contractBalance - totalAffiliatesEarnings - buffer)
		
        expect(campaignDataBeforeUserAction.campaignBalance - campaignData.campaignBalance)
            .toBeGreaterThan(toNano("1"));

        expect(campaignDataBeforeUserAction.campaignBalance - campaignData.campaignBalance)
            .toBeLessThan(toNano("1.03"));

        // test Affiliate's accruedBalance = 1
        expect(affiliateData1!.accruedEarnings).toBe(toNano("1"));

		expect(affiliateData1!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(1));
		expect(affiliateData1!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(0));
		expect(affiliateData1!.premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(0));
		expect(affiliateData1!.premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(0));

        // ------------------------------------------------------------------------------------------

        let campaignDataBeforeCustomizedEvent = await campaignContract.getCampaignData();

         // Simulate user action -  premium user from the advertiser directly to the campaign contract
         // advertiser signs this transaction directly!
        const premiumUserActionResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AffiliateUserAction',
                affiliateId: decodedAffiliate2!.affiliateId,
                userActionOpCode: ADVERTISER_OP_CODE_CUSTOMIZED_EVENT,
                isPremiumUser: true,
            }
        );

        expect(premiumUserActionResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });

        expect(premiumUserActionResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        // event is triggered due to campaign balance being under threshold of 5 TON following this customized event
        let decodedCampaignUnderThreshold: any | null = null
        for (const external of premiumUserActionResult.externals) {
            if (external.body) {
                decodedCampaignUnderThreshold = loadCampaignUnderThresholdEvent(external.body);
            }
        }

        expect(decodedCampaignUnderThreshold).not.toBeNull();
		expect(decodedCampaignUnderThreshold.campaignId).toBe(0);
		expect(decodedCampaignUnderThreshold.advertiserAddressStr).toBe(advertiser.address.toString());
		expect(decodedCampaignUnderThreshold.campaginBalance).toBeLessThan(toNano("5"));
		
        campaignData = await campaignContract.getCampaignData();
        affiliateData2 = await campaignContract.getAffiliateData(decodedAffiliate2!.affiliateId);

        // contract balance - only gas on the message to parent should be deducted
        expect(campaignDataBeforeCustomizedEvent.contractBalance - campaignData.contractBalance)
            .toBeLessThan(toNano("0.006"));

        // test: campaignBalance = 15 less than it was before this user action
        // It is exactly 15 because there are no gas fees to pay to the parent contract
        // since the gas fees for this event was paid for by the advertiser
        expect(campaignDataBeforeCustomizedEvent.campaignBalance - campaignData.campaignBalance)
            .toBe(toNano("15"));

        expect(affiliateData2!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(0));
        expect(affiliateData2!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(0));
        expect(affiliateData2!.premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(0));
        expect(affiliateData2!.premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(1));

        // test: Affiliate's accrued earnings is now 15
        expect(affiliateData2!.accruedEarnings).toBe(toNano("15"));

        //-------------------------------------------------------------------------------------------

        let affiliateBalanceBeforeWithdraw = await affiliate1.getBalance();

        // AffiliateWithdrawResult
        const affiliateWithdrawResult = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateWithdrawEarnings', affiliateId: decodedAffiliate1!.affiliateId }
        );

        expect(affiliateWithdrawResult.transactions).toHaveTransaction({
            from: affiliate1.address,
            to: campaignContract.address,
            success: true,
        });

        expect(affiliateWithdrawResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        expect(affiliateWithdrawResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliate1.address,
            success: true,
        });

        let decodedAffiliateWithdraw: any | null = null
        for (const external of affiliateWithdrawResult.externals) {
            if (external.body) {
                decodedAffiliateWithdraw = loadAffiliateWithdrawEarningsEvent(external.body);
            }
        }

        expect(decodedAffiliateWithdraw).not.toBeNull();
		expect(decodedAffiliateWithdraw.earnings).toBe(toNano("1"));
		expect(decodedAffiliateWithdraw.fee).toBe(toNano("0.02"));

        campaignData = await campaignContract.getCampaignData();
        affiliateData1 = await campaignContract.getAffiliateData(decodedAffiliate1!.affiliateId);

        // test: Affiliate's accrued earnings is now 0
        expect(affiliateData1!.accruedEarnings).toBe(toNano("0"));

        let affiliateBalance = await affiliate1.getBalance();
		
		// earnings = 2% fee to parent
		// earnings = 1 TON
		// fee = 0.02
		// total 0.98 TON - gas fees paied for 3 tx (one for the tx, one for parent fee, and one for the payment back to the publisher)	
		expect(affiliateBalance - affiliateBalanceBeforeWithdraw).toBeLessThan(toNano("0.98"));
		expect(affiliateBalance - affiliateBalanceBeforeWithdraw).toBeGreaterThan(toNano("0.9"));

        //-------------------------------------------------------------------------------------------

        //Advertiser - RemoveCampaignAndWithdrawFunds
        let advertiserBalanceBeforeRemoveCampaign = await advertiser.getBalance();
		let campaginDataBeforeRemoveCampaign = await campaignContract.getCampaignData();
		
		// campaign balance ~ 2.75 TON
		expect(campaginDataBeforeRemoveCampaign.campaignBalance).toBeLessThan(toNano("2.8"));
		expect(campaginDataBeforeRemoveCampaign.campaignBalance).toBeGreaterThan(toNano("2.7"));
		
        if (blockchain.now) blockchain.now = blockchain.now + 81 * (60*60*24); // move 81 days forward in time WITHOUT user action
        
		const removeCampaignAndWithdrawFundsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            { $$type: 'RemoveCampaignAndWithdrawFunds' }
        );

        expect(removeCampaignAndWithdrawFundsResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });

        expect(removeCampaignAndWithdrawFundsResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: advertiser.address,
            success: true,
        });
		
		
		campaignData = await campaignContract.getCampaignData();
		expect(campaignData.campaignBalance).toBe(toNano("0"));
				
		let advertiserBalance = await advertiser.getBalance();
		
		expect(affiliateBalance - affiliateBalanceBeforeWithdraw).toBeLessThan(toNano("0.98"));		
		expect(advertiserBalance - advertiserBalanceBeforeRemoveCampaign)
            .toBeGreaterThan(toNano("2.6"));
			
        expect(advertiserBalance - advertiserBalanceBeforeRemoveCampaign)
            .toBeLessThan(toNano("2.8"));


        //------------------------------------------------------------------------------------

        // Simulate another user action -  
		// should recieve event - InsufficientCampaignFundsEvent
		// should set the state of the campaign to inactive
        const premiumUserActionResult2 = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'UserAction',
                campaignId: decodedCampaign!.campaignId,
                affiliateId: decodedAffiliate1!.affiliateId,
                advertiser: advertiser.address,
                userActionOpCode: BOT_OP_CODE_USER_CLICK,
                isPremiumUser: true,
            }
        );

        expect(premiumUserActionResult2.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true,
        });

        expect(premiumUserActionResult2.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        // event is triggered due to balance in campaign to pay affiliate
        let decodedInsufficientBalanceInCampaign: any | null = null
        for (const external of premiumUserActionResult2.externals) {
            if (external.body) {
                decodedInsufficientBalanceInCampaign = loadInsufficientCampaignFundsEvent(external.body);
            }
        }

        expect(decodedInsufficientBalanceInCampaign).not.toBeNull();
		
		campaignData = await campaignContract.getCampaignData();
		expect(campaignData.state).toBe(BigInt(1));  // STATE_CAMPAIGN_INACTIVE

        //------------------------------------------------------------------------------------------------------------------------

        // Affiliate2 Withdraw (even though advertiser already removed campaign!)
        const affiliate2WithdrawResult = await campaignContract.send(
            affiliate2.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateWithdrawEarnings', affiliateId: decodedAffiliate2!.affiliateId }
        );

        expect(affiliate2WithdrawResult.transactions).toHaveTransaction({
            from: affiliate2.address,
            to: campaignContract.address,
            success: true,
        });

        expect(affiliate2WithdrawResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        expect(affiliate2WithdrawResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliate2.address,
            success: true,
        });

        let decodedAffiliate2Withdraw: any | null = null
        for (const external of affiliate2WithdrawResult.externals) {
            if (external.body) {
                decodedAffiliate2Withdraw = loadAffiliateWithdrawEarningsEvent(external.body);
            }
        }

        expect(decodedAffiliate2Withdraw).not.toBeNull();

        affiliateData2 = await campaignContract.getAffiliateData(decodedAffiliate2!.affiliateId);

        // test: Affiliate's accrued earnings is now 0
        expect(affiliateData2!.accruedEarnings).toBe(toNano("0"));


      

    });
});