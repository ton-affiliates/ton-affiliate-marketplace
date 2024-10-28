// Import necessary modules and utilities from @ton/sandbox, @ton/core, and other dependencies
import {
    Blockchain,
    printTransactionFees,
    prettyLogTransactions,
    SandboxContract,
    TreasuryContract
} from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary } from '@ton/core';
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
let affiliate2: SandboxContract<TreasuryContract>;
let unauthorizedUser: SandboxContract<TreasuryContract>;
let decodedCampaign: any | null;

const BOT_OP_CODE_USER_CLICK = 0;
const ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = 2001;


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

	// 1. Bot deploys empty campaign
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

	for (const external of createCampaignResult.externals) {
		if (external.body) {
			decodedCampaign = loadCampaignCreatedEvent(external.body);
		}
	}

	expect(decodedCampaign).not.toBeNull();
	expect(decodedCampaign!.campaignId).toBe(0);
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
                allowedAffiliates: Dictionary.empty<Address, boolean>(),
                isOpenCampaign: false,
				campaignValidForNumDays: null,
				paymentMethod: BigInt(0) // TON
            }
        }
    );

    expect(setCampaignDetailsResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: campaignContract.address,
        success: true
    });
});

describe('Administrative Actions - positive test', () => {

	it('should seize campaign balance successfully', async () => {
	        
		let deployerBalanceBeforeSeize = await deployer.getBalance();
		const adminSeizeCampaignBalanceResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminSeizeCampaignBalance',
                campaignId: BigInt(0) 
            }
        );

        expect(adminSeizeCampaignBalanceResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		let campaignData = await campaignContract.getCampaignData();
		expect(campaignData.contractBalance).toBe(BigInt(0));
		expect(campaignData.campaignBalance).toBe(BigInt(0));
		
		let deployerBalance = await deployer.getBalance();
		expect(deployerBalance - deployerBalanceBeforeSeize).toBeLessThan(toNano("9"));
		expect(deployerBalance - deployerBalanceBeforeSeize).toBeGreaterThan(toNano("8.9"));
    });
	

    it('should modify fee percentage of existing campaign successfully', async () => {
	        
		// 1. modify campaign's percentage fee from 2% (200) to 1.5% (150)
		const adminModifyCampaignFeeResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminModifyCampaignFeePercentage',
                campaignId: BigInt(decodedCampaign!.campaignId), 
                feePercentage: BigInt(150), // 1.5%
            }
        );

        expect(adminModifyCampaignFeeResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		let campaignData = await campaignContract.getCampaignData();
		expect(campaignData.feePercentage).toBe(BigInt(150));
    });
	
	
	it('should stop/resume campaign successfully', async () => {
        	
		//  stop campaign
		const adminStopCampaignResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminStopCampaign',
                campaignId: BigInt(decodedCampaign!.campaignId)
            }
        );

        expect(adminStopCampaignResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		let isCampaignStopped = await campaignContract.getStopped();
		expect(isCampaignStopped).toBe(true);
		
		// 3. resume campaign
		const adminResumeCampaignResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminResumeCampaign',
                campaignId: BigInt(decodedCampaign!.campaignId)
            }
        );

        expect(adminResumeCampaignResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		isCampaignStopped = await campaignContract.getStopped();
		expect(isCampaignStopped).toBe(false);
    });

    it('should replenish and withdraw funds successfully', async () => {

        // Add funds to the contract for testing
         const adminReplenishMessageResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('50') },
            {
               $$type: "AdminReplenish"
            }
        );

        expect(adminReplenishMessageResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });
		
		let adminBalanceBeforeAdminWithdraw = await deployer.getBalance();

        // Admin withdraw
        const adminWithdrawResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminWithdraw',
                amount: toNano('30'), 
                wallets: Dictionary.empty<Address, boolean>().set(deployer.address, true),
            }
        );

        expect(adminWithdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		let adminBalance = await deployer.getBalance();
					
		expect(adminBalance - adminBalanceBeforeAdminWithdraw).toBeLessThan(toNano("30"));
		expect(adminBalance - adminBalanceBeforeAdminWithdraw).toBeGreaterThan(toNano("29"));
    });
	
	

    // Test: stop affiliate marketplace
	it('should stop and resume affiliate marketplace', async () => {
	
		let stopped = await affiliateMarketplaceContract.getStopped();
		expect(stopped).toBe(false);
		
		let owner = await affiliateMarketplaceContract.getOwner();
		expect(owner.toString()).toBe(deployer.address.toString());
		
		const ownerStopContractResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            "Stop"
        );
		
		expect(ownerStopContractResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		stopped = await affiliateMarketplaceContract.getStopped();
		expect(stopped).toBe(true);
		
		const ownerResumeContractResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            "Resume"
        );		
		
		expect(ownerResumeContractResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		stopped = await affiliateMarketplaceContract.getStopped();
		expect(stopped).toBe(false);
		
	
		// receive("Resume") is added automatically to allow owner to resume the contract
		// receive("Stop") is added automatically to allow owner to stop the contract
		// get fun stopped(): Bool is added automatically to query if contract is stopped
		// get fun owner(): Address is added automatically to query who the owner is
	});
 
});
