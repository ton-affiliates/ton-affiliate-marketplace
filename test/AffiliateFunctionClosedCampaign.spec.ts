


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
// 9125: withdrawableAmount must be <= pendingApprovalEarnings
// 10630: Must withdraw a positive amount
// 11661: Only advertiser can verify these events
// 12734: Can only add op codes
// 12843: Must be in state: STATE_CAMPAIGN_CREATED or have zero affiliates
// 12969: Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER
// 14486: Cannot find cpa for the given op code
// 19587: Only the advertiser can remove an existing affiliate
// 20411: Insufficient contract funds to repay bot
// 24142: Campaign is not active
// 26205: Only USDT Campaigns can accept USDT
// 26924: affiliate not approved yet
// 26953: Only affiliate can withdraw funds
// 27356: Only advertiser can add user op codes
// 33594: Cannot manually add affiliates to an open campaign
// 34905: Bot can verify only op codes under 2000
// 36010: Value of user action has to be a minimum of 0.02 TON
// 36363: Only the advertiser can remove the campaign and withdraw all funds
// 39945: Advertiser can only modify affiliate accrued earnings only if campaign is setup this requiresApprovalForWithdrawlFlag
// 39963: Insufficient funds!
// 40058: Campaign has no funds
// 40368: Contract stopped
// 40466: Insufficient funds to deploy new campaign
// 40755: Only advertiser can send tokens to this contract
// 42372: Only bot can invoke this function
// 44215: Invalid indices
// 44534: Cannot replay message
// 45028: Insufficient gas fees to withdraw earnings
// 46629: Reached max number of affiliates for this campaign
// 48069: Affiliate does not exist for this id
// 48874: Insufficient contract funds to make payment
// 49065: Invalid value for isAllowed
// 49469: Access denied
// 49782: affiliate not on allowed list
// 50865: owner must be deployer
// 53205: Only the advertiser can replenish the contract
// 53296: Contract not stopped
// 53456: Affiliate does not exist
// 56536: Insufficient gas fees to create affiliate
// 57567: Only advertiser can set campaign details
// 59035: Only contract wallet allowed to invoke
// 60644: Advertiser can verify only op codes over 2000
// 61090: Value of user action has to be a minimum of 0.1 USDT

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
import { hexToCell } from '../scripts/utils'
import {
      loadAffiliateCreatedEvent,
      loadCampaignCreatedEvent,
  	  loadAdvertiserWithdrawFundsEvent,
	  loadAdvertiserSignedCampaignDetailsEvent,
	  loadAffiliateAskToJoinAllowedListEvent,
	  loadAdvertiserApprovedAffiliateToJoinAllowedListEvent,
	  loadAdvertiserRemovedAffiliateFromAllowedListEvent} from '../scripts/events';
	  
import { USDT_MASTER_ADDRESS, USDT_WALLET_BYTECODE } from '../scripts/constants'

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

beforeEach(async () => {
    // Initialize blockchain and deployer wallets
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    bot = await blockchain.treasury('bot');
    advertiser = await blockchain.treasury('advertiser');
    affiliate1 = await blockchain.treasury('affiliate1');
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
    regularUsersMapCostPerActionMap.set(BigInt(0), toNano('0.1')); // Sample op code

    await campaignContract.send(
        advertiser.getSender(),
        { value: toNano('10') }, // Adding funds
        {
            $$type: 'AdvertiserSetCampaignDetails',
            campaignDetails: {
                $$type: 'CampaignDetails',
                regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                premiumUsersCostPerAction: regularUsersMapCostPerActionMap,
                allowedAffiliates: Dictionary.empty<Address, boolean>(),
                isPublicCampaign: false,
                campaignValidForNumDays: null,
				paymentMethod: BigInt(0), // TON
				requiresAdvertiserApprovalForWithdrawl: true
            }
        }
    );
});

describe('Affiliate Actions - Positive and Negative Tests for Affiliate Functions', () => {

    it('should allow affiliate to ask to join a campaign and allow advertiser to approve', async () => {
	
		let createAffiliateResult = await campaignContract.send(
			affiliate1.getSender(),
			{ value: toNano('0.05') },
			{ $$type: 'AffiliateCreateNewAffiliate' }
		);

		expect(createAffiliateResult.transactions).toHaveTransaction({
			from: affiliate1.address,
			to: campaignContract.address,
			success: false, // 49782: affiliate not on allowed list 
			exitCode: 49782
		});
		
		// affiliate ask to join campaign 
		const affiliateAskToJoinAllowedListResult = await campaignContract.send(
            affiliate1.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AffiliateAskToJoinAllowedList'
            }
        );
		
		expect(affiliateAskToJoinAllowedListResult.transactions).toHaveTransaction({
            from: affiliate1.address,
            to: campaignContract.address,
            success: true
        });
		
		let decodedAffiliateAskToJoinAllowedList: any | null = null;
        for (const external of affiliateAskToJoinAllowedListResult.externals) {
            if (external.body) {
                decodedAffiliateAskToJoinAllowedList = loadAffiliateAskToJoinAllowedListEvent(external.body);
            }
        }
		
        expect(decodedAffiliateAskToJoinAllowedList).not.toBeNull();
        expect(BigInt(decodedAffiliateAskToJoinAllowedList!.campaignId)).toBe(campaignId);
		
		
		
		let campaignData = await campaignContract.getCampaignData();
		let affiliate1AddedToAllowedListOnHold = false;
		
		for (const [affiliate, isAllowed] of campaignData.campaignDetails.allowedAffiliates) {
			//console.log(`Affiliate: ${affiliate}, isAllowed: ${isAllowed}`);
			if (affiliate.toString() == affiliate1.address.toString() && isAllowed == false) {
				affiliate1AddedToAllowedListOnHold = true;
			}
		}
		
		expect(affiliate1AddedToAllowedListOnHold).toBe(true);
		
		createAffiliateResult = await campaignContract.send(
			affiliate1.getSender(),
			{ value: toNano('0.05') },
			{ $$type: 'AffiliateCreateNewAffiliate' }
		);

		expect(createAffiliateResult.transactions).toHaveTransaction({
			from: affiliate1.address,
			to: campaignContract.address,
			success: false, // 26924: affiliate not approved yet 
			exitCode: 26924
		});
		
		
		//----
		
		// Now advertiser approves Affiliate
		const advetiserApprovesRequestResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserAddNewAffiliateToAllowedList',
				affiliate: affiliate1.address
            }
        );
		
		expect(advetiserApprovesRequestResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });
		
		let decodedAdvertiserApprovedAffiliateToJoinAllowedListEvent: any | null = null;
        for (const external of advetiserApprovesRequestResult.externals) {
            if (external.body) {
                decodedAdvertiserApprovedAffiliateToJoinAllowedListEvent = loadAdvertiserApprovedAffiliateToJoinAllowedListEvent(external.body);
            }
        }
		
		expect(decodedAdvertiserApprovedAffiliateToJoinAllowedListEvent).not.toBeNull();
		
		campaignData = await campaignContract.getCampaignData();
		let affiliate1AddedToAllowedListApproved = false;
		
		for (const [affiliate, isAllowed] of campaignData.campaignDetails.allowedAffiliates) {
			//console.log(`Affiliate: ${affiliate}, isAllowed: ${isAllowed}`);
			if (affiliate.toString() == affiliate1.address.toString() && isAllowed == true) {
				affiliate1AddedToAllowedListApproved = true;
			}
		}
		
		expect(affiliate1AddedToAllowedListApproved).toBe(true);
		
		// -----
		
		// finally, affiliate can create a new affiliate
		createAffiliateResult = await campaignContract.send(
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
	
	it('should not allow unauthorizedUser to approve other affiliates', async () => {
	
		const unauthorizedUserApprovesRequestResult = await campaignContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserAddNewAffiliateToAllowedList',
				affiliate: affiliate1.address
            }
        );
		
		expect(unauthorizedUserApprovesRequestResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: campaignContract.address,
            success: false, // 4138: Only the advertiser can add a new affiliate
			exitCode: 4138
        });
	
	});
	
	
	it('should not allow unauthorizedUser to remove other affiliates', async () => {
	
		const unauthorizedUseRemoveALlowedAffiliaterResult = await campaignContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'AdvertiserRemoveExistingAffiliateFromAllowedList',
				affiliate: affiliate1.address
            }
        );
		
		expect(unauthorizedUseRemoveALlowedAffiliaterResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: campaignContract.address,
            success: false, // 19587: Only the advertiser can remove an existing affiliate
			exitCode: 19587
        });
	
	});

    
});
