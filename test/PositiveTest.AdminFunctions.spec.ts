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
import { loadCampaignCreatedEvent } from './events'; // Ensure this utility is correctly set up for testing

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
let deployer: SandboxContract<TreasuryContract>;
let bot: SandboxContract<TreasuryContract>;
let advertiser: SandboxContract<TreasuryContract>;
let affiliate: SandboxContract<TreasuryContract>;

const BOT_OP_CODE_USER_CLICK = 0;
const ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = 201;

beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate = await blockchain.treasury('affiliate');

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

});

describe('Administrative Actions - positive test', () => {

    it('should modify fee percentage of existing campaign successfully', async () => {
        
		 // 1. Deploy a new Campaign contract through the AffiliateMarketplace
		const createCampaignResult = await affiliateMarketplaceContract.send(
			advertiser.getSender(),
			{ value: toNano('0.13') }, // Sufficient funds to deploy the campaign
			{ $$type: 'CreateCampaign' }
		);

		expect(createCampaignResult.transactions).toHaveTransaction({
			from: advertiser.address,
			to: affiliateMarketplaceContract.address,
			success: true,
		});

		// Retrieve the deployed Campaign contract address from the emitted event
		let decodedCampaign: any | null = null;
		for (const external of createCampaignResult.externals) {
			if (external.body) {
				decodedCampaign = loadCampaignCreatedEvent(external.body); // Assuming loadCampaignCreatedEvent parses the event correctly
			}
		}
		expect(decodedCampaign).not.toBeNull();

		const campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);
		let campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));

		const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
		regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('0.1'));
		regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('1'));

		const setCampaignDetailsResult = await campaignContract.send(
			advertiser.getSender(),
			{ value: toNano('0.05') },
			{
				$$type: 'AdvertiserSetCampaignDetails',
				campaignDetails: {
					$$type: 'CampaignDetails',
					regularUsersCostPerAction: regularUsersMapCostPerActionMap,
					premiumUsersCostPerAction: Dictionary.empty<bigint, bigint>(),
					allowedAffiliates: Dictionary.empty<Address, boolean>(),
					isOpenCampaign: false,
					daysWithoutUserActionForWithdrawFunds: 21n,
					campaignBalanceNotifyAdvertiserThreshold: toNano("5")
				}
			}
		);

		expect(setCampaignDetailsResult.transactions).toHaveTransaction({
			from: advertiser.address,
			to: campaignContract.address,
			success: true
		});
		
		// 2. modify campaign's percentage fee from 2% (200) to 1.5% (150)
		const adminModifyCampaignFeeResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminModifyCampaignFeePercentage',
                campaignId: BigInt(decodedCampaign!.campaignId), 
                advertiser: advertiser.address,
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
        
		 // 1. Deploy a new Campaign contract through the AffiliateMarketplace
		const createCampaignResult = await affiliateMarketplaceContract.send(
			advertiser.getSender(),
			{ value: toNano('0.13') }, // Sufficient funds to deploy the campaign
			{ $$type: 'CreateCampaign' }
		);

		expect(createCampaignResult.transactions).toHaveTransaction({
			from: advertiser.address,
			to: affiliateMarketplaceContract.address,
			success: true,
		});

		// Retrieve the deployed Campaign contract address from the emitted event
		let decodedCampaign: any | null = null;
		for (const external of createCampaignResult.externals) {
			if (external.body) {
				decodedCampaign = loadCampaignCreatedEvent(external.body); // Assuming loadCampaignCreatedEvent parses the event correctly
			}
		}
		expect(decodedCampaign).not.toBeNull();

		const campaignContractAddress: Address = Address.parse(decodedCampaign!.campaignContractAddressStr);
		let campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));

		const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
		regularUsersMapCostPerActionMap.set(BigInt(BOT_OP_CODE_USER_CLICK), toNano('0.1'));
		regularUsersMapCostPerActionMap.set(BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT), toNano('1'));

		const setCampaignDetailsResult = await campaignContract.send(
			advertiser.getSender(),
			{ value: toNano('0.05') },
			{
				$$type: 'AdvertiserSetCampaignDetails',
				campaignDetails: {
					$$type: 'CampaignDetails',
					regularUsersCostPerAction: regularUsersMapCostPerActionMap,
					premiumUsersCostPerAction: Dictionary.empty<bigint, bigint>(),
					allowedAffiliates: Dictionary.empty<Address, boolean>(),
					isOpenCampaign: false,
					daysWithoutUserActionForWithdrawFunds: 21n,
					campaignBalanceNotifyAdvertiserThreshold: toNano("5")
				}
			}
		);

		expect(setCampaignDetailsResult.transactions).toHaveTransaction({
			from: advertiser.address,
			to: campaignContract.address,
			success: true
		});
		
		// 2. stop campaign
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
		
	
		// receive("Resume") is added automatically to allow owner to resume the contract
		// receive("Stop") is added automatically to allow owner to stop the contract
		// get fun stopped(): Bool is added automatically to query if contract is stopped
		// get fun owner(): Address is added automatically to query who the owner is
	});
 
});
