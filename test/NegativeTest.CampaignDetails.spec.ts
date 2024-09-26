// Import necessary modules and utilities from @ton/sandbox, @ton/core, and other dependencies
import { Blockchain, printTransactionFees, prettyLogTransactions } from '@ton/sandbox';
import { toNano, Address, Dictionary } from '@ton/core';
import { AffiliateMarketplace } from '../dist/tact_AffiliateMarketplace';
import { Campaign } from '../dist/tact_Campaign';
import '@ton/test-utils'; // Ensure this utility is correctly set up for testing

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: AffiliateMarketplace;
let deployer, bot, advertiser, affiliate1, affiliate2;


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

    blockchain.now = deployResult.transactions[1].now;

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
});


describe('Negative Tests for Campaign Details of Contract', () => {

    it('should fail to set user actions with daysWithoutUserActionForWithdrawFunds below the minimum allowed', async () => {
        
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(0), toNano('0.1')); 

        const setCampaignDetailsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserSigned',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: Dictionary.empty<bigint, bigint>(),
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
                    isOpenCampaign: true,
                    daysWithoutUserActionForWithdrawFunds: 1n,  // below MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS
                }
            }
        );

        expect(setCampaignDetailsResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false, // Expected failure due to daysWithoutUserActionForWithdrawFunds below minimum
        });
    });

    it('should fail to set user actions with CPA below the minimum allowed', async () => {
        
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(0), toNano('0.005')); // Below MIN_COST_PER_USER_ACTION

        const setCampaignDetailsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserSigned',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: Dictionary.empty<bigint, bigint>(),
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
                    isOpenCampaign: true,
                    daysWithoutUserActionForWithdrawFunds: 21n,
                }
            }
        );

        expect(setCampaignDetailsResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false, // Expected failure due to CPA below minimum
        });
    });

     it('should fail to replenish before setting campaign details', async () => {

        const replenishResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('30') }, 
            { $$type: 'AdvertiserReplenish' }
        );

        expect(replenishResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false, // failed due to 'state' in contract. Advertiser must set details prior to replenishing
        });
    });
});
