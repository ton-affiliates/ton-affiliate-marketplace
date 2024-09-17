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

        logs.push({
            type: 'AffiliateMarketplaceDeployed',
            data: { deployerBalance: fromNano(await deployer.getBalance()) + " TON" }
        });
    });

    it('should create campaign, add affiliate, and handle user actions with balance logging', async () => {
        // Create campaign
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            { value: toNano('250') },
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
        let campaignContractAddressStr: string = decodedCampaign!.campaignContractAddressStr;
        const campaignContract = blockchain.openContract(await Campaign.fromAddress(Address.parse(campaignContractAddressStr)));

        // Sign campaign by advertiser
        const regularUsersMap = Dictionary.empty<bigint, bigint>();
        const premiumUsersMap = Dictionary.empty<bigint, bigint>();
        regularUsersMap.set(BigInt(USER_CLICK), toNano('0.1'));
        premiumUsersMap.set(BigInt(USER_CLICK), toNano('0.2'));

        const advertiserSignedResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('50'),
            },
            {
                $$type: 'AdvertiserSigned',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsers: regularUsersMap,
                    premiumUsers: premiumUsersMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
                    isOpenCampaign: true,
                    daysWithoutUserActionForWithdrawFunds: 30n,
                }
            }
        );

        expect(advertiserSignedResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });

        const campaignData = await campaignContract.getCampaignData();

        // Log campaign and contract balances
        const initialCampaignBalance = campaignData.campaignBalance;
        const initialContractBalance = campaignData.contractBalance;

        console.log(`Initial Campaign Balance: ${fromNano(initialCampaignBalance)} TON`);
        console.log(`Initial Contract Balance: ${fromNano(initialContractBalance)} TON`);

        logs.push({
            type: 'InitialCampaignBalanceLog',
            data: `Initial Campaign Balance: ${fromNano(initialCampaignBalance)}, Contract Balance: ${fromNano(initialContractBalance)}`
        });

        // Add affiliate
        const createAffiliateResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('1') },
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
                logs.push({ type: 'AffiliateCreated', data: decodedAffiliate });
            }
        }

        expect(decodedAffiliate).not.toBeNull();

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

        const postUserActionCampaignData = await campaignContract.getCampaignData();

        // Log balances after user action
        console.log(`Campaign Balance After User Click: ${fromNano(postUserActionCampaignData.campaignBalance)} TON`);
        console.log(`Contract Balance After User Click: ${fromNano(postUserActionCampaignData.contractBalance)} TON`);

        logs.push({
            type: 'PostUserActionCampaignBalanceLog',
            data: `Campaign Balance After User Click: ${fromNano(postUserActionCampaignData.campaignBalance)}, Contract Balance After User Click: ${fromNano(postUserActionCampaignData.contractBalance)}`
        });

        // Affiliate withdraws earnings
        const affiliateWithdrawResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.1') },
            { $$type: 'AffiliateWithdrawEarnings', affiliateId: 0 }
        );

        expect(affiliateWithdrawResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliate.address,
            success: true,
        });

        const postWithdrawCampaignData = await campaignContract.getCampaignData();

        // Log balances after affiliate withdraw
        console.log(`Campaign Balance After Withdraw: ${fromNano(postWithdrawCampaignData.campaignBalance)} TON`);
        console.log(`Contract Balance After Withdraw: ${fromNano(postWithdrawCampaignData.contractBalance)} TON`);

        logs.push({
            type: 'PostWithdrawCampaignBalanceLog',
            data: `Campaign Balance After Withdraw: ${fromNano(postWithdrawCampaignData.campaignBalance)}, Contract Balance After Withdraw: ${fromNano(postWithdrawCampaignData.contractBalance)}`
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
