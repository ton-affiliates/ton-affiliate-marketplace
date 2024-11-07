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
import { hexToCell, USDT_MAINNET_ADDRESS, USDT_WALLET_BYTECODE } from './utils'


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
const ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = 2001;


let campaignId = BigInt(0);

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
// 13: Out of gas error
// 32: Method ID not found
// 34: Action is invalid or not supported
// 37: Not enough TON
// 38: Not enough extra-currencies
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
// 2509: Must have at least one wallet to withdraw to
// 4138: Only the advertiser can add a new affiliate
// 11661: Only advertiser can verify these events
// 12969: Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER
// 14486: Cannot find cpa for the given op code
// 32363: No earnings to withdraw
// 33594: Cannot manually add affiliates to an open campaign
// 34905: Bot can verify only op codes under 2000
// 36363: Only the advertiser can remove the campaign and withdraw all funds
// 40058: Campaign has no funds
// 40368: Contract stopped
// 41412: Only affiliate can withdraw earnings
// 43100: Reached max number of affiliates for this campagn
// 44318: Only bot can Deploy new Campaign
// 47193: Insufficient funds to repay parent for deployment
// 48874: Insufficient contract funds to make payment
// 49469: Access denied
// 49782: affiliate not on allowed list
// 50865: owner must be deployer
// 52003: Campaign is expired
// 53205: Only the advertiser can replenish the contract
// 53296: Contract not stopped
// 53456: Affiliate does not exist
// 54206: Insufficient campaign balance to make payment
// 57313: Must be in state: STATE_CAMPAIGN_CREATED
// 58053: OP codes for regular and premium users must match
// 60644: Advertiser can verify only op codes over 2000
// 62634: Only bot can invoke User Actions


beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate1 = await blockchain.treasury('affiliate1');
    unauthorizedUser = await blockchain.treasury('unauthorizedUser');

    // Deploy AffiliateMarketplace contract
    affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address, USDT_MAINNET_ADDRESS, hexToCell(USDT_WALLET_BYTECODE)));
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
                allowedAffiliates: Dictionary.empty<Address, boolean>(),
                isOpenCampaign: false,
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

describe('Administrative Actions - Negative Tests for AffiliateMarketplace Contract Admin functions', () => {

	it('should fail when a non-owner tries to seize campaign balance', async () => {
        const adminSeizeCampaignBalanceResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminSeizeCampaignBalance',
                campaignId: campaignId 
            }
        );

        expect(adminSeizeCampaignBalanceResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //132: Access denied
			exitCode: 132
        });
    });

    it('should fail when a non-owner tries to update the campaign fee percentage', async () => {
        const adminModifyCampaignFeeResult = await affiliateMarketplaceContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdminModifyCampaignFeePercentage',
                campaignId: campaignId, 
                feePercentage: BigInt(150), // 1.5%
            }
        );

        expect(adminModifyCampaignFeeResult.transactions).toHaveTransaction({
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
                campaignId: campaignId
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
                campaignId: campaignId
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
