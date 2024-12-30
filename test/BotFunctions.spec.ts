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
import { USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE, ADVERTISER_FEE_PERCENTAGE, AFFILIATE_FEE_PERCENTAGE } from '../scripts/constants'
import { hexToCell } from '../scripts/utils';
import exp from 'constants';

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
});

describe('Bot Actions - Positive and Negative Tests for Bot Functions', () => {

    it('should allow bot to deploy a new campaign', async () => {
        // Advertiser deploys a new campaign
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            { value: toNano('1') },
            { $$type: 'AdvertiserDeployNewCampaign' }
        );

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: advertiser.address,
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
        // Advertiser deploys a new campaign
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            { value: toNano('1') },
            { $$type: 'AdvertiserDeployNewCampaign' }
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
            }
        }

        let campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);
        campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));

        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('0.1'));

        let setDetailsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('10') },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: Dictionary.empty<bigint, bigint>().set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('0.1')),
                    premiumUsersCostPerAction: Dictionary.empty<bigint, bigint>().set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('0.1')),
                    isPublicCampaign: true,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );

        expect(setDetailsResult.transactions).toHaveTransaction({
			from: advertiser.address,
			to: campaignContract.address,
			success: true
		});

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

        // Bot performs a user action on the campaign
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
    });

    
    it('should fail when a non-bot user tries to perform bot user action', async () => {
        
		// Advertiser deploys a new campaign
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            { value: toNano('1') },
            { $$type: 'AdvertiserDeployNewCampaign' }
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
                    isPublicCampaign: true,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
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
		
		
		
		const botUserActionResult = await campaignContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
                isPremiumUser: false
            }
        );

        expect(botUserActionResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: campaignContract.address,
            success: false,
            exitCode: 42372 // Only bot can invoke this function
        });
    });


    it('should fail when a bot tries to perform bot user action on inactive campaign', async () => {
        
		// Advertiser deploys a new campaign
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            { value: toNano('1') },
            { $$type: 'AdvertiserDeployNewCampaign' }
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
            }
        }

        let campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);
        campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));

        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('10')); 
		
		let campaignData = await campaignContract.getCampaignData();
		console.log(campaignData);

        await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('10') },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: regularUsersMapCostPerActionMap,
                    isPublicCampaign: true,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );
			
		const botUserActionResult = await campaignContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
                isPremiumUser: false
            }
        );

        expect(botUserActionResult.transactions).toHaveTransaction({
            from: bot.address,
            to: campaignContract.address,
            success: false,
            exitCode: 24142//24142: Campaign is not active

        });
    });

    it('should fail when bot tries to use an op code not allowed for bots', async () => {
	
		// Advertiser deploys a new campaign
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            { value: toNano('1') },
            { $$type: 'AdvertiserDeployNewCampaign' }
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
                    isPublicCampaign: true,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );
		
        const botUserActionResult = await campaignContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(100000), // Unauthorized op code for bots
                isPremiumUser: false
            }
        );

        expect(botUserActionResult.transactions).toHaveTransaction({
            from: bot.address,
            to: campaignContract.address,
            success: false,
            exitCode: 7354 //: Bot can verify only op codes under 20000

        });
    });
});
