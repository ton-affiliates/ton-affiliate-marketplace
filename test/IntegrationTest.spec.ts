import { buildOnchainMetadata } from "./utils/jettonHelpers";
import {
    Blockchain,
    SandboxContract,
    TreasuryContract,
    printTransactionFees 
} from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary, Cell } from '@ton/core';
import { AffiliateMarketplace, UserActionStats } from '../build/AffiliateMarketplace/tact_AffiliateMarketplace';
import { Campaign } from '../build/Campaign/tact_Campaign';'../build/Campaign/tact_Campaign';
import { JettonDefaultWallet } from '../build/Campaign/tact_JettonDefaultWallet';
import { SampleJetton } from '../build/Campaign/tact_SampleJetton';
import '@ton/test-utils';
import {
      loadAffiliateCreatedEvent,
      loadCampaignCreatedEvent,
      loadAffiliateWithdrawEarningsEvent,
      loadCampaignUnderFiveTonEvent,
      loadInsufficientCampaignFundsEvent,
  	  loadAdvertiserWithdrawFundsEvent,
	  loadAdvertiserSignedCampaignDetailsEvent} from './events';

describe('AffiliateMarketplace Integration Test', () => {
    let blockchain: Blockchain;
    let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
    let deployer: SandboxContract<TreasuryContract>;
    let bot: SandboxContract<TreasuryContract>;
    let advertiser: SandboxContract<TreasuryContract>;
    let affiliate1: SandboxContract<TreasuryContract>;
    let affiliate2: SandboxContract<TreasuryContract>;
	let jettonMasterContract: SandboxContract<SampleJetton>;
    let adminJettonWallet: SandboxContract<JettonDefaultWallet>;
    let advertiserJettonWallet: SandboxContract<JettonDefaultWallet>;


    let BOT_OP_CODE_USER_CLICK = BigInt(0);
    let ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = BigInt(2001);
	
	let CAMPAIGN_BUFFER = 1;  // 1 TON
	let GAS = 0.05;  // 1 TON

    beforeEach(async () => {

        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        bot = await blockchain.treasury('bot');
        advertiser = await blockchain.treasury('advertiser');
        affiliate1 = await blockchain.treasury('affiliate1');
        affiliate2 = await blockchain.treasury('affiliate2');
		
		// Deploy 'USDT' master contract
		const jettonParams = {
			name: "USDT Token TON",
			description: "Stable Coin for TON",
			symbol: "USDT",
			image: "https://play-lh.googleusercontent.com/ahJtMe0vfOlAu1XJVQ6rcaGrQBgtrEZQefHy7SXB7jpijKhu1Kkox90XDuH8RmcBOXNn",
		};
		let content = buildOnchainMetadata(jettonParams);
		let max_supply = toNano(1234766689011); // Set the specific total supply in nano
		
		jettonMasterContract = blockchain.openContract(
            await SampleJetton.fromInit(
                deployer.address,  // owner of Jetton
                content,
				max_supply  // max supply of 1 million
            )
        );

        affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address, jettonMasterContract.address));

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

        // set some TON in the affiliate marketplace contract
        const adminReplenishMessageResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('5') },
            {
               $$type: "AdminReplenish"
            }
        );

        expect(adminReplenishMessageResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });
    });	

    it('should create campaign, add affiliate1, add affiliate2, and handle user actions', async () => {
        
		let numCampaigns = await affiliateMarketplaceContract.getNumCampaigns();
		expect(numCampaigns).toBe(BigInt(0));
		
		let botAddress = await affiliateMarketplaceContract.getBot();
		expect(botAddress.toString()).toBe(bot.address.toString());

        // 1. Bot deploys empty campaign
        const createCampaignResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            { $$type: 'BotDeployNewCampaign' }
        );

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: bot.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });
		
		numCampaigns = await affiliateMarketplaceContract.getNumCampaigns();
		expect(numCampaigns).toBe(BigInt(1));

        let decodedCampaign: any | null = null;
        for (const external of createCampaignResult.externals) {
            if (external.body) {
                decodedCampaign = loadCampaignCreatedEvent(external.body);
            }
        }
		
        expect(decodedCampaign).not.toBeNull();
        let campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);
		
		let campaignContractAddressFromMarketplace = await affiliateMarketplaceContract.getCampaignContractAddress(decodedCampaign!.campaignId);
		expect(campaignContractAddressFromMarketplace.toString()).toBe(campaignContractAddress.toString());

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContractAddress,
            deploy: true,
            success: true,
        });

        const campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));
        let campaignData = await campaignContract.getCampaignData();

        expect(campaignData.owner.toString()).toBe(affiliateMarketplaceContract.address.toString());
        expect(campaignData.state).toBe(BigInt(0)); // state: CAMPAIGN_CREATED
        expect(campaignData.contractBalance).toBe(toNano("0")); 
        expect(campaignData.campaignBalance).toBe(toNano("0"));
		

        let affiliateMarketplaceContractBalanceAfterDeployment = await affiliateMarketplaceContract.getBalance();
        expect(affiliateMarketplaceContractBalanceAfterDeployment).toBeLessThan(toNano("5"));
		expect(affiliateMarketplaceContractBalanceAfterDeployment).toBeGreaterThan(toNano("4"));
		
        // ---------------------------------------------------------------------------------------------------------------------------------------------------

        // Advertiser Signs Details of Campaign
        // User Click has op code <= 2000 which means it is verified by the bot
        // Advertiser Customized event has op code > 2000 which means it is verified by the advertiser
        // by embedding a javascript snippt in Telegeam Mini App UI button (such as User registered or User tranascted etc...)
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        const premiumUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();

        regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('1'));
        regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('2'));

        premiumUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('15'));
        premiumUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('15'));

        let affiliateMarketplaceBalanceBeforeAdvertiserSetDetails = await affiliateMarketplaceContract.getBalance();

        const advertiserSetCampaignDetailsResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: premiumUsersMapCostPerActionMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
                    isOpenCampaign: true,  // open campaign
                    campaignValidForNumDays: null, // no end date
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );

        expect(advertiserSetCampaignDetailsResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });
		
		let decodedAdvertiserSetCampaignDetailsEvent: any | null = null;
        for (const external of advertiserSetCampaignDetailsResult.externals) {
            if (external.body) {
                decodedAdvertiserSetCampaignDetailsEvent = loadAdvertiserSignedCampaignDetailsEvent(external.body);
            }
        }
		
        expect(decodedAdvertiserSetCampaignDetailsEvent).not.toBeNull();
		expect(decodedAdvertiserSetCampaignDetailsEvent!.advertiserAddressStr).toBe(advertiser.address.toString());


        // printTransactionFees(advertiserSetCampaignDetailsResult.transactions);
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
		
		expect(campaignData.state).toBe(BigInt(1)); // state STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER
		
		let expectedContractBalance = 10 - CAMPAIGN_BUFFER -0.1 - 0.1 - GAS;  // 0.1 - deploy contract fee which is taken twice (one for deploying the campaign contract and one for the wallet)
		let expectedCampaignBalance = expectedContractBalance;  // still the same since no user actions occured yet
        expect(campaignData.contractBalance).toBeGreaterThan(toNano(expectedContractBalance.toString())); // 10 - Buffer - gas spent 
        expect(campaignData.campaignBalance).toBeGreaterThan(toNano(expectedCampaignBalance.toString())); // minus another 1 TON buffer
        
        let affiliateMarketplaceBalanceAfterAdvertiserSetDetails = await affiliateMarketplaceContract.getBalance();

        // verify deploy costs returned to parent (0.1 + 0.1 + 0.02 GAS FEE minus the actual gas fee of tx)
		expect(affiliateMarketplaceBalanceBeforeAdvertiserSetDetails).toBeLessThan(affiliateMarketplaceBalanceAfterAdvertiserSetDetails);
        expect(affiliateMarketplaceBalanceAfterAdvertiserSetDetails - affiliateMarketplaceBalanceBeforeAdvertiserSetDetails)
            .toBeGreaterThan(toNano("0.1"));
		
        expect(affiliateMarketplaceBalanceAfterAdvertiserSetDetails - affiliateMarketplaceBalanceBeforeAdvertiserSetDetails)
            .toBeLessThan(toNano("0.11"));

        // --------------------------------------------------------------------------------------------------------

        // Advertiser Replenishes contract with another 10 TON
		let campaignDataBeforeReplenish = await campaignContract.getCampaignData();
        const advertiserReplenishResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('10'),
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

        campaignData = await campaignContract.getCampaignData();
        expect(campaignData.contractBalance).toBeGreaterThan(campaignDataBeforeReplenish.contractBalance); 
        expect(campaignData.campaignBalance).toBeGreaterThan(campaignDataBeforeReplenish.campaignBalance); 


        //------------------------------------------------------------------------------------------------------

        // CreateNewAffiliate - afiliate1
        const createAffiliate1Result = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateCreateNewAffiliate' }
        );

        expect(createAffiliate1Result.transactions).toHaveTransaction({
            from: affiliate1.address,
            to: campaignContract.address,
            success: true,
        });

        expect(createAffiliate1Result.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliateMarketplaceContract.address,
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
		
		expect(affiliateData1!.affiliate.toString()).toBe(affiliate1.address.toString());
        expect(affiliateData1!.accruedEarnings).toBe(toNano("0"));
		expect(affiliateData1!.lastWithdrawlAmount).toBe(toNano("0"));
		expect(affiliateData1!.lastWithdrawlTimestamp).toBe(toNano("0"));

         // expect stats to be 0
        const emptyUserActionStat: UserActionStats = {
            $$type: 'UserActionStats', // The required type identifier
            numActions: BigInt(0), // Initialize with 0 actions
            lastUserActionTimestamp: BigInt(0) // Initialize with a default timestamp (e.g., 0)
        };
		
        expect(affiliateData1!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).numActions).toBe(emptyUserActionStat.numActions);
		expect(affiliateData1!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).lastUserActionTimestamp).toBe(emptyUserActionStat.lastUserActionTimestamp);
        expect(affiliateData1!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).numActions).toBe(emptyUserActionStat.numActions);
        expect(affiliateData1!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).lastUserActionTimestamp).toBe(emptyUserActionStat.lastUserActionTimestamp);


        expect(affiliateData1!.premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).numActions).toBe(emptyUserActionStat.numActions);
		expect(affiliateData1!.premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).lastUserActionTimestamp).toBe(emptyUserActionStat.lastUserActionTimestamp);
		expect(affiliateData1!.premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).numActions).toBe(emptyUserActionStat.numActions);
        expect(affiliateData1!.premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).lastUserActionTimestamp).toBe(emptyUserActionStat.lastUserActionTimestamp);


        //------------------------------------------------------------------------------------------------------

        // Affiliate - CreateNewAffiliate - afiliate2
        const createAffiliate2Result = await campaignContract.send(
            affiliate2.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateCreateNewAffiliate' }
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

        // ------------------------------------------------------------------------------------------

        let campaignDataBeforeUserAction = await campaignContract.getCampaignData();

        // User Action - Regular user (Affiliate1)
        const userActionResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                campaignId: decodedCampaign!.campaignId,
                affiliateId: decodedAffiliate1!.affiliateId,
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
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

		// contract balance - should only remove gas fees (for this function it is around ~0.03 TON)
        expect(campaignDataBeforeUserAction.contractBalance - campaignData.contractBalance)
            .toBeLessThan(toNano("0.04"));

        // campaignBalance ~ 1 less than it was before this user action
		// 1 for the user Action
		// minus the gas fee paid by the contract
        expect(campaignDataBeforeUserAction.campaignBalance - campaignData.campaignBalance)
            .toBeGreaterThan(toNano("1"));

        expect(campaignDataBeforeUserAction.campaignBalance - campaignData.campaignBalance)
            .toBeLessThan(toNano("1.02"));

        // test Affiliate's accruedBalance = 1
        expect(affiliateData1!.accruedEarnings).toBe(toNano("1"));
		
		expect(affiliateData1!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).numActions).toBe(BigInt(1));
		expect(affiliateData1!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).lastUserActionTimestamp).toBeGreaterThan(BigInt(0));
       
		expect(affiliateData1!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).numActions).toBe(BigInt(0));
		expect(affiliateData1!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).lastUserActionTimestamp).toBe(BigInt(0));
		
		expect(affiliateData1!.premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).numActions).toBe(BigInt(0));
		expect(affiliateData1!.premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).lastUserActionTimestamp).toBe(BigInt(0));
		
		expect(affiliateData1!.premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).numActions).toBe(BigInt(0));
		expect(affiliateData1!.premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).lastUserActionTimestamp).toBe(BigInt(0));
		
		// to print a nice looking and correct timestamp we must multiply by 1000
		let lastUserActionTimestamp = affiliateData1!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).lastUserActionTimestamp;
		console.log(new Date(Number(lastUserActionTimestamp) * 1000).toLocaleString());

        // ------------------------------------------------------------------------------------------

        let campaignDataBeforeCustomizedEvent = await campaignContract.getCampaignData();

         // Simulate user action -  premium user from the advertiser directly to the campaign contract
         // advertiser signs this transaction directly!
        const premiumUserActionResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: decodedAffiliate2!.affiliateId,
                userActionOpCode: BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT),
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
        let decodedCampaignUnderFiveTon: any | null = null
        let decodedInsufficientBalanceInCampaign: any | null = null;

        // 2 events can be omitted here
        for (const external of premiumUserActionResult.externals) {
            if (external.body) {
                try {
                    decodedCampaignUnderFiveTon = loadCampaignUnderFiveTonEvent(external.body);
                }
                catch(e:any){} // ignore exception

                 try {
                    decodedInsufficientBalanceInCampaign = loadInsufficientCampaignFundsEvent(external.body);
                }
                catch(e:any){} // ignore exception
                
            }
        }

        expect(decodedCampaignUnderFiveTon).not.toBeNull();
		expect(decodedCampaignUnderFiveTon.campaignId).toBe(decodedCampaign!.campaignId);
		expect(decodedCampaignUnderFiveTon.advertiserAddressStr).toBe(advertiser.address.toString());
		expect(decodedCampaignUnderFiveTon.campaignBalance).toBeLessThan(toNano("5"));

        expect(decodedInsufficientBalanceInCampaign).not.toBeNull();
        expect(decodedInsufficientBalanceInCampaign.campaignId).toBe(decodedCampaign!.campaignId);
		expect(decodedInsufficientBalanceInCampaign.advertiserAddressStr).toBe(advertiser.address.toString());
		expect(decodedInsufficientBalanceInCampaign.campaignBalance).toBeLessThan(decodedInsufficientBalanceInCampaign.maxCpaValue);  
		
        campaignData = await campaignContract.getCampaignData();
		
		expect(campaignData.campaignHasSufficientFundsToPayMaxCpa).toBe(false);
        affiliateData2 = await campaignContract.getAffiliateData(decodedAffiliate2!.affiliateId);

        // contract balance - only gas on the message to parent should be deducted
		expect(campaignData.totalAccruedEarnings - campaignDataBeforeCustomizedEvent.totalAccruedEarnings)
            .toBe(toNano("15"));
        expect(campaignDataBeforeCustomizedEvent.contractBalance - campaignData.contractBalance)
            .toBeLessThan(toNano("0.03"));

        // test: campaignBalance = 15 less than it was before this user action (minus gas fees)
        expect(campaignDataBeforeCustomizedEvent.campaignBalance - campaignData.campaignBalance)
            .toBeGreaterThan(toNano("14.98"));

        expect(campaignDataBeforeCustomizedEvent.campaignBalance - campaignData.campaignBalance)
            .toBeLessThan(toNano("15"));

        expect(affiliateData2!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).numActions).toBe(BigInt(0));
        expect(affiliateData2!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).numActions).toBe(BigInt(0));
        expect(affiliateData2!.premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)).numActions).toBe(BigInt(0));
        expect(affiliateData2!.premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)).numActions).toBe(BigInt(1));

        // test: Affiliate's accrued earnings is now 15
        expect(affiliateData2!.accruedEarnings).toBe(toNano("15"));

        //-------------------------------------------------------------------------------------------
        let affiliateBalanceBeforeWithdraw = await affiliate1.getBalance();
		let deployerBalanceBeforeWithdraw = await deployer.getBalance();

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
		expect(decodedAffiliateWithdraw.earnings).toBe(toNano("0.98"));
		expect(decodedAffiliateWithdraw.fee).toBe(toNano("0.02"));
				
        campaignData = await campaignContract.getCampaignData();
        affiliateData1 = await campaignContract.getAffiliateData(decodedAffiliate1!.affiliateId);
		
        // test: Affiliate's accrued earnings is now 0
        expect(affiliateData1!.accruedEarnings).toBe(toNano("0"));
				
        let affiliateBalance = await affiliate1.getBalance();
		let deployerBalance = await deployer.getBalance();
						
		// earnings = 2% fee to parent
		// earnings = 1 TON
		// fee = 0.02
		// total 0.98 TON - gas fees paied for 3 tx 	
		expect(affiliateBalance - affiliateBalanceBeforeWithdraw).toBeLessThan(toNano("0.98"));
		expect(affiliateBalance - affiliateBalanceBeforeWithdraw).toBeGreaterThan(toNano("0.9"));
		expect(affiliateData1!.lastWithdrawlAmount).toBe(toNano("0.98"));
		expect(affiliateData1!.lastWithdrawlTimestamp).toBeGreaterThan(BigInt(0));
						
		// to print a nice looking and correct timestamp we must multiply by 1000
		let lastWithdrawlTimestamp = affiliateData1!.lastWithdrawlTimestamp;
		console.log(new Date(Number(lastWithdrawlTimestamp) * 1000).toLocaleString());
		
		expect(BigInt(deployerBalance - deployerBalanceBeforeWithdraw))
            .toBeGreaterThan(toNano("0"));
		expect(BigInt(deployerBalance - deployerBalanceBeforeWithdraw))
            .toBeLessThan(toNano("0.02"));

        //-------------------------------------------------------------------------------------------

        //Advertiser - RemoveCampaignAndWithdrawFunds
        let advertiserBalanceBeforeRemoveCampaign = await advertiser.getBalance();
		let campaignDataBeforeRemoveCampaign = await campaignContract.getCampaignData();
				
		// campaign balance ~ 3 TON
		expect(campaignDataBeforeRemoveCampaign.campaignBalance).toBeGreaterThan(toNano("0"));
		const removeCampaignAndWithdrawFundsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AdvertiserWithdrawFunds' }
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
		
		let decodedAdvertiserWithdrawFunds: any | null = null;
        for (const external of removeCampaignAndWithdrawFundsResult.externals) {
            if (external.body) {
                decodedAdvertiserWithdrawFunds = loadAdvertiserWithdrawFundsEvent(external.body);
            }
        }
		
        expect(decodedAdvertiserWithdrawFunds).not.toBeNull();
        expect(decodedAdvertiserWithdrawFunds!.campaignId).toBe(decodedCampaign!.campaignId);
		
		campaignData = await campaignContract.getCampaignData();
		expect(campaignData.campaignBalance).toBe(toNano("0"));
				
		
		let advertiserBalance = await advertiser.getBalance();
				
		expect(advertiserBalance - advertiserBalanceBeforeRemoveCampaign)
            .toBeGreaterThan(campaignDataBeforeRemoveCampaign.campaignBalance - toNano("0.1"));
			
        expect(advertiserBalance - advertiserBalanceBeforeRemoveCampaign)
            .toBeLessThan(campaignDataBeforeRemoveCampaign.campaignBalance);

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









