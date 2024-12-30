
import {
    Blockchain,
    SandboxContract,
    TreasuryContract
} from '@ton/sandbox';
import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { AffiliateMarketplace } from '../build/AffiliateMarketplace/tact_AffiliateMarketplace';
import { Campaign } from '../build/Campaign/tact_Campaign';
import '@ton/test-utils';
import { loadCampaignCreatedEvent } from '../scripts/events'; // Ensure this utility is correctly set up for testing
import { USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE, ADVERTISER_FEE_PERCENTAGE, AFFILIATE_FEE_PERCENTAGE } from '../scripts/constants'
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

let campaignId = BigInt(0);
const BOT_OP_CODE_USER_CLICK = BigInt(0);

beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate1 = await blockchain.treasury('affiliate1');
    unauthorizedUser = await blockchain.treasury('unauthorizedUser');

    // Deploy AffiliateMarketplace contract
    affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address, 
        USDT_MASTER_ADDRESS, hexToCell(USDT_WALLET_BYTECODE), ADVERTISER_FEE_PERCENTAGE, AFFILIATE_FEE_PERCENTAGE));
    
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
        advertiser.getSender(),
        { value: toNano('1') },
        { $$type: 'AdvertiserDeployNewCampaign' }
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
    regularUsersMapCostPerActionMap.set(BOT_OP_CODE_USER_CLICK, toNano('0.1')); // Sample op code

    await campaignContract.send(
        advertiser.getSender(),
        { value: toNano('10') }, // Adding funds
        {
            $$type: 'AdvertiserSetCampaignDetails',
            campaignDetails: {
                $$type: 'CampaignDetails',
                regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                premiumUsersCostPerAction: regularUsersMapCostPerActionMap,
                isPublicCampaign: true,
                campaignValidForNumDays: null,
				paymentMethod: BigInt(0), // TON
				requiresAdvertiserApprovalForWithdrawl: true
            }
        }
    );

    // Replenish campaign balance
    const replenishResult = await campaignContract.send(
        advertiser.getSender(),
        { value: toNano('5') },
        { $$type: 'AdvertiserReplenish' }
    );

    expect(replenishResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: campaignContract.address,
        success: true
    });

    // Verify campaign balance update
    const campaignData = await campaignContract.getCampaignData();
    expect(campaignData.campaignBalance).toBeGreaterThan(0);

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
				
		let affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.pendingApprovalEarnings).toBe(BigInt(0));
		expect(affiliateData!.totalEarnings).toBe(BigInt(0));
		expect(affiliateData!.withdrawEarnings).toBe(BigInt(0));
		
        // Perform a user action that accrues earnings for affiliate1
        const userActionResult = await campaignContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
                isPremiumUser: false,
            }
        );
		
        expect(userActionResult.transactions).toHaveTransaction({
            from: bot.address,
            to: campaignContract.address,
            success: true
        });
		
		expect(userActionResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: bot.address,
            success: true
        });
		
        affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.pendingApprovalEarnings).toBeGreaterThan(BigInt(0));
		expect(affiliateData!.totalEarnings).toBeGreaterThan(BigInt(0));
		expect(affiliateData!.withdrawEarnings).toBe(BigInt(0));
		
		let campaignBalanceBefore = (await campaignContract.getCampaignData()).campaignBalance;
				
		// advertiser set 0.05 less
		const advetiserModifyAffiliatesEarningsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserSignOffWithdraw',
                setAffiliatesWithdrawEarnings: Dictionary.empty<bigint, bigint>().set(BigInt(0), toNano("0.05")) //map<Int, Int>; 
            }
        );
		
		expect(advetiserModifyAffiliatesEarningsResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });
		
		let campaignBalanceAfter = (await campaignContract.getCampaignData()).campaignBalance;
		
		console.log(fromNano(campaignBalanceAfter - campaignBalanceBefore));
		expect(campaignBalanceAfter - campaignBalanceBefore).toBeGreaterThan(BigInt(0));
		
		affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.pendingApprovalEarnings).toBe(BigInt(0));
		expect(affiliateData!.totalEarnings).toBeGreaterThan(BigInt(0));
		expect(affiliateData!.withdrawEarnings).toBeGreaterThan(BigInt(0));
		
		// finally affiliate to withdraw
		const affiliateWithdrawResult = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateWithdrawEarnings', affiliateId: BigInt(0) }
        );

        expect(affiliateWithdrawResult.transactions).toHaveTransaction({
            from: affiliate1.address,
            to: campaignContract.address,
            success: true,
        });
		
		
				
		affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.pendingApprovalEarnings).toBe(BigInt(0));
		expect(affiliateData!.totalEarnings).toBeGreaterThan(BigInt(0)); // total earnings do not change
		expect(affiliateData!.withdrawEarnings).toBe(BigInt(0));
		
		
    });

    it('should fail if affiliate tries to withdraw funds', async () => {
	        
		// Perform a user action that accrues earnings for affiliate1
        const userActionResult = await campaignContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
                isPremiumUser: false,
            }
        );
		
        expect(userActionResult.transactions).toHaveTransaction({
            from: bot.address,
            to: campaignContract.address,
            success: true
        });
		
		let affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.pendingApprovalEarnings).toBeGreaterThan(BigInt(0));
		expect(affiliateData!.withdrawEarnings).toBe(BigInt(0));
		
		const affiliateWithdrawResult = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateWithdrawEarnings', affiliateId: BigInt(0) }
        );

        expect(affiliateWithdrawResult.transactions).toHaveTransaction({
            from: affiliate1.address,
            to: campaignContract.address,
            success: false,
			exitCode: 10630 //: Must withdraw a positive amount
        });
    });
});
