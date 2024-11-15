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
import { loadCampaignCreatedEvent } from '../scripts/events'; // Ensure this utility is correctly set up for testing
import {  USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE } from '../scripts/constants'
import { hexToCell } from '../scripts/utils';

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
let campaignContract: SandboxContract<Campaign>;
let deployer: SandboxContract<TreasuryContract>;
let bot: SandboxContract<TreasuryContract>;
let advertiser: SandboxContract<TreasuryContract>;
let affiliate1: SandboxContract<TreasuryContract>;
let unauthorizedUser: SandboxContract<TreasuryContract>;

const BOT_OP_CODE_USER_CLICK = 0;



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

beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate1 = await blockchain.treasury('affiliate1');
    unauthorizedUser = await blockchain.treasury('unauthorizedUser');

    // Deploy AffiliateMarketplace contract
    affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address, USDT_MASTER_ADDRESS, hexToCell(USDT_WALLET_BYTECODE)));
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
});

describe('Bot Actions - Positive and Negative Tests for Bot Functions', () => {

    it('should allow bot to deploy a new campaign', async () => {
        // Bot deploys a new campaign
        const createCampaignResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            { $$type: 'BotDeployNewCampaign' }
        );

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: bot.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        // Verify campaign creation
        let decodedCampaign: any | null = null;
        for (const external of createCampaignResult.externals) {
            if (external.body) {
                decodedCampaign = loadCampaignCreatedEvent(external.body);
            }
        }
        expect(decodedCampaign).not.toBeNull();
    });

    it('should allow bot to perform user actions within permitted op codes', async () => {
        // Deploy a campaign and set campaign details
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

        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('0.1'));

        await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('10') },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: regularUsersMapCostPerActionMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
                    isOpenCampaign: false,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );

        // Bot performs a user action on the campaign
        const botUserActionResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                campaignId: BigInt(decodedCampaign!.campaignId),
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
                isPremiumUser: false
            }
        );

        expect(botUserActionResult.transactions).toHaveTransaction({
            from: bot.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
    });

    it('should fail when a non-bot user tries to deploy a campaign', async () => {
        const createCampaignResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            { $$type: 'BotDeployNewCampaign' }
        );

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false,
            exitCode: 44318 // Exit code for unauthorized bot action
        });
    });

    it('should fail when a non-bot user tries to perform bot user action', async () => {
        const botUserActionResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                campaignId: BigInt(0),
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
                isPremiumUser: false
            }
        );

        expect(botUserActionResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false,
            exitCode: 62634 // Exit code for unauthorized bot action
        });
    });

    it('should fail when bot tries to use an op code not allowed for bots', async () => {
	
		// Deploy a campaign and set campaign details
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

        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('0.1'));

        await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('10') },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: regularUsersMapCostPerActionMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
                    isOpenCampaign: false,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );
		
        const botUserActionResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                campaignId: BigInt(decodedCampaign!.campaignId),
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(2001), // Unauthorized op code for bots
                isPremiumUser: false
            }
        );

        expect(botUserActionResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: false,
            exitCode: 34905 // Exit code for invalid op code for bots
        });
    });
});
