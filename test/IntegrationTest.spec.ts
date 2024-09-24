import { Blockchain, printTransactionFees, prettyLogTransactions } from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary } from '@ton/core';
import { AffiliateMarketplace } from '../dist/tact_AffiliateMarketplace';
import { Campaign } from '../dist/tact_Campaign';
import '@ton/test-utils';
// import {
//     loadAffiliateCreatedEvent,
//     loadCampaignCreatedEvent,
//     loadAffiliateWithdrawEarningsEvent,
//     loadAdvertiserReplenisEvent,
//     loadCampaignUnderThresholdEvent,
//     loadCampaignRemovedEvent
// } from './events';

// Event types from the ABI
const EVENT_TYPE_CAMPAIGN_CREATED = 2452245169; 
const EVENT_TYPE_AFFILIATE_CREATED = 3273123323; 
const EVENT_TYPE_AFFILIATE_WITHDRAW_EARNINGS = 1950324544; 
const EVENT_TYPE_ADVERTISER_REPLENISH = 738147066;
const EVENT_TYPE_CAMPAIGN_BALANCE_UNDER_THRESHOLD = 859219313;
const EVENT_TYPE_CAMPAIGN_REMOVED = 88274163;

function loadEvent(cell: Cell, expectedEventType: number) {
    const slice = cell.beginParse();
    const eventType = slice.loadUint(32);
    if (eventType !== expectedEventType) {
        throw new Error("Unexpected event type. Expected - " + expectedEventType + ", actual: " + eventType);
    }
    return slice;
}

function loadCampaignUnderThresholdEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_CAMPAIGN_BALANCE_UNDER_THRESHOLD);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const campaginBalance = slice.loadCoins();
    return { $$type: 'CampaignBalnceUnderThresholdEvent', campaignId, advertiserAddressStr, campaginBalance };
}

function loadCampaignRemovedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_CAMPAIGN_REMOVED);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const campaginBalance = slice.loadCoins();
    const contractBalance = slice.loadCoins();
    return { $$type: 'CampaignRemovedEvent', campaignId, advertiserAddressStr, campaginBalance, contractBalance };
}


function loadCampaignCreatedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_CAMPAIGN_CREATED);
    const campaignId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    const campaignContractAddressStr = slice.loadAddress().toString();
    return { $$type: 'CampaignCreatedEvent', campaignId, advertiser, campaignContractAddressStr };
}

function loadAffiliateCreatedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_AFFILIATE_CREATED);
    const campaignId = slice.loadUint(32);
    const affiliateId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const affiliateAddressStr = slice.loadAddress().toString();
    return { $$type: 'AffiliateCreatedEvent', campaignId, affiliateId, advertiserAddressStr, affiliateAddressStr };
}

function  loadAffiliateWithdrawEarningsEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_AFFILIATE_WITHDRAW_EARNINGS);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const affiliateId = slice.loadUint(32);
    const earnings = slice.loadCoins();
    return { $$type: 'AffiliateWithdrawEarningsEvent', campaignId, affiliateId, advertiserAddressStr, earnings };
}

function  loadAdvertiserReplenisEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_ADVERTISER_REPLENISH);
    const campaignId = slice.loadUint(32);
    const advertiserAddressStr = slice.loadAddress().toString();
    const replenishAmount = slice.loadCoins();
    const fee = slice.loadCoins();
    return { $$type: 'AdvertiserReplenisEvent', campaignId, advertiserAddressStr, replenishAmount, fee };
}

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
    let ADVERTISER_CUSTOMIZED_EVENT = 21

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
        premiumUsersMapCostPerActionMap.set(BigInt(ADVERTISER_CUSTOMIZED_EVENT), toNano('15'));

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
                userActionOpCode: USER_CLICK,
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

         userActionsStats = affiliateData!.userActionsStats;
         expect(userActionsStats.get(BigInt(USER_CLICK))).toBe(BigInt(1));
         expect(userActionsStats.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT))).toBe(BigInt(0));

         premiumUserActionsStats = affiliateData!.premiumUserActionsStats;
         expect(premiumUserActionsStats.get(BigInt(USER_CLICK))).toBe(BigInt(0));
         expect(premiumUserActionsStats.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT))).toBe(BigInt(0));
                
        logs.push({
            type: 'afterUserActionBalanceAndBeforePremiumUserActionLog',
            data: `Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)},
             Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}, Affiliate Stats: ${affiliateData!.userActionsStats.get(BigInt(USER_CLICK)!)}}`
        });

        // ------------------------------------------------------------------------------------------

        campaignDataBeforeAffiliateEvent = await campaignContract.getCampaignData();
        affiliateDataBeforeAffiliateEvent = await campaignContract.getAffiliateData(decodedAffiliate!.affiliateId);

         // Simulate user action -  premium user from the advertiser directly to the campaign contract
        const premiumUserActionResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AffiliateUserAction',                
                affiliateId: decodedAffiliate!.affiliateId,
                userActionOpCode: ADVERTISER_CUSTOMIZED_EVENT,
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

        // event is triggered due to balance being under threshold after user action
        let decodedCampaignUnderThreshold: any | null = null
        for (const external of premiumUserActionResult.externals) {
            if (external.body) {
                decodedCampaignUnderThreshold = loadCampaignUnderThresholdEvent(external.body);
            }
        }

        expect(decodedCampaignUnderThreshold).not.toBeNull();

        campaignData = await campaignContract.getCampaignData();
        affiliateData = await campaignContract.getAffiliateData(decodedAffiliate!.affiliateId);

        // test: contractBalance = 0.01  + gas fees TON less than it was (only fee goes to parent - all other TON were kept within the contract)
        expect(campaignDataBeforeAffiliateEvent.contractBalance - campaignData.contractBalance)
            .toBeLessThan(toNano("0.025"));

        // test: campaignBalance = 15 less than it was before this user action
        // It is exactly 15 because there are no gas fees to pay to the parent contract
        // since the gas fees for this event was paid for by the advertiser
        expect(campaignDataBeforeAffiliateEvent.campaignBalance - campaignData.campaignBalance)
            .toBe(toNano("15"));

        userActionsStats = affiliateData!.userActionsStats;
        expect(userActionsStats.get(BigInt(USER_CLICK))).toBe(BigInt(1));
        expect(userActionsStats.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT))).toBe(BigInt(0));

        premiumUserActionsStats = affiliateData!.premiumUserActionsStats;
        expect(premiumUserActionsStats.get(BigInt(USER_CLICK))).toBe(BigInt(0));
        expect(premiumUserActionsStats.get(BigInt(ADVERTISER_CUSTOMIZED_EVENT))).toBe(BigInt(1));

        // test: Affiliate's accrued earnings is now 16 (was before 1)
        expect(affiliateData!.accruedEarnings).toBe(toNano("16"));
        
        logs.push({
            type: 'afterPremiumUserActionBalanceLog',
            data: `After User Action Campaign Balance: ${fromNano(campaignData.campaignBalance)}, Contract Balance: ${fromNano(campaignData.contractBalance)}, 
            Affiliate Accrued Earnings: ${fromNano(affiliateData!.accruedEarnings)}, Affiliate Stats: ${affiliateData!.userActionsStats.get(BigInt(USER_CLICK)!)}}`
        });

        logs.push({ type: 'DecodedCampaignUnderThresholdEvent', data: decodedCampaignUnderThreshold });


        //-------------------------------------------------------------------------------------------

        let beforeWithdrawAffiliateBalance = await affiliate.getBalance();
        campaignDataBeforeAffiliateWithdraw = await campaignContract.getCampaignData();

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

        // test: Affiliate's accrued earnings is now 0
        expect(affiliateData!.accruedEarnings).toBe(toNano("0"));

        // test: Affiliates earnings 16
        // 2% fee = 0.32
        // affiliate compensation = 16-0.32 = 15.68 TON (minu gas fees that affiliate paid for) 
        let affiliateBalance = await affiliate.getBalance();
        
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

        // ----------------------------------------------------------------------------------------

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
                feePercentage: 150 // 1.5 %
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

        // Simulate user action -  premium user
        const premiumUserActionResult2 = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'UserAction',
                campaignId: decodedCampaign!.campaignId,
                affiliateId: decodedAffiliate!.affiliateId,
                advertiser: advertiser.address,
                userActionOpCode: USER_CLICK,
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
        
        const adminReplenishMessageResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('50') }
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

        const wallets = Dictionary.empty<Address, bool>();
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
