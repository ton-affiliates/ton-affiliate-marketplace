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
// 2509: Must have at least one wallet to withdraw to
// 4138: Only the advertiser can add a new affiliate
// 5136: Only TON or USDT supported as payment methods
// 7226: Only advertiser can approve withdrawal
// 10630: Must withdraw a positive amount
// 11661: Only advertiser can verify these events
// 12969: Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER
// 14486: Cannot find cpa for the given op code
// 17062: Invalid amount
// 18026: Only advertiser can modify affiliates withdrawl flag
// 19587: Only the advertiser can remove an existing affiliate
// 24142: Campaign is not active
// 26205: Only USDT Campaigns can accept USDT
// 26924: affiliate not approved yet
// 26953: Only affiliate can withdraw funds
// 27029: Cannot take from Affiliate more than their pendingApprovalEarnings
// 33318: Insufficient funds to repay parent for deployment and keep buffer
// 33594: Cannot manually add affiliates to an open campaign
// 34905: Bot can verify only op codes under 2000
// 35494: Affiliate with requiresAdvertiserApprovalForWithdrawl flag
// 36010: Value of user action has to be a minimum of 0.02 TON
// 36363: Only the advertiser can remove the campaign and withdraw all funds
// 39945: Advertiser can only modify affiliate accrued earnings only if campaign is setup this requiresApprovalForWithdrawlFlag
// 40058: Campaign has no funds
// 40368: Contract stopped
// 40755: Only advertiser can send tokens to this contract
// 42372: Only bot can invoke this function
// 43100: Reached max number of affiliates for this campagn
// 44215: Invalid indices
// 44318: Only bot can Deploy new Campaign
// 47193: Insufficient funds to repay parent for deployment
// 48069: Affiliate does not exist for this id
// 48874: Insufficient contract funds to make payment
// 49469: Access denied
// 49782: affiliate not on allowed list
// 50865: owner must be deployer
// 53205: Only the advertiser can replenish the contract
// 53296: Contract not stopped
// 53456: Affiliate does not exist
// 54206: Insufficient campaign balance to make payment
// 57013: Affiliate without requiresAdvertiserApprovalForWithdrawl flag
// 57313: Must be in state: STATE_CAMPAIGN_CREATED
// 58053: OP codes for regular and premium users must match
// 59035: Only contract wallet allowed to invoke
// 60644: Advertiser can verify only op codes over 2000
// 61090: Value of user action has to be a minimum of 0.1 USDT


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
import { USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE } from '../scripts/constants'
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
let affiliate3: SandboxContract<TreasuryContract>;
let affiliate4: SandboxContract<TreasuryContract>;
let unauthorizedUser: SandboxContract<TreasuryContract>;
let decodedCampaign: any | null;

const BOT_OP_CODE_USER_CLICK = 0;
const ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = 2001;


let campaignId = BigInt(0);


beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate1 = await blockchain.treasury('affiliate1');
	affiliate2 = await blockchain.treasury('affiliate2');
	affiliate3 = await blockchain.treasury('affiliate3');
	affiliate4 = await blockchain.treasury('affiliate4');
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
                premiumUsersCostPerAction: regularUsersMapCostPerActionMap,  // same pricing for premium and regular users
                allowedAffiliates: Dictionary.empty<Address, boolean>(),
                isOpenCampaign: true,
				campaignValidForNumDays: null, // no expiration
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
	
	// Register affiliate1 in the campaign by creating their affiliate link
    let createAffiliateResult = await campaignContract.send(
        affiliate1.getSender(),
        { value: toNano('0.05') },
        { $$type: 'AffiliateCreateNewAffiliate' }
    );

    expect(createAffiliateResult.transactions).toHaveTransaction({
        from: affiliate1.address,
        to: campaignContract.address,
        success: true
    });
	
	// Register affiliate2 in the campaign by creating their affiliate link
    createAffiliateResult = await campaignContract.send(
        affiliate2.getSender(),
        { value: toNano('0.05') },
        { $$type: 'AffiliateCreateNewAffiliate' }
    );

    expect(createAffiliateResult.transactions).toHaveTransaction({
        from: affiliate2.address,
        to: campaignContract.address,
        success: true
    });
	
	// Register affiliate3 in the campaign by creating their affiliate link
    createAffiliateResult = await campaignContract.send(
        affiliate3.getSender(),
        { value: toNano('0.05') },
        { $$type: 'AffiliateCreateNewAffiliate' }
    );

    expect(createAffiliateResult.transactions).toHaveTransaction({
        from: affiliate3.address,
        to: campaignContract.address,
        success: true
    });
	
	// Register affiliate4 in the campaign by creating their affiliate link
    createAffiliateResult = await campaignContract.send(
        affiliate4.getSender(),
        { value: toNano('0.05') },
        { $$type: 'AffiliateCreateNewAffiliate' }
    );

    expect(createAffiliateResult.transactions).toHaveTransaction({
        from: affiliate4.address,
        to: campaignContract.address,
        success: true
    });
});

describe('Verify campaign shows top 3 affiliates correctly', () => {

    it('should update top affiliates successfully', async () => {
	
		let campaignData = await campaignContract.getCampaignData();
		let topAffiliates = campaignData.topAffiliates;
		
		let numAffiliatesInTop = 0;	
		for (const [affiliate, earnings] of topAffiliates) {
			console.log(`Affiliate ID: ${affiliate}, Earnings: ${earnings}`);
			numAffiliatesInTop++;
		}
					
		expect(numAffiliatesInTop).toBe(0);
		
		//affiliate 1  - 1 ton
		let premiumUserActionResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: BigInt(0),
                userActionOpCode: BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT),
                isPremiumUser: true,
            }
        );
		
		expect(premiumUserActionResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });
		
		// --------
		
		//affiliate 2  - 1 ton
		premiumUserActionResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: BigInt(1),
                userActionOpCode: BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT),
                isPremiumUser: true,
            }
        );
		
		expect(premiumUserActionResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });
		
		// --------
		
		//affiliate 3  - 0.1 ton
		premiumUserActionResult = await campaignContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BotUserAction',
                affiliateId: BigInt(2),
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
                isPremiumUser: true,
            }
        );
		
		expect(premiumUserActionResult.transactions).toHaveTransaction({
            from: bot.address,
            to: campaignContract.address,
            success: true
        });
		
		// -----------------------------
		
		campaignData = await campaignContract.getCampaignData();
		topAffiliates = campaignData.topAffiliates;
		
		numAffiliatesInTop = 0;	
		let affiliate3InTop = false;
		for (const [affiliate, earnings] of topAffiliates) {
			console.log(`Affiliate ID: ${affiliate}, Earnings: ${earnings}`);
			if (affiliate == BigInt(2)) {
				affiliate3InTop = true;
			}
			numAffiliatesInTop++;
		}
			
		expect(numAffiliatesInTop).toBe(3);
		expect(affiliate3InTop).toBe(true);
		
		//-----------------------------------------
		
		// affiliate 4 - 1 ton
		premiumUserActionResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserUserAction',
                affiliateId: BigInt(3),
                userActionOpCode: BigInt(ADVERTISER_OP_CODE_CUSTOMIZED_EVENT),
                isPremiumUser: true,
            }
        );
		
		expect(premiumUserActionResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });
		
		//----------------------------------
		
		campaignData = await campaignContract.getCampaignData();
		topAffiliates = campaignData.topAffiliates;
		
		numAffiliatesInTop = 0;	
		affiliate3InTop = false;
		for (const [affiliate, earnings] of topAffiliates) {
			console.log(`Affiliate ID: ${affiliate}, Earnings: ${earnings}`);
			if (affiliate == BigInt(2)) {
				affiliate3InTop = true;
			}
			numAffiliatesInTop++;
		}
			
		expect(numAffiliatesInTop).toBe(3);
		expect(affiliate3InTop).toBe(false);

		
    });

 
});
