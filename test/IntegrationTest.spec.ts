import { Blockchain, printTransactionFees, prettyLogTransactions } from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary } from '@ton/core';
import { AffiliateMarketplace } from '../dist/tact_AffiliateMarketplace';
import { Campaign } from '../dist/tact_Campaign';
import '@ton/test-utils';
import {
    loadAffiliateCreatedEvent,
    loadCampaignCreatedEvent,
    loadAffiliateWithdrawEarningsEvent,
    loadAdvertiserReplenisEvent,
    loadCampaignUnderThresholdEvent,
    loadCampaignRemovedEvent
} from './events';

type EmitLogEvent = {
    type: string;
    data: any;
};

const logs: EmitLogEvent[] = [];

describe('AffiliateMarketplace Integration Test', () => {
    let blockchain;
    let affiliateMarketplaceContract;
    let deployer;
    let bot;
    let advertiser;
    let affiliate;

    let USER_CLICK = 0;
    let ADVERTISER_CUSTOMIZED_EVENT = 20

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        bot = await blockchain.treasury('bot');
        advertiser = await blockchain.treasury('advertiser');
        affiliate = await blockchain.treasury('affiliate');

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

        blockchain.now = deployResult.transactions[1].now;
    });

    it('should create campaign, add affiliate, and handle user actions with balance logging', async () => {
        
        // 1. Create campaign
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

        // Advertiser Sign
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        const premiumUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();

        regularUsersMapCostPerActionMap.set(BigInt(USER_CLICK), toNano('1'));
        regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_CUSTOMIZED_EVENT), toNano('2'));

        premiumUsersMapCostPerActionMap.set(BigInt(USER_CLICK), toNano('15'));
        premiumUsersMapCostPerActionMap.set(BigInt(ADVERTISER_CUSTOMIZED_EVENT), toNano('20'));

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

        expect(fromNano(regularUsersMapCostPerActionMap.get(BigInt(USER_CLICK)))).toBe(
            fromNano(campaignData.campaignDetails.regularUsersCostPerAction.get(BigInt(USER_CLICK)))
        );

        expect(fromNano(regularUsersMapCostPerActionMap.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT)))).toBe(
            fromNano(campaignData.campaignDetails.regularUsersCostPerAction.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT)))
        );

        expect(fromNano(premiumUsersMapCostPerActionMap.get(BigInt(USER_CLICK)))).toBe(
            fromNano(campaignData.campaignDetails.premiumUsersCostPerAction.get(BigInt(USER_CLICK)))
        );

        expect(fromNano(premiumUsersMapCostPerActionMap.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT)))).toBe(
            fromNano(campaignData.campaignDetails.premiumUsersCostPerAction.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT)))
        );

        // test: campaignData.campaignDetails have same values as set in request
        logs.push({
            type: 'advertiserSigned',
            data: `Advertser Signed: 
                Regular User Click ${fromNano(regularUsersMapCostPerActionMap.get(BigInt(USER_CLICK)))} TON,
                Premium User Click: ${fromNano(premiumUsersMapCostPerActionMap.get(BigInt(USER_CLICK)))} TON,
                Regular Advertiser Customized Event: ${fromNano(regularUsersMapCostPerActionMap.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT)))} TON
                Premium Advertiser Customized Event: ${fromNano(regularUsersMapCostPerActionMap.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT)))} TON`
        });

        // --------------------------------------------------------------------------------------------------------

        let affiliateMarketplaceBalanceBeforeReplenish = await affiliateMarketplaceContract.getBalance();

        // AdvertiserReplenish
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
        
        // test: contractBalance = (20 - 0.4) + prevBalance which is less than 0.1
        expect(campaignData.contractBalance).toBeLessThan(toNano("19.7"));
        expect(campaignData.contractBalance).toBeGreaterThan(toNano("19.6"));

        // test: campaignBalance = 1 TON less due to buffer
        expect(campaignData.campaignBalance).toBeLessThan(toNano("18.7"));
        expect(campaignData.campaignBalance).toBeGreaterThan(toNano("18.6"))
        
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

        // CreateNewAffiliate
        const createAffiliateResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.05') },
            { $$type: 'CreateNewAffiliate' }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: affiliate.address,
            to: campaignContract.address,
            success: true,
        });

        let decodedAffiliate: any | null = null
        for (const external of createAffiliateResult.externals) {
            if (external.body) {
                decodedAffiliate = loadAffiliateCreatedEvent(external.body);
                logs.push({ type: 'AffiliateCreatedEvent', data: decodedAffiliate });
            }
        }

        expect(decodedAffiliate).not.toBeNull();

        campaignData = await campaignContract.getCampaignData();
        let affiliateData : any | null = await campaignContract.getAffiliateData(decodedAffiliate!.affiliateId);
        affiliateAccruedBalance = affiliateData!.accruedEarnings;
        
         // test: affiliate's accrued balance is 0 (no user actions yet)
         expect(affiliateAccruedBalance).toBe(toNano("0"));

         // expect stats to be 0
         userActionsStats = affiliateData!.userActionsStats;
         expect(userActionsStats.get(BigInt(USER_CLICK))).toBe(BigInt(0));
         expect(userActionsStats.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT))).toBe(BigInt(0));

         premiumUserActionsStats = affiliateData!.premiumUserActionsStats;
         expect(premiumUserActionsStats.get(BigInt(USER_CLICK))).toBe(BigInt(0));
         expect(premiumUserActionsStats.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT))).toBe(BigInt(0));

        // ------------------------------------------------------------------------------------------

        let campaignDataBeforeUserAction = await campaignContract.getCampaignData();

        // User Action - Regular user      
        const userActionResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'UserAction',
                campaignId: decodedCampaign!.campaignId,
                affiliateId: decodedAffiliate!.affiliateId,
                advertiser: advertiser.address,
                userAction: USER_CLICK,
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
        affiliateData = await campaignContract.getAffiliateData(decodedAffiliate!.affiliateId);
        
        // test: contractBalance = 0.01  + gas fees TON less than it was (only fee goes to parent - all other TON were kept within the contract)
        expect(campaignDataBeforeUserAction.contractBalance - campaignData.contractBalance)
            .toBeLessThan(toNano("0.025"));

        // test: campaignBalance = 1.01 less than it was before this user action
        expect(campaignDataBeforeUserAction.campaignBalance - campaignData.campaignBalance)
            .toBeGreaterThan(toNano("1"));

        expect(campaignDataBeforeUserAction.campaignBalance - campaignData.campaignBalance)
            .toBeLessThan(toNano("1.03"));

        // test Affiliate's accruedBalance = 1 
        expect(affiliateData!.accruedEarnings).toBe(toNano("1"));

         // expect stats to be 0
         userActionsStats = affiliateData!.userActionsStats;
         expect(userActionsStats.get(BigInt(USER_CLICK))).toBe(BigInt(1));
         expect(userActionsStats.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT))).toBe(BigInt(0));

         premiumUserActionsStats = affiliateData!.premiumUserActionsStats;
         expect(premiumUserActionsStats.get(BigInt(USER_CLICK))).toBe(BigInt(0));
         expect(premiumUserActionsStats.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT))).toBe(BigInt(0));
        
        
        // test: AffiliateMarketplace balance is now 0.01 TON larger than it was before this user action
        
        logs.push({
            type: 'afterUserActionBalanceAndBeforePremiumUserActionLog',
            data: `Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)},
             Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}, Affiliate Stats: ${affiliateData!.userActionsStats.get(BigInt(USER_CLICK)!)}}`
        });

        // ------------------------------------------------------------------------------------------

         // Simulate user action -  premium user
        const premiumUserActionResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'UserAction',
                campaignId: decodedCampaign!.campaignId,
                affiliateId: decodedAffiliate!.affiliateId,
                advertiser: advertiser.address,
                userAction: USER_CLICK,
                isPremiumUser: true,
            }
        );

        expect(premiumUserActionResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true,
        });

        expect(premiumUserActionResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        // event is triggered due to balance being under threshold
        let decodedCampaignUnderThreshold: any | null = null
        for (const external of premiumUserActionResult.externals) {
            if (external.body) {
                decodedCampaignUnderThreshold = loadCampaignUnderThresholdEvent(external.body);
            }
        }

        expect(decodedCampaignUnderThreshold).not.toBeNull();

        campaignData = await campaignContract.getCampaignData();
        affiliateData = await campaignContract.getAffiliateData(decodedAffiliate!.affiliateId);

        // Campaign Balance holds 16.59 TON (20 - 2.4 - 1.01 TON) before user action.
        // 15 TON goes to affiliate's accrued balance 
        // 2*AVG_GAS_PARICE = 0.005*2 = 0.01 TON goes to Parent
        // after action: 
        // test: campaignBalance = 15.01 less than it was before this user action
        // test: contractBalance = 0.01 TON less than it was (only fee goes to parent - all other TON were kept within the contract)
        // test: AffiliateMarketplace balance is now 0.01 TON larger than it was before this user action
        // test: Affiliate's accrued earnings is now 16 (was before 1)
        logs.push({
            type: 'afterPremiumUserActionBalanceLog',
            data: `After User Action Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}, 
            Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}, Affiliate Stats: ${affiliateData!.userActionsStats.get(BigInt(USER_CLICK)!)}}`
        });

        logs.push({ type: 'DecodedCampaignUnderThresholdEvent', data: decodedCampaignUnderThreshold });


        //-------------------------------------------------------------------------------------------

        let beforeWithdrawAffiliateBalance = fromNano(await affiliate.getBalance());

        // AffiliateWithdrawResult
        const affiliateWithdrawResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateWithdrawEarnings', affiliateId: decodedAffiliate!.affiliateId }
        );

        expect(affiliateWithdrawResult.transactions).toHaveTransaction({
            from: affiliate.address,
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
            to: affiliate.address,
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
        affiliateData = await campaignContract.getAffiliateData(decodedAffiliate!.affiliateId);

        // Campaign Balance holds 1.58 TON (16.59 - 15.01 TON) before affiliate withdraw.
        // Affiliate's accrued earnings are 16 TON
        // 2% fee from 16 TON will go to parent (0.32 TON) 
        // after action: 
        // test: campaignBalance = dos not change
        // test: contractBalance = 16 TON less than it was before
        // test: AffiliateMarketplace balance is now 0.32 TON larger than it was before this affiliate withdraw
        // test: Affiliate's accrued earnings is now 0
        // test: Affiliate's balance is 15.68 (16 - 0.32)
        logs.push({
            type: 'afterAffiliateWithdrawLog',
            data: `Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}, Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}, Before: Affiliate Balance: ${beforeWithdrawAffiliateBalance}, After: Affiliate Balance: ${fromNano(await affiliate.getBalance())}`
        });

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

        blockchain.now += 81 * (60*60*24); // move 81 days forward in time
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
        logs.push({
            type: 'afterRemoveCampaignAndWithdrawFundsResult',
            data: `Diff: ${advertiserBalanceAfterRemoveCampaign - advertiserBalanceBeforeRemoveCampaign } Advertiser balance before: ${advertiserBalanceBeforeRemoveCampaign}, Advertiser Balance After: ${advertiserBalanceAfterRemoveCampaign}`
        });

        //------------------------------------------------------------------------------------

        // to avoid further gas fees, let's see if the campaign contract is destroyed successfully if insufficient funds occur
        // user action which leads to campaign being destroyied
        // Simulate user action -  premium user
        const premiumUserActionResult2 = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'UserAction',
                campaignId: decodedCampaign!.campaignId,
                affiliateId: decodedAffiliate!.affiliateId,
                advertiser: advertiser.address,
                userAction: USER_CLICK,
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

        // event is triggered due to balance being under threshold
        let decodedInsufficientBalanceInCampaign: any | null = null
        for (const external of premiumUserActionResult2.externals) {
            if (external.body) {
                decodedInsufficientBalanceInCampaign = loadCampaignRemovedEvent(external.body);
                logs.push({ type: 'DecodedInsufficientBalanceInCampaign', data: decodedInsufficientBalanceInCampaign });
            }
        }

        expect(decodedInsufficientBalanceInCampaign).not.toBeNull();

        try {
            // contract should have been removed, hence any get request now should fail
            campaignData = await campaignContract.getCampaignData();
        } catch (e:Exception) {
            expect(e.toString()).toContain("Error: Trying to run get method on non-active contract");
        }
        // -------------------------------------------------------------------------------------------------------
        

        // TODO - ADMIN withdraw
        // TODO - advvertiser verifies tx (not parent)

        function replacer(key: string, value: any) {
            return typeof value === 'bigint' ? fromNano(value) + ' TON' : value;
        }

        console.log('Final logs:', JSON.stringify(logs, replacer, 2));
    });
});
