


//# Error Codes
// 2: Stack underflow
// 3: Stack overflow
// 4: Integer overflow
// 5: Integer out of expected range
// 6: Invalid opcode
// 7: Type check error
// 8: Cell overflow
// 9: Cell underflow
// 10: Dictionary error
// 11: 'Unknown' error
// 12: Fatal error
// 13: Out of gas error
// 14: Virtualization error
// 32: Action list is invalid
// 33: Action list is too long
// 34: Action is invalid or not supported
// 35: Invalid source address in outbound message
// 36: Invalid destination address in outbound message
// 37: Not enough TON
// 38: Not enough extra-currencies
// 39: Outbound message does not fit into a cell after rewriting
// 40: Cannot process a message
// 41: Library reference is null
// 42: Library change action error
// 43: Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree
// 50: Account state size exceeded limits
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
// 1919: Insufficient USDT funds to make transfer
// 2432: Only contract wallet can invoke
// 2509: Must have at least one wallet to withdraw to
// 3688: Not mintable
// 4138: Only the advertiser can add a new affiliate
// 4429: Invalid sender
// 7226: Only advertiser can approve withdrawal
// 11661: Only advertiser can verify these events
// 12241: Max supply exceeded
// 12969: Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER
// 13965: Invalid destinationId!
// 14486: Cannot find cpa for the given op code
// 14534: Not owner
// 16059: Invalid value
// 17062: Invalid amount
// 18026: Only advertiser can modify affiliates withdrawl flag
// 18668: Can't Mint Anymore
// 19587: Only the advertiser can remove an existing affiliate
// 23951: Insufficient gas
// 26205: Only USDT Campaigns can accept USDT
// 26924: affiliate not approved yet
// 26953: Only affiliate can withdraw funds
// 27029: Cannot take from Affiliate more than their accruedEarnings
// 30892: Only owner can deploy
// 33318: Insufficient funds to repay parent for deployment and keep buffer
// 33594: Cannot manually add affiliates to an open campaign
// 34085: Only TON supported as payment method
// 34905: Bot can verify only op codes under 2000
// 35494: Affiliate with requiresAdvertiserApprovalForWithdrawl flag
// 36363: Only the advertiser can remove the campaign and withdraw all funds
// 38795: Advertiser can only modify requiresApprovalForWithdrawlFlag if campaign is setup this way
// 40058: Campaign has no funds
// 40368: Contract stopped
// 40755: Only advertiser can send tokens to this contract
// 42708: Invalid sender!
// 43100: Reached max number of affiliates for this campagn
// 43422: Invalid value - Burn
// 44215: Invalid indices
// 44318: Only bot can Deploy new Campaign
// 48874: Insufficient contract funds to make payment
// 49469: Access denied
// 49782: affiliate not on allowed list
// 50865: owner must be deployer
// 52003: Campaign is expired
// 53205: Only the advertiser can replenish the contract
// 53296: Contract not stopped
// 53456: Affiliate does not exist
// 54206: Insufficient campaign balance to make payment
// 57013: Affiliate without requiresAdvertiserApprovalForWithdrawl flag
// 57313: Must be in state: STATE_CAMPAIGN_CREATED
// 58053: OP codes for regular and premium users must match
// 59035: Only contract wallet allowed to invoke
// 60644: Advertiser can verify only op codes over 2000
// 62634: Only bot can invoke User Actions
// 62972: Invalid balance

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
import { hexToCell } from './utils'

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
let campaignContract: SandboxContract<Campaign>;
let deployer: SandboxContract<TreasuryContract>;
let bot: SandboxContract<TreasuryContract>;
let advertiser: SandboxContract<TreasuryContract>;
let affiliate1: SandboxContract<TreasuryContract>;
let unauthorizedUser: SandboxContract<TreasuryContract>;

const USDT_MASTER_ADDRESS = Address.parse("EQAMrDBMZywwkCRJSuV9i-bUFnCJSyCSioHLkInvCJZr2kmW");
const USDT_WALLET_BYTECODE = "b5ee9c7201020f010003d1000114ff00f4a413f4bcf2c80b01020162020302f8d001d0d3030171b08e48135f038020d721ed44d0d303fa00fa40fa40d104d31f01840f218210178d4519ba0282107bdd97deba12b1f2f48040d721fa003012a0401303c8cb0358fa0201cf1601cf16c9ed54e0fa40fa4031fa0031f401fa0031fa00013170f83a02d31f012082100f8a7ea5ba8e85303459db3ce03304050201200d0e01f203d33f0101fa00fa4021fa4430c000f2e14ded44d0d303fa00fa40fa40d15309c7052471b0c00021b1f2ad522bc705500ab1f2e0495115a120c2fff2aff82a54259070546004131503c8cb0358fa0201cf1601cf16c921c8cb0113f40012f400cb00c920f9007074c8cb02ca07cbffc9d004fa40f401fa00200602d0228210178d4519ba8e84325adb3ce034218210595f07bcba8e843101db3ce032208210eed236d3ba8e2f30018040d721d303d1ed44d0d303fa00fa40fa40d1335142c705f2e04a403303c8cb0358fa0201cf1601cf16c9ed54e06c218210d372158cbadc840ff2f00809019820d70b009ad74bc00101c001b0f2b19130e2c88210178d451901cb1f500a01cb3f5008fa0223cf1601cf1626fa025007cf16c9c8801801cb055004cf1670fa024063775003cb6bccccc945370700b42191729171e2f839206e938124279120e2216e94318128739101e25023a813a0738103a370f83ca00270f83612a00170f836a07381040982100966018070f837a0bcf2b0048050fb005803c8cb0358fa0201cf1601cf16c9ed5403f4ed44d0d303fa00fa40fa40d12372b0c002f26d07d33f0101fa005141a004fa40fa4053bac705f82a5464e070546004131503c8cb0358fa0201cf1601cf16c921c8cb0113f40012f400cb00c9f9007074c8cb02ca07cbffc9d0500cc7051bb1f2e04a09fa0021925f04e30d26d70b01c000b393306c33e30d55020a0b0c01f2ed44d0d303fa00fa40fa40d106d33f0101fa00fa40f401d15141a15288c705f2e04926c2fff2afc882107bdd97de01cb1f5801cb3f01fa0221cf1658cf16c9c8801801cb0526cf1670fa02017158cb6accc903f839206e943081169fde718102f270f8380170f836a0811a7770f836a0bcf2b0028050fb00030c0060c882107362d09c01cb1f2501cb3f5004fa0258cf1658cf16c9c8801001cb0524cf1658fa02017158cb6accc98011fb00007a5054a1f82fa07381040982100966018070f837b60972fb02c8801001cb055005cf1670fa027001cb6a8210d53276db01cb1f5801cb3fc9810082fb0059002003c8cb0358fa0201cf1601cf16c9ed540027bfd8176a2686981fd007d207d206899fc15209840021bc508f6a2686981fd007d207d2068af81c";

let campaignId = BigInt(0);

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
	
	campaignId = BigInt(decodedCampaign!.campaignId);

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
				paymentMethod: BigInt(0), // TON
				requiresAdvertiserApprovalForWithdrawl: false
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
                campaignId: campaignId,
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
                campaignId: campaignId,
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
            exitCode: 10630 // Must withdraw a positive amount
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
            success: false, //26953: Only affiliate can withdraw funds
			exitCode: 26953
        });
    });
});
