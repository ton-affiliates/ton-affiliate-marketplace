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
    loadCampaignRemovedEvent, loadInsufficientCampaignFundsEvent
} from './events';


type EmitLogEvent = {
    type: string;
    data: any;
};

const logs: EmitLogEvent[] = [];

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

    it('should create campaign, add affiliate1, and handle user actions with balance logging', async () => {

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
                logs.push({ type: 'CampaignCreatedEvent', data: decodedCampaign });
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

        logs.push({
            type: 'InitialCampaignBalanceLog',
            data: `Initial Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}`
        });

        // ---------------------------------------------------------------------------------------------------------------------------------------------------

        // Advertiser Signs Details of Campaign
        // User Click has op code <= 20 which means it is verified by the bot
        // Advertiser Customized event has op code > 20 which means it is verified by the advertiser
        // by embedding a javascript snippt in Telegeam Mini App UI button (such as User registered or User tranascted etc...)
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        const premiumUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();

        regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('1'));
        regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('2'));

        premiumUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('15'));
        premiumUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('15'));

        const advertiserSignedResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'AdvertiserSigned',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: premiumUsersMapCostPerActionMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
                    isOpenCampaign: true,
                    daysWithoutUserActionForWithdrawFunds: 80n,
                }
            }
        );

        expect(advertiserSignedResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });

        campaignData = await campaignContract.getCampaignData();

        const regularUserClickCost = regularUsersMapCostPerActionMap.get(BigInt(BOT_OP_CODE_USER_CLICK));
        if (regularUserClickCost === undefined) {
            throw new Error('Cost for USER_CLICK is undefined in regularUsersMapCostPerActionMap');
        }
        expect(fromNano(regularUserClickCost)).toBe(
            fromNano(campaignData.campaignDetails.regularUsersCostPerAction.get(BigInt(BOT_OP_CODE_USER_CLICK))!)
        );

        const advertiserCustomEventCostRegular = regularUsersMapCostPerActionMap.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT));
        if (advertiserCustomEventCostRegular === undefined) {
            throw new Error('Cost for ADVERTISER_OP_CODE_CUSTOMIZED_EVENT is undefined in regularUsersMapCostPerActionMap');
        }
        expect(fromNano(advertiserCustomEventCostRegular)).toBe(
            fromNano(campaignData.campaignDetails.regularUsersCostPerAction.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))!)
        );

        const userClickCostPremium = premiumUsersMapCostPerActionMap.get(BigInt(BOT_OP_CODE_USER_CLICK));
        if (userClickCostPremium === undefined) {
            throw new Error('Cost for BOT_OP_CODE_USER_CLICK is undefined in premiumUsersMapCostPerActionMap');
        }
        expect(fromNano(userClickCostPremium)).toBe(
            fromNano(campaignData.campaignDetails.premiumUsersCostPerAction.get(BigInt(BOT_OP_CODE_USER_CLICK))!)
        );

        const advertiserCustomEventCostPremium = premiumUsersMapCostPerActionMap.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT));
        if (advertiserCustomEventCostPremium === undefined) {
            throw new Error('Cost for ADVERTISER_OP_CODE_CUSTOMIZED_EVENT is undefined in premiumUsersMapCostPerActionMap');
        }
        expect(fromNano(advertiserCustomEventCostPremium)).toBe(
            fromNano(campaignData.campaignDetails.premiumUsersCostPerAction.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))!)
        );

        // test: campaignData.campaignDetails have same values as set in request
        logs.push({
            type: 'advertiserSigned',
            data: `Advertiser Signed: 
        Regular User Click: ${fromNano(regularUsersMapCostPerActionMap.get(BigInt(BOT_OP_CODE_USER_CLICK)) || 0)} TON,
        Premium User Click: ${fromNano(premiumUsersMapCostPerActionMap.get(BigInt(BOT_OP_CODE_USER_CLICK)) || 0)} TON,
        Regular Advertiser Customized Event: ${fromNano(regularUsersMapCostPerActionMap.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)) || 0)} TON,
        Premium Advertiser Customized Event: ${fromNano(premiumUsersMapCostPerActionMap.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)) || 0)} TON`
        });

        // --------------------------------------------------------------------------------------------------------

        // Advertiser Replenishes contract with TON
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
                logs.push({ type: 'AdvertiserReplenishEvent', data: decodedAdvertiserReplenish });
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

        logs.push({
            type: 'advertiserReplenishBalanceLog',
            data: `Campaign Balance: ${fromNano(campaignData.campaignBalance)}, 
                   Contract Balance: ${fromNano(campaignData.contractBalance)},
                   AffiliateMarketplaceBefore: ${fromNano(affiliateMarketplaceBalanceBeforeReplenish)},
                   AffiliateMarketplaceAfter: ${fromNano(await affiliateMarketplaceContract.getBalance())}`
        });

        //------------------------------------------------------------------------------------------------------

        // Affiliate - CreateNewAffiliate - afiliate1
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
                logs.push({ type: 'AffiliateCreatedEvent', data: decodedAffiliate1 });
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
                logs.push({ type: 'AffiliateCreatedEvent', data: decodedAffiliate2 });
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

        // User Action - Regular user
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

        // test: contractBalance = 0.01  + gas fees TON less than it was (only fee goes to parent - all other TON were kept within the contract)
        expect(campaignDataBeforeUserAction.contractBalance - campaignData.contractBalance)
            .toBeLessThan(toNano("0.025"));

        // test: campaignBalance = 1.01 less than it was before this user action
        expect(campaignDataBeforeUserAction.campaignBalance - campaignData.campaignBalance)
            .toBeGreaterThan(toNano("1"));

        expect(campaignDataBeforeUserAction.campaignBalance - campaignData.campaignBalance)
            .toBeLessThan(toNano("1.03"));

        // test Affiliate's accruedBalance = 1
        expect(affiliateData1!.accruedEarnings).toBe(toNano("1"));

         let userActionsStats = affiliateData1!.userActionsStats;
         expect(userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(1));
         expect(userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(0));

         let premiumUserActionsStats = affiliateData1!.premiumUserActionsStats;
         expect(premiumUserActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK))).toBe(BigInt(0));
         expect(premiumUserActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT))).toBe(BigInt(0));

        logs.push({
            type: 'afterUserActionLog',
            data: `Campaign Balance: ${fromNano(campaignData.campaignBalance)}, 
                   Contract Balance: ${fromNano(campaignData.contractBalance)},
                   Affiliate Accrued Earnings: ${fromNano(affiliateData1!.accruedEarnings)}, 
                   Affiliate Stats: ${affiliateData1!.userActionsStats.get(BigInt(BOT_OP_CODE_USER_CLICK)!)}}`
        });

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

        campaignData = await campaignContract.getCampaignData();
        affiliateData2 = await campaignContract.getAffiliateData(decodedAffiliate2!.affiliateId);

        // test: contractBalance = 0.01  + gas fees TON less than it was (only fee goes to parent - all other TON were kept within the contract)
        expect(campaignDataBeforeCustomizedEvent.contractBalance - campaignData.contractBalance)
            .toBeLessThan(toNano("0.025"));

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

        logs.push({
            type: 'afterPremiumUserActionBalanceLog',
            data: `Campaign Balance: ${fromNano(campaignData.campaignBalance)}, 
                   Contract Balance: ${fromNano(campaignData.contractBalance)}, 
                   Affiliate Accrued Earnings: ${fromNano(affiliateData2!.accruedEarnings)}, 
                   Affiliate Stats: ${affiliateData2!.userActionsStats.get(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT)!)}}`
        });

        logs.push({ type: 'DecodedCampaignUnderThresholdEvent', data: decodedCampaignUnderThreshold });


        //-------------------------------------------------------------------------------------------

        let beforeWithdrawAffiliateBalance = await affiliate1.getBalance();
        let campaignDataBeforeAffiliateWithdraw = await campaignContract.getCampaignData();

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
                logs.push({ type: 'AffiliateWithdrawEarningsEvent', data: decodedAffiliateWithdraw });
            }
        }

        expect(decodedAffiliateWithdraw).not.toBeNull();

        campaignData = await campaignContract.getCampaignData();
        affiliateData1 = await campaignContract.getAffiliateData(decodedAffiliate1!.affiliateId);

        // test: Affiliate's accrued earnings is now 0
        expect(affiliateData1!.accruedEarnings).toBe(toNano("0"));

        let affiliateBalance = await affiliate1.getBalance();

        logs.push({
            type: 'afterAffiliateWithdrawLog',
            data: `Campaign Balance Before Withdraw: ${fromNano(campaignDataBeforeAffiliateWithdraw.campaignBalance)},
                   Campaign Balance After Withdraw: ${fromNano(campaignData.campaignBalance)},
                   Contract Balance Before Withdraw: ${fromNano(campaignDataBeforeAffiliateWithdraw.contractBalance)}
                   Contract Balance After Withdraw: ${fromNano(campaignData.contractBalance)}
                   Affiliate Balance Before Withdraw: ${fromNano(beforeWithdrawAffiliateBalance)}
                   Affiliate Balance After Withdraw: ${fromNano(affiliateBalance)}
                   }`
        });


        //------------------------------------------------------------------------------------------------------------------------

        // test update fee
        campaignData = await campaignContract.getCampaignData();

        expect(campaignData.feePercentage).toBe(BigInt(200));  // 2% fee by default

        const adminModifyCampaignFeeResults = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'AdminModifyCampaignFeePercentage',
                campaignId: decodedCampaign!.campaignId,
                advertiser: advertiser.address,
                feePercentage: BigInt(150) // 1.5 %
            }
        );

        expect(adminModifyCampaignFeeResults.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        campaignData = await campaignContract.getCampaignData();

        expect(campaignData.feePercentage).toBe(BigInt(150));  // 1.5% fee after update


        //-------------------------------------------------------------------------------------------

        //RemoveCampaignAndWithdrawFunds

        // first let's replenish again so we have funds to withdraw
        const advertiserReplenishResult2 = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('20'),
            },
            {
                $$type: 'AdvertiserReplenish'
            }
        );

        expect(advertiserReplenishResult2.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });

        expect(advertiserReplenishResult2.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        let advertiserBalanceBeforeRemoveCampaign = fromNano(await advertiser.getBalance());
        if (blockchain.now) blockchain.now = blockchain.now + 81 * (60*60*24); // move 81 days forward in time
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

        let advertiserBalanceAfterRemoveCampaign = fromNano(await advertiser.getBalance());

        // contractBalance before operation
        // test: Advertiser's balance is larger by 'contractBalance before operation'
        // TODO: remove logs
        // logs.push({
        //     type: 'afterRemoveCampaignAndWithdrawFundsResult',
        //     data: `Diff: ${BigInt(advertiserBalanceAfterRemoveCampaign) - BigInt(advertiserBalanceBeforeRemoveCampaign) } Advertiser balance before: ${advertiserBalanceBeforeRemoveCampaign}, Advertiser Balance After: ${advertiserBalanceAfterRemoveCampaign}`
        // });

        //------------------------------------------------------------------------------------

        // Simulate user action -  premium user
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
                logs.push({ type: 'DecodedInsufficientBalanceInCampaign', data: decodedInsufficientBalanceInCampaign });
            }
        }

        expect(decodedInsufficientBalanceInCampaign).not.toBeNull();

        //------------------------------------------------------------------------------------------------------------------------

        // Affiliate3 Withdraw
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
                logs.push({ type: 'AffiliateWithdrawEarningsEvent', data: decodedAffiliate2Withdraw });
            }
        }

        expect(decodedAffiliate2Withdraw).not.toBeNull();

        affiliateData2 = await campaignContract.getAffiliateData(decodedAffiliate2!.affiliateId);

        // test: Affiliate's accrued earnings is now 0
        expect(affiliateData2!.accruedEarnings).toBe(toNano("0"));


        // ----------------------------------------------------------------------------------------

        const adminReplenishMessageResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('50') },
            {
               $$type: "AdminReplenish"
            }
        );

        expect(adminReplenishMessageResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        let balance = await affiliateMarketplaceContract.getBalance();

        let admin1 = await blockchain.treasury('Admin1');
        let admin2 = await blockchain.treasury('Admin2');
        let admin3 = await blockchain.treasury('Admin3');
        let admin4 = await blockchain.treasury('Admin4');

        const wallets = Dictionary.empty<Address, boolean>();
        wallets.set(admin1.address, true);
        wallets.set(admin2.address, true);
        wallets.set(admin3.address, true);
        wallets.set(admin4.address, true);

        // ADMIN withdraw
        const adminWithdrawResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminWithdraw',
                amount: balance - toNano("1"),
                wallets: wallets
            }
        );

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: admin1.address,
            success: true,
        });

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: admin2.address,
            success: true,
        });

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: admin3.address,
            success: true,
        });

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: admin4.address,
            success: true,
        });


        logs.push({
            type: 'afterAdminWithdraw',
            data: `Balance before: ${fromNano(balance)}
                   Balance after: ${fromNano(await affiliateMarketplaceContract.getBalance())}, 
                    admin1: ${fromNano(await admin1.getBalance())},
                    admin2: ${fromNano(await admin2.getBalance())},
                    admin3: ${fromNano(await admin3.getBalance())},
                    admin4: ${fromNano(await admin4.getBalance())}`
        });



        // -------------------------------------------------------------------------------------------------------


        function replacer(key: string, value: any) {
            return typeof value === 'bigint' ? fromNano(value) + ' TON' : value;
        }

        console.log('Final logs:', JSON.stringify(logs, replacer, 2));
    });
});