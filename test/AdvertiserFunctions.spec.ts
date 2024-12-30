
// Import necessary modules and utilities from @ton/sandbox, @ton/core, and other dependencies
import {
    Blockchain,
    SandboxContract,
    TreasuryContract
} from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary } from '@ton/core';
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
let affiliate1: SandboxContract<TreasuryContract>;
let affiliate2: SandboxContract<TreasuryContract>;
let unauthorizedUser: SandboxContract<TreasuryContract>;


const ADVERTISER_USER_OP_CODE = BigInt(20001);

beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate1 = await blockchain.treasury('affiliate1');
	affiliate2 = await blockchain.treasury('affiliate2');
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

    // Advertiser deploys a new campaign
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

    let campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);
    campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));

});

describe('Advertiser Actions - Positive and Negative Tests for Advertiser Functions', () => {

	it('should allow the advertiser to set campaign details with matching op codes for regular and premium users', async () => {
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        const premiumUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();

        // Adding matching op codes for both user types
        regularUsersMapCostPerActionMap.set(BigInt(0), toNano('0.1'));
        premiumUsersMapCostPerActionMap.set(BigInt(0), toNano('0.15'));

        const setCampaignDetailsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('10') },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: premiumUsersMapCostPerActionMap,
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
    });


    it('should allow the advertiser to set campaign details', async () => {
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(0), toNano('0.1'));

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
    });

    it('should allow the advertiser to replenish the campaign balance after setting details', async () => {
        // Set campaign details
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(0), toNano('0.1'));
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
    });
	

    it('should allow the advertiser to withdraw all campaign funds after setting details', async () => {
		
		const campaignDataBeforeWithdraw = await campaignContract.getCampaignData();
        expect(campaignDataBeforeWithdraw.campaignBalance).toBe(BigInt(0));
	
        // Set campaign details and replenish funds
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(0), toNano('0.1'));
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

        await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('5') },
            { $$type: 'AdvertiserReplenish' }
        );
		
		// Check that campaign balance is zero
        const campaignDataAfterReplenish = await campaignContract.getCampaignData();
        expect(campaignDataAfterReplenish.campaignBalance).toBeGreaterThan(toNano(4));

        // Withdraw campaign funds
        const withdrawFundsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            { 
				$$type: 'AdvertiserWithdrawFunds',
				amount: campaignDataAfterReplenish.campaignBalance
			}
        );

        expect(withdrawFundsResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: advertiser.address,
            success: true
        });

        // Check that campaign balance is ~0
        const campaignData = await campaignContract.getCampaignData();
        expect(campaignData.campaignBalance).toBeLessThan(toNano(1));
    });

    it('should allow the advertiser to verify a user action directly', async () => {
        // Set campaign details so advertiser becomes registered
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_USER_OP_CODE), toNano('0.2')); // Custom op code for advertiser action

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

        // Verify a custom user action by the advertiser
        const userActionResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: BigInt(0), // Matching affiliate1's ID
                userActionOpCode: BigInt(ADVERTISER_USER_OP_CODE), // Custom op code set by advertiser
                isPremiumUser: false
            }
        );

        expect(userActionResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });

        // Confirm earnings accrued for affiliate1 from advertiser's action
        const affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.withdrawEarnings).toBeGreaterThan(0);
    });

    it('should fail when a non-advertiser tries to withdraw campaign funds after setting details', async () => {
        // Set campaign details
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(0), toNano('0.1'));
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

        // Attempt withdrawal by unauthorized user
        const withdrawFundsResult = await campaignContract.send(
            unauthorizedUser.getSender(),
            { 
				value: toNano('0.05') },
            { 
			  $$type: 'AdvertiserWithdrawFunds',
			  amount: toNano("5")
			}
			
        );

        expect(withdrawFundsResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: campaignContract.address,
            success: false,
            exitCode: 36363 // Only advertiser can withdraw funds
        });
    });
	
	
	
	it('should not allow the advertiser to modify affiliate earnings if requiresAdvertiserApprovalForWithdrawl is false', async () => {
        // Set campaign details so advertiser becomes registered
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_USER_OP_CODE), toNano('0.2')); // Custom op code for advertiser action

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

        // Verify a custom user action by the advertiser
        const userActionResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: BigInt(0), // Matching affiliate1's ID
                userActionOpCode: BigInt(ADVERTISER_USER_OP_CODE), // Custom op code set by advertiser
                isPremiumUser: false
            }
        );

        expect(userActionResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });

        // Confirm earnings accrued for affiliate1 from advertiser's action
        let affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.withdrawEarnings).toBeGreaterThan(0);
		
		
		const advetiserModifyAffilateEarningsResult = await campaignContract.send(
			advertiser.getSender(),
			{ value: toNano('0.05') },
			{ $$type: 'AdvertiserSignOffWithdraw',
			  setAffiliatesWithdrawEarnings: Dictionary.empty<bigint, bigint>().set(BigInt(0), toNano("0")) 
			}
		);

		expect(advetiserModifyAffilateEarningsResult.transactions).toHaveTransaction({
			from: advertiser.address,
			to: campaignContract.address,
			success: false,
			exitCode: 28586 //: Advertiser can only modify affiliate earnings only if campaign is setup this requiresApprovalForWithdrawlFlag
		});
		
		affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.withdrawEarnings).toBeGreaterThan(0);
    });
	
	
	it('should fail if advertiser modifies with amount  >= affiliate earnings', async () => {
        // Set campaign details so advertiser becomes registered
        const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
        regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_USER_OP_CODE), toNano('0.2')); // Custom op code for advertiser action

        const campaignSetDetailsRsult = await campaignContract.send(
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
					requiresAdvertiserApprovalForWithdrawl: true
                }
            }
        );

        expect(campaignSetDetailsRsult.transactions).toHaveTransaction({
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

        // Verify a custom user action by the advertiser
        const userActionResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: BigInt(0), // Matching affiliate1's ID
                userActionOpCode: BigInt(ADVERTISER_USER_OP_CODE), // Custom op code set by advertiser
                isPremiumUser: false
            }
        );

        expect(userActionResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });

        // Confirm earnings accrued for affiliate1 from advertiser's action
        let affiliateData = await campaignContract.getAffiliateData(BigInt(0));
        expect(affiliateData!.pendingApprovalEarnings).toBeGreaterThan(0);
		
		let campaignDataBeforeModification = await campaignContract.getCampaignData();
		
		const advetiserModifyAffilateEarningsResult = await campaignContract.send(
			advertiser.getSender(),
			{ value: toNano('0.05') },
			{ 
			  $$type: 'AdvertiserSignOffWithdraw',
               setAffiliatesWithdrawEarnings: Dictionary.empty<bigint, bigint>().set(BigInt(0), toNano("50")) //map<Int, Int>; 
            }
		);

		expect(advetiserModifyAffilateEarningsResult.transactions).toHaveTransaction({
			from: advertiser.address,
			to: campaignContract.address,
			success: false,
			exitCode: 9125 //: withdrawableAmount must be <= pendingApprovalEarnings

		});
		
	});
	
	
	
});
