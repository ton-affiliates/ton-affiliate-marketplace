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

const BOT_OP_CODE_USER_CLICK = 0;
const ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = 20001;


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

	let decodedCampaign: any | null = null;
	for (const external of createCampaignResult.externals) {
		if (external.body) {
			decodedCampaign = loadCampaignCreatedEvent(external.body);
		}
	}

	expect(decodedCampaign).not.toBeNull();
	campaignId = BigInt(decodedCampaign!.campaignId);  // set campaignId

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


});

describe('Administrative Actions - Negative Tests for AffiliateMarketplace Contract Admin functions', () => {

	it('should fail when a non-owner tries to seize campaign balance', async () => {
        const adminSeizeCampaignBalanceResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminSeizeCampaignBalance',
                campaignId: campaignId,
				advertiser: advertiser.address				
            }
        );

        expect(adminSeizeCampaignBalanceResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //132: Access denied
			exitCode: 132
        });
    });

    // Test: Invalid Withdrawal Amounts by Admin
    it('should fail when the admin tries to withdraw more than available balance or violates the buffer requirement', async () => {

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
            success: false, //48874: Insufficient contract funds to make payment
			exitCode: 48874
        });

        // Attempt to withdraw a valid amount but violating buffer requirement
        const bufferViolationWithdrawResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminWithdraw',
                amount: toNano('49.5'), // Violate the buffer requirement of 1 TON
                wallets: Dictionary.empty<Address, boolean>().set(deployer.address, true),
            }
        );

        expect(bufferViolationWithdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: false, //48874: Insufficient contract funds to make payment
			exitCode: 48874
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
            success: false, //132: Access denied
			exitCode: 132
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
            success: false, //132: Access denied
			exitCode: 132
        });
    });
	
    it('should fail when an unauthorized sender attempts to invoke AdminPayAffiliateUSDTBounced', async () => {
        const adminPayAffiliateUSDTBounced = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('10') },
            { $$type: 'AdminPayAffiliateUSDTBounced',
			  campaignId: BigInt(campaignId),
			  advertiser: advertiser.address,
			  affiliateId: BigInt(0),
			  amount: toNano('10')
			}
        );

        expect(adminPayAffiliateUSDTBounced.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //132: Access denied
			exitCode: 132
        });
    });
	
	it('should fail when an unauthorized sender attempts to invoke AdminPayAffiliateUSDTBounced', async () => {
        const adminUpdateUSDTCampaignBalanceResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('10') },
            { $$type: 'AdminJettonNotificationMessageFailure',
			  campaignId: BigInt(campaignId),
			  advertiser: advertiser.address,
			  amount: toNano('10')
			}
        );

        expect(adminUpdateUSDTCampaignBalanceResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //132: Access denied
			exitCode: 132
        });
    });
	
	it('should fail to stop and resume affiliate marketplace from unknown user', async () => {
	
		let stopped = await affiliateMarketplaceContract.getStopped();
		expect(stopped).toBe(false);
	
		
		const unauthorizedUserStopContractResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            "Stop"
        );
		
		expect(unauthorizedUserStopContractResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //132: Access denied
			exitCode: 132
        });
		
		stopped = await affiliateMarketplaceContract.getStopped();
		expect(stopped).toBe(false);
		
		const unauthorizedUserResumeContractResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            "Resume"
        );		
		
		expect(unauthorizedUserResumeContractResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //132: Access denied
			exitCode: 132
        });
		
		stopped = await affiliateMarketplaceContract.getStopped();
		expect(stopped).toBe(false);
		
	
		// receive("Resume") is added automatically to allow owner to resume the contract
		// receive("Stop") is added automatically to allow owner to stop the contract
		// get fun stopped(): Bool is added automatically to query if contract is stopped
		// get fun owner(): Address is added automatically to query who the owner is
	});
	
	it('should fail to stop and resume campaign from unknown user', async () => {
	
		let stopped = await campaignContract.getStopped();
		expect(stopped).toBe(false);
		
		const unauthorizedUserStopContractResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminStopCampaign',
                campaignId: campaignId,
				advertiser: advertiser.address
            }
        );
		
		expect(unauthorizedUserStopContractResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //132: Access denied
			exitCode: 132
        });
		
		stopped = await campaignContract.getStopped();
		expect(stopped).toBe(false);
		
		const unauthorizedUserResumeContractResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminResumeCampaign',
                campaignId: campaignId,
				advertiser: advertiser.address
            }
        );
		
		expect(unauthorizedUserResumeContractResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //132: Access denied
			exitCode: 132
        });
		
	
		// receive("Resume") is added automatically to allow owner to resume the contract
		// receive("Stop") is added automatically to allow owner to stop the contract
		// get fun stopped(): Bool is added automatically to query if contract is stopped
		// get fun owner(): Address is added automatically to query who the owner is
	});
});
