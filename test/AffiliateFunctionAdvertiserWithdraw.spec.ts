


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
// 23951: Insufficient gas
// 26205: Only USDT Campaigns can accept USDT
// 26953: Only affiliate can withdraw funds
// 30892: Only owner can deploy
// 33318: Insufficient funds to repay parent for deployment and keep buffer
// 33594: Cannot manually add affiliates to an open campaign
// 34085: Only TON supported as payment method
// 34905: Bot can verify only op codes under 2000
// 35494: Affiliate with requiresAdvertiserApprovalForWithdrawl flag
// 36363: Only the advertiser can remove the campaign and withdraw all funds
// 40058: Campaign has no funds
// 40368: Contract stopped
// 40755: Only advertiser can send tokens to this contract
// 42708: Invalid sender!
// 43100: Reached max number of affiliates for this campagn
// 43422: Invalid value - Burn
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
import { hexToCell, USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE } from './utils'

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
let campaignContract: SandboxContract<Campaign>;
let deployer: SandboxContract<TreasuryContract>;
let bot: SandboxContract<TreasuryContract>;
let advertiser: SandboxContract<TreasuryContract>;
let affiliate1: SandboxContract<TreasuryContract>;
let unauthorizedUser: SandboxContract<TreasuryContract>;

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
				requiresAdvertiserApprovalForWithdrawl: true
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

    it('should allow advertiser to withdraw for affiliate', async () => {
		
		let affiliateBalanceBeforeWithdrawl = await affiliate1.getBalance();
	
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
        let affiliateData = await campaignContract.getAffiliateData(BigInt(0));
		const affiliateEarnings = affiliateData!.accruedEarnings;
        expect(affiliateEarnings).toBeGreaterThan(0);
				
		// advertiser withdraw 
		const advetiserWithdrawForAffiliateResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserWithdrawEarningsForAffiliates',
                affiliatesEarnings: Dictionary.empty<bigint, bigint>().set(BigInt(0), affiliateEarnings) //map<Int, Int>; 
            }
        );
		
		expect(advetiserWithdrawForAffiliateResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });
				
		affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.accruedEarnings).toBe(BigInt(0));
		
		let affiliateBalance = await affiliate1.getBalance();
		expect(affiliateBalance - affiliateBalanceBeforeWithdrawl).toBeGreaterThan(toNano("0"));
		
    });

    it('should fail if affiliate tries to withdraw funds', async () => {
	        
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
		
		let affiliateData = await campaignContract.getAffiliateData(BigInt(0));
		const affiliateEarnings = affiliateData!.accruedEarnings;
        expect(affiliateEarnings).toBeGreaterThan(0);
		
		// affiliate tries to withdraw and fails
		const advetiserWithdrawForAffiliateResult = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserWithdrawEarningsForAffiliates',
                affiliatesEarnings: Dictionary.empty<bigint, bigint>().set(BigInt(0), affiliateEarnings) //map<Int, Int>; 
            }
        );
				
		expect(advetiserWithdrawForAffiliateResult.transactions).toHaveTransaction({
            from: affiliate1.address,
            to: campaignContract.address,
            success: false,
			exitCode: 7226 //Only advertiser can approve withdrawal
			
        });
    });
});
