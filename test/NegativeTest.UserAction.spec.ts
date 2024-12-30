// Import necessary modules and utilities from @ton/sandbox, @ton/core, and other dependencies
import {
    Blockchain,
    printTransactionFees,
    prettyLogTransactions,
    SandboxContract,
    TreasuryContract
} from '@ton/sandbox';
import { toNano, Address, Dictionary } from '@ton/core';
import { AffiliateMarketplace } from '../build/AffiliateMarketplace/tact_AffiliateMarketplace';
import { Campaign } from '../build/Campaign/tact_Campaign';
import '@ton/test-utils';
import { loadCampaignCreatedEvent } from '../scripts/events'; // Ensure this utility is correctly set up for testing
import { USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE, AFFILIATE_FEE_PERCENTAGE, ADVERTISER_FEE_PERCENTAGE } from '../scripts/constants'
import { hexToCell } from '../scripts/utils';

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
let campaignContract: SandboxContract<Campaign>;
let deployer: SandboxContract<TreasuryContract>;
let bot: SandboxContract<TreasuryContract>;
let advertiser: SandboxContract<TreasuryContract>;
let affiliate: SandboxContract<TreasuryContract>;
let unauthorizedUser: SandboxContract<TreasuryContract>;
let decodedCampaign: any | null;

const BOT_OP_CODE_USER_CLICK = 0;
const ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = 20001;

let campaignId = BigInt(0);


beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate = await blockchain.treasury('affiliate');
    unauthorizedUser = await blockchain.treasury('unauthorizedUser');

    // Deploy AffiliateMarketplace contract
    affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address, 
            USDT_MASTER_ADDRESS, hexToCell(USDT_WALLET_BYTECODE), ADVERTISER_FEE_PERCENTAGE, AFFILIATE_FEE_PERCENTAGE));     const deployResult = await affiliateMarketplaceContract.send(
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
	
	// set some TON in the affiliate marketplace contract
	const adminReplenishMessageResult = await affiliateMarketplaceContract.send(
		deployer.getSender(),
		{ value: toNano('5') },
		{
		   $$type: "AdminReplenish"
		}
	);

	expect(adminReplenishMessageResult.transactions).toHaveTransaction({
		from: deployer.address,
		to: affiliateMarketplaceContract.address,
		success: true,
	});

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

	for (const external of createCampaignResult.externals) {
		if (external.body) {
			decodedCampaign = loadCampaignCreatedEvent(external.body);
		}
	}

	expect(decodedCampaign).not.toBeNull();
	campaignId = BigInt(decodedCampaign!.campaignId);
	let campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);

	expect(createCampaignResult.transactions).toHaveTransaction({
		from: affiliateMarketplaceContract.address,
		to: campaignContractAddress,
		deploy: true,
		success: true,
	});

	campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));

    const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
    regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('0.1'));
    regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('1'));
		
	// closed campaign
    const setCampaignDetailsResult = await campaignContract.send(
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

    expect(setCampaignDetailsResult.transactions).toHaveTransaction({
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


	// create affiliate
    const createAffiliateResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateCreateNewAffiliate' }
        );

    expect(createAffiliateResult.transactions).toHaveTransaction({
        from: affiliate.address,
        to: campaignContract.address,
        success: true,
    });

    
});


describe('Negative Tests for User Actions', () => {


     it('should fail to perform user action op codes from an unauthorized verifier', async () => {

        // Attempt by the bot to verify an action that should be verified by the advertiser
        const userActionResult = await campaignContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(100000),
                isPremiumUser: false,
            }
        );

        expect(userActionResult.transactions).toHaveTransaction({
            from: bot.address,
            to: campaignContract.address,
            success: false, // 7354
			exitCode: 7354
        });

        // Attempt by the advertiser to verify an action that should be verified by the bot
        const advertiserUnauthorizedUserAction = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: 0n,
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK), // Requires bot, not advertiser
                isPremiumUser: false,
            }
        );

        expect(advertiserUnauthorizedUserAction.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false,  // 14465: Advertiser can verify only op codes over 20000
			exitCode: 14465
        });
    });

    it('should fail to send a user action with an invalid op code', async () => {

        const invalidOpCodeResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: 0n,
                userActionOpCode: BigInt(99999), // Invalid op code not defined in campaign
                isPremiumUser: false,
            }
        );

        expect(invalidOpCodeResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false, //14486: Cannot find cpa for the given op code
			exitCode: 14486
        });
    });
	
	it('should fail on unknown affiliate', async () => {

        const unknownAfiliateResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: 1n,
                userActionOpCode: BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), 
                isPremiumUser: false,
            }
        );

        expect(unknownAfiliateResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false, //53456: Affiliate does not exist
			exitCode: 53456
        });
    });

});
