import { Blockchain, printTransactionFees, prettyLogTransactions } from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary } from '@ton/core';
import { AffiliateMarketplace, loadCampaignCreatedReply } from '../dist/tact_AffiliateMarketplace';
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
            { value: toNano('0.15') },
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
        // assert: contractBalance = 0
        logs.push({
            type: 'InitialCampaignBalanceLog',
            data: `Initial Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}`
        });

        // Advertiser Sign
        const regularUsersMap = Dictionary.empty<bigint, bigint>();
        const premiumUsersMap = Dictionary.empty<bigint, bigint>();
        regularUsersMap.set(BigInt(USER_CLICK), toNano('1'));  
        premiumUsersMap.set(BigInt(USER_CLICK), toNano('15'));

        const advertiserSignedResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'AdvertiserSigned',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsers: regularUsersMap,
                    premiumUsers: premiumUsersMap,
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

        // test: campaignData.campaignDetails have same values as set in request
        logs.push({
            type: 'advertiserSigned',
            data: `Advertser Signed: Regular User Click ${fromNano(regularUsersMap.get(BigInt(USER_CLICK)))} TON, Premium User Click: ${fromNano(premiumUsersMap.get(BigInt(USER_CLICK)))} TON`
        });

        // --------------------------------------------------------------------------------------------------------

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

        expect(decodedAdvertiserReplenish).not.toBeNull();

        campaignData = await campaignContract.getCampaignData();
        
        // 20 TON were sent to the campaign contract
        // 2% fee go to parent - 0.4 TON
        // test: contractBalance = 20 - 0.4 TON
        // test: campaignBalance = 20 - 2.4 TON (2 TON used as buffer and 0.4 were sent to parent)
        // test: AffiliateMarketplace balance is now 0.4 larger than it was before this replnishment
        logs.push({
            type: 'advertiserReplenishBalanceLog',
            data: `Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}`
        });

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

        // ------------------------------------------------------------------------------------------

        // User Action - Regular user
        logs.push({
            type: 'beforeUserActionBalanceLog',
            data: `Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}, Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}`
        });

        // Simulate user action -  regular user
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

        // Campaign Balance holds 17.6 TON (20 - 2.4 TON) before user action.
        // 1 TON goes to affiliate's accrued balance 
        // 2*AVG_GAS_PARICE = 0.005*2 = 0.01 TON goes to Parent 
        // test: campaignBalance = 1.01 less than it was before this user action
        // test: contractBalance = 0.01 TON less than it was (only fee goes to parent - all other TON were kept within the contract)
        // test: AffiliateMarketplace balance is now 0.01 TON larger than it was before this user action
        // test Affiliate's accruedBalance = 1 
        logs.push({
            type: 'afterUserActionBalanceAndBeforePremiumUserActionLog',
            data: `Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}}`
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
            data: `After User Action Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}, Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}}`
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
