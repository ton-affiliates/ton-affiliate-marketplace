


// # Error Codes
// 2: Stack underflow
// 3: Stack overflow
// 4: Integer overflow
// 5: Integer out of expected range
// 6: Invalid opcode
// 7: Type check error
// 8: Cell overflow
// 9: Cell underflow
// 10: Dictionary error
// 13: Out of gas error
// 32: Method ID not found
// 34: Action is invalid or not supported
// 37: Not enough TON
// 38: Not enough extra-currencies
// 128: Null reference exception
// 129: Invalid serialization prefix
// 130: Invalid incoming message
// 131: Constraints error
// 132: Access denied
// 133: Contract stopped
// 134: Invalid argument
// 135: Code of a contract was not found
// 136: Invalid address
// 137: Masterchain support is not enabled for this contract
// 2509: Must have at least one wallet to withdraw to
// 4138: Only the advertiser can add a new affiliate
// 11661: Only advertiser can verify these events
// 12969: Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER
// 14486: Cannot find cpa for the given op code
// 32363: No earnings to withdraw
// 33594: Cannot manually add affiliates to an open campaign
// 34905: Bot can verify only op codes under 2000
// 36363: Only the advertiser can remove the campaign and withdraw all funds
// 40058: Campaign has no funds
// 40368: Contract stopped
// 41412: Only affiliate can withdraw earnings
// 43100: Reached max number of affiliates for this campagn
// 44318: Only bot can Deploy new Campaign
// 47193: Insufficient funds to repay parent for deployment
// 48874: Insufficient contract funds to make payment
// 49469: Access denied
// 49782: affiliate not on allowed list
// 50865: owner must be deployer
// 52003: Campaign is expired
// 53205: Only the advertiser can replenish the contract
// 53296: Contract not stopped
// 53456: Affiliate does not exist
// 54206: Insufficient campaign balance to make payment
// 57313: Must be in state: STATE_CAMPAIGN_CREATED
// 58053: OP codes for regular and premium users must match
// 60644: Advertiser can verify only op codes over 2000
// 62634: Only bot can invoke User Actions

// Import necessary modules and utilities from @ton/sandbox, @ton/core, and other dependencies
import {
    Blockchain,
    SandboxContract,
    TreasuryContract
} from '@ton/sandbox';
import { toNano, Address, Dictionary } from '@ton/core';
import { AffiliateMarketplace } from '../build/AffiliateMarketplace/tact_AffiliateMarketplace';
import { Campaign } from '../build/Campaign/tact_Campaign';
import '@ton/test-utils';
import { loadCampaignCreatedEvent } from './events'; // Ensure this utility is correctly set up for testing

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
let campaignContract: SandboxContract<Campaign>;
let deployer: SandboxContract<TreasuryContract>;
let bot: SandboxContract<TreasuryContract>;
let advertiser: SandboxContract<TreasuryContract>;
let affiliate1: SandboxContract<TreasuryContract>;
let unauthorizedUser: SandboxContract<TreasuryContract>;

const USDT_MAINNET_ADDRESS = Address.parse("EQAMrDBMZywwkCRJSuV9i-bUFnCJSyCSioHLkInvCJZr2kmW");


beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate1 = await blockchain.treasury('affiliate1');
    unauthorizedUser = await blockchain.treasury('unauthorizedUser');

    // Deploy AffiliateMarketplace contract
    affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address, USDT_MAINNET_ADDRESS));
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

    // Replenish the AffiliateMarketplace contract with TON for deploying campaigns
    const adminReplenishMessageResult = await affiliateMarketplaceContract.send(
        deployer.getSender(),
        { value: toNano('5') },
        { $$type: "AdminReplenish" }
    );

    expect(adminReplenishMessageResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: affiliateMarketplaceContract.address,
        success: true,
    });

    // Bot deploys a new campaign
    const createCampaignResult = await affiliateMarketplaceContract.send(
        bot.getSender(),
        { value: toNano('0.05') },
        { $$type: 'BotDeployNewCampaign' }
    );

    let decodedCampaign: any | null = null;
    for (const external of createCampaignResult.externals) {
        if (external.body) {
            decodedCampaign = loadCampaignCreatedEvent(external.body);
        }
    }

    let campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);
    campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));

    // Advertiser sets campaign details and funds the campaign, allowing only affiliate1
    const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
    regularUsersMapCostPerActionMap.set(BigInt(0), toNano('0.1')); // Sample op code

    await campaignContract.send(
        advertiser.getSender(),
        { value: toNano('10') }, // Adding funds
        {
            $$type: 'AdvertiserSetCampaignDetails',
            campaignDetails: {
                $$type: 'CampaignDetails',
                regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                premiumUsersCostPerAction: regularUsersMapCostPerActionMap,
                allowedAffiliates: Dictionary.empty<Address, boolean>().set(affiliate1.address, true),
                isOpenCampaign: false,
                campaignValidForNumDays: null,
				paymentMethod: BigInt(0) // TON
            }
        }
    );

    // Register affiliate1 in the campaign by creating their affiliate link
    const createAffiliateResult = await campaignContract.send(
        affiliate1.getSender(),
        { value: toNano('0.05') },
        { $$type: 'AffiliateCreateNewAffiliate' }
    );

    expect(createAffiliateResult.transactions).toHaveTransaction({
        from: affiliate1.address,
        to: campaignContract.address,
        success: true
    });
});

describe('Affiliate Actions - Positive and Negative Tests for Affiliate Functions', () => {

    it('should allow an authorized affiliate to accrue earnings from user actions', async () => {
        // Perform a user action that accrues earnings for affiliate1
        const userActionResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                campaignId: BigInt(0),
                affiliateId: BigInt(0), // ID corresponding to affiliate1
                userActionOpCode: BigInt(0), // Valid op code
                isPremiumUser: false
            }
        );

        expect(userActionResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true
        });

        // Confirm that affiliate1 accrued earnings
        const affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.accruedEarnings).toBeGreaterThan(0);
    });

    it('should allow an authorized affiliate to withdraw accrued earnings', async () => {
        // Accrue earnings for affiliate1 through a user action
        await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                campaignId: BigInt(0),
                affiliateId: BigInt(0), // ID corresponding to affiliate1
                userActionOpCode: BigInt(0), // Valid op code
                isPremiumUser: false
            }
        );

        // Withdraw accrued earnings
        const withdrawEarningsResult = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AffiliateWithdrawEarnings',
                affiliateId: BigInt(0)
            }
        );

        expect(withdrawEarningsResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: affiliate1.address,
            success: true
        });
    });

    it('should fail when an unauthorized affiliate tries to join a closed campaign', async () => {
        const createAffiliateResult = await campaignContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateCreateNewAffiliate' }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: campaignContract.address,
            success: false,
            exitCode: 49782 // Unauthorized affiliate access error code
        });
    });

    it('should fail when an authorized affiliate tries to withdraw without earnings', async () => {
        // Attempt withdrawal without earnings
        const withdrawEarningsResult = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AffiliateWithdrawEarnings',
                affiliateId: BigInt(0)
            }
        );

        expect(withdrawEarningsResult.transactions).toHaveTransaction({
            from: affiliate1.address,
            to: campaignContract.address,
            success: false,
            exitCode: 32363 // No earnings to withdraw error code
        });
    });

    it('should fail when a non-affiliate user tries to withdraw earnings', async () => {
        // Attempt to withdraw by a non-affiliate user
        const withdrawEarningsResult = await campaignContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AffiliateWithdrawEarnings',
                affiliateId: BigInt(0)
            }
        );

        expect(withdrawEarningsResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: campaignContract.address,
            success: false,
            exitCode: 41412 // Unauthorized earnings withdrawal error code
        });
    });
});
