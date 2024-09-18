import { Blockchain, printTransactionFees, prettyLogTransactions } from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary } from '@ton/core';
import { AffiliateMarketplace, loadCampaignCreatedReply } from '../dist/tact_AffiliateMarketplace';
import { Campaign } from '../dist/tact_Campaign';
import '@ton/test-utils';
import {
    loadAffiliateCreatedEvent,
    loadCampaignCreatedEvent
} from './events';
import { formatCampaignData } from './helpers';

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
    });

    it('should create campaign, add affiliate, and handle user actions with balance logging', async () => {
        // Create campaign
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
                logs.push({ type: 'CampaignCreated', data: decodedCampaign });
            }
        }

        expect(decodedCampaign).not.toBeNull();
        let campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);
        
        // assert deploy tx
        expect(createCampaignResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContractAddress,
            deploy: true,
            success: true,
        });
        
        const campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));
        let campaignData = await campaignContract.getCampaignData();

        logs.push({
            type: 'InitialCampaignBalanceLog',
            data: `Initial Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}`
        });

        // Sign campaign by advertiser
        const regularUsersMap = Dictionary.empty<bigint, bigint>();
        const premiumUsersMap = Dictionary.empty<bigint, bigint>();
        regularUsersMap.set(BigInt(USER_CLICK), toNano('1'));  
        premiumUsersMap.set(BigInt(USER_CLICK), toNano('2'));

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

        // replenish
        const advertiserReplenishResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('50'),
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

        logs.push({
            type: 'advertiserReplenishBalanceLog',
            data: `Advertser Replenish Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}`
        });

        // Add affiliate
        const createAffiliateResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.1') },
            { $$type: 'CreateNewAffiliate' }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: affiliate.address,
            to: campaignContract.address,
            success: true,
        });

        // bot listens to event on affiliate marketplace contract
        let decodedAffiliate: any | null = null
        for (const external of createAffiliateResult.externals) {
            if (external.body) {
                decodedAffiliate = loadAffiliateCreatedEvent(external.body);
                logs.push({ type: 'AffiliateCreated', data: decodedAffiliate });
            }
        }

        expect(decodedAffiliate).not.toBeNull();

        campaignData = await campaignContract.getCampaignData();
        let affiliateData : any | null = await campaignContract.getAffiliateData(decodedAffiliate!.affiliateId);
        affiliateAccruedBalance = affiliateData!.accruedEarnings;

        logs.push({
            type: 'beforeUserActionBalanceLog',
            data: `Before User Action Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}, Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}`
        });

        // Simulate user action
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
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true,
        });

        campaignData = await campaignContract.getCampaignData();
        affiliateData = await campaignContract.getAffiliateData(decodedAffiliate!.affiliateId);

        logs.push({
            type: 'afterUserActionBalanceLog',
            data: `After User Action Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}, Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}, Affiliate Balance: ${await affiliate.getBalance()}`
        });

        // Affiliate withdraws earnings
        const affiliateWithdrawResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateWithdrawEarnings', affiliateId: decodedAffiliate!.affiliateId }
        );

        expect(affiliateWithdrawResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliate.address,
            success: true,
        });

        campaignData = await campaignContract.getCampaignData();
        affiliateData = await campaignContract.getAffiliateData(decodedAffiliate!.affiliateId);

        logs.push({
            type: 'afterAffiliateWithdrawLog',
            data: `After Affiliate Withdraw Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}, Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}, Affiliate Balance: ${await affiliate.getBalance()}`
        });

        // Log final results
        logs.push({
            type: 'FinalCampaignData',
            data: await formatCampaignData(await campaignContract.getCampaignData())
        });

        logs.push({
            type: 'FinalAffiliateBalance',
            data: fromNano(await affiliate.getBalance()) + " TON"
        });

        function replacer(key: string, value: any) {
            return typeof value === 'bigint' ? fromNano(value) + ' TON' : value;
        }

        console.log('Final logs:', JSON.stringify(logs, replacer, 2));
    });
});
