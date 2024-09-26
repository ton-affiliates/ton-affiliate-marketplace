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
    unauthorizedUser = await blockchain.treasury('unauthorizedUser');

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
});

describe('Administrative Actions - Negative Tests for AffiliateMarketplace Contract Admin functions', () => {

    // Test: Unauthorized Administrative Fee Updates
    it('should fail when a non-owner tries to update the campaign fee percentage', async () => {
        const adminModifyCampaignFeeResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminModifyCampaignFeePercentage',
                campaignId: 0, // Assuming campaignId is 0 for simplicity; adjust as needed
                advertiser: advertiser.address,
                feePercentage: 150, // 1.5%
            }
        );

        expect(adminModifyCampaignFeeResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, // Expected failure due to unauthorized access
        });
    });

    // Test: Invalid Withdrawal Amounts by Admin
    it('should fail when the admin tries to withdraw more than available balance or violates the buffer requirement', async () => {
        
        // Add funds to the contract for testing
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

        // Attempt to withdraw an invalid amount that exceeds the available balance
        const adminWithdrawResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminWithdraw',
                amount: toNano('60'), // Amount exceeds the available balance
                wallets: Dictionary.empty<Address, boolean>().set(deployer.address, true),
            }
        );

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: false, // Expected failure due to exceeding available balance
        });

        // Attempt to withdraw a valid amount but violating buffer requirement
        const bufferViolationWithdrawResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminWithdraw',
                amount: toNano('49.5'), // Violate the buffer requirement
                wallets: Dictionary.empty<Address, boolean>().set(deployer.address, true),
            }
        );

        expect(bufferViolationWithdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: false, // Expected failure due to buffer requirement violation
        });
    });

    // Test: Unauthorized Administrative Withdrawals
    it('should fail when a non-owner tries to perform withdrawals', async () => {
        // Attempt to withdraw funds from the contract using an unauthorized user
        const unauthorizedWithdrawResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminWithdraw',
                amount: toNano('10'),
                wallets: Dictionary.empty<Address, boolean>().set(deployer.address, true),
            }
        );

        expect(unauthorizedWithdrawResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, // Expected failure due to unauthorized access
        });
    });

    // Test: Improper Admin Replenishment
    it('should fail when an unauthorized sender attempts to perform admin-level replenishment', async () => {
        const adminReplenishResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('10') },
            { $$type: 'AdminReplenish' }
        );

        expect(adminReplenishResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, // Expected failure due to unauthorized replenishment
        });
    });
});
