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

	for (const external of createCampaignResult.externals) {
		if (external.body) {
			decodedCampaign = loadCampaignCreatedEvent(external.body);
		}
	}

	expect(decodedCampaign).not.toBeNull();
	campaignId = decodedCampaign!.campaignId;
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

describe('Administrative Actions - positive test', () => {

	it('should seize campaign balance successfully', async () => {
	        
		let payoutBalanceBefore = await deployer.getBalance();
		const adminSeizeCampaignBalanceResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminSeizeCampaignBalance',
                campaignId: campaignId,
				advertiser: advertiser.address
            }
        );

        expect(adminSeizeCampaignBalanceResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		expect(adminSeizeCampaignBalanceResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true
        });
		
		expect(adminSeizeCampaignBalanceResult.transactions).toHaveTransaction({
            from: campaignContract.address,
            to: deployer.address,
            success: true
        });
		
		let campaignContractExists = true;
		
		let campaignData = await campaignContract.getCampaignData();		
		expect(campaignData.contractTonBalance).toBe(toNano("0"));
		
		let payoutBalanceAfter = await deployer.getBalance();
		expect(payoutBalanceAfter - payoutBalanceBefore).toBeGreaterThan(toNano("0"));
    });
	
	
	it('should stop/resume campaign successfully', async () => {
        	
		//  stop campaign
		const adminStopCampaignResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminStopCampaign',
                campaignId: BigInt(decodedCampaign!.campaignId),
				advertiser: advertiser.address
				
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
                campaignId: BigInt(decodedCampaign!.campaignId),
				advertiser: advertiser.address
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
		
	});
	
	
	it('should update campaign USDT balance successfully', async () => {
	
		let campaignData = await campaignContract.getCampaignData();
		expect(campaignData.contractUSDTBalance).toBe(toNano('0'));
        	
		const adminUpdateUSDTCampaignBalanceResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminJettonNotificationMessageFailure',
                campaignId: BigInt(decodedCampaign!.campaignId),
				advertiser: advertiser.address,
				amount: toNano('10')
            }
        );

        expect(adminUpdateUSDTCampaignBalanceResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		expect(adminUpdateUSDTCampaignBalanceResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true
        });
		
		campaignData = await campaignContract.getCampaignData();
		expect(campaignData.contractUSDTBalance).toBe(toNano('10'));
    });
	
	it('should update affiliate USDT balance if payment bounced', async () => {
	
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
	
		let affiliateData = await campaignContract.getAffiliateData(BigInt(0));
		expect(affiliateData!.pendingApprovalEarnings).toBe(toNano('0'));
        	
		const adminUpdateAffiliateBalance = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminPayAffiliateUSDTBounced',
                campaignId: BigInt(decodedCampaign!.campaignId),
				advertiser: advertiser.address,
				affiliateId: BigInt(0),
				amount: toNano('10')
            }
        );

        expect(adminUpdateAffiliateBalance.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            success: true
        });
		
		expect(adminUpdateAffiliateBalance.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true
        });
		
		affiliateData = await campaignContract.getAffiliateData(BigInt(0));
		expect(affiliateData!.withdrawEarnings).toBe(toNano('10'));
    });
 
});
