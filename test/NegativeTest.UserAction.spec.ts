// Import necessary modules and utilities from @ton/sandbox, @ton/core, and other dependencies
import { Blockchain, printTransactionFees, prettyLogTransactions } from '@ton/sandbox';
import { toNano, Address, Dictionary } from '@ton/core';
import { AffiliateMarketplace } from '../dist/tact_AffiliateMarketplace';
import { Campaign } from '../dist/tact_Campaign';
import '@ton/test-utils'; // Ensure this utility is correctly set up for testing

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: AffiliateMarketplace;
let deployer, bot, advertiser, affiliate1;
const BOT_OP_CODE_USER_CLICK = 0;
const ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = 21;

const EVENT_TYPE_CAMPAIGN_CREATED = 2452245169;

// Helper function to load and parse the CampaignCreatedEvent (update as per the event's actual structure)
function loadCampaignCreatedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_CAMPAIGN_CREATED); // Adjust according to your event parsing function
    const campaignId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    const campaignContractAddressStr = slice.loadAddress().toString();
    return { $$type: 'CampaignCreatedEvent', campaignId, advertiser, campaignContractAddressStr };
}

function loadEvent(cell: Cell, expectedEventType: number) {
    const slice = cell.beginParse();
    const eventType = slice.loadUint(32);
    if (eventType !== expectedEventType) {
        throw new Error("Unexpected event type. Expected - " + expectedEventType + ", actual: " + eventType);
    }
    return slice;
}

beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate1 = await blockchain.treasury('affiliate1');

    // Deploy AffiliateMarketplace contract
    affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address));
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

    // Deploy a new Campaign contract through the AffiliateMarketplace
    const createCampaignResult = await affiliateMarketplaceContract.send(
        advertiser.getSender(),
        { value: toNano('0.13') }, // Sufficient funds to deploy the campaign
        { $$type: 'CreateCampaign' }
    );

    expect(createCampaignResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: affiliateMarketplaceContract.address,
        success: true,
    });

    // Retrieve the deployed Campaign contract address from the emitted event
    let decodedCampaign: any | null = null;
    for (const external of createCampaignResult.externals) {
        if (external.body) {
            decodedCampaign = loadCampaignCreatedEvent(external.body); // Assuming loadCampaignCreatedEvent parses the event correctly
        }
    }
    expect(decodedCampaign).not.toBeNull();

    const campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);
    campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));

    const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
    regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('0.1')); 
    regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('1')); 

    const allowedAffiliates = Dictionary.empty<Address, boolean>();
    allowedAffiliates.set(affiliate1.address, true);

    const setCampaignDetailsResult = await campaignContract.send(
        advertiser.getSender(),
        { value: toNano('0.05') },
        {
            $$type: 'AdvertiserSigned',
            campaignDetails: {
                $$type: 'CampaignDetails',
                regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                premiumUsersCostPerAction: Dictionary.empty<bigint, bigint>(),
                allowedAffiliates: allowedAffiliates,
                isOpenCampaign: false,
                daysWithoutUserActionForWithdrawFunds: 21n,
            }
        }
    );

    expect(setCampaignDetailsResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: campaignContract.address,
        success: true
    });

    const createAffiliateResult = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            { $$type: 'CreateNewAffiliate' }
        );

    expect(createAffiliateResult.transactions).toHaveTransaction({
        from: affiliate1.address,
        to: campaignContract.address,
        success: true, 
    });
});


describe('Negative Tests for User Actions', () => {

 
     it('should fail to perform user actions from an unauthorized verifier', async () => {

        // Attempt by the bot to verify an action that should be verified by the advertiser
        const botUnauthorizedUserAction = await campaignContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AffiliateUserAction',
                affiliateId: 0n,
                userActionOpCode: BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), // Requires advertiser, not bot
                isPremiumUser: false,
            }
        );

        expect(botUnauthorizedUserAction.transactions).toHaveTransaction({
            from: bot.address,
            to: campaignContract.address,
            success: false, // Unauthorized bot action
        });

        // Attempt by the advertiser to verify an action that should be verified by the bot
        const advertiserUnauthorizedUserAction = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AffiliateUserAction',
                affiliateId: 0n,
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK), // Requires bot, not advertiser
                isPremiumUser: false,
            }
        );

        expect(advertiserUnauthorizedUserAction.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false, // Unauthorized advertiser action
        });
    });

    it('should fail to send a user action with an invalid op code', async () => {
        
        const invalidOpCodeResult = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AffiliateUserAction',
                affiliateId: 0n,
                userActionOpCode: BigInt(999), // Invalid op code not defined in campaign
                isPremiumUser: false,
            }
        );

        expect(invalidOpCodeResult.transactions).toHaveTransaction({
            from: affiliate1.address,
            to: campaignContract.address,
            success: false, // Invalid op code
        });
    });

});
