


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
// 2432: Only contract wallet can invoke
// 2509: Must have at least one wallet to withdraw to
// 3688: Not mintable
// 4138: Only the advertiser can add a new affiliate
// 4429: Invalid sender
// 7226: Only advertiser can approve withdrawal
// 11661: Only advertiser can verify these events
// 12241: Max supply exceeded
// 12969: Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER
// 13965: Invalid destinationId!
// 14486: Cannot find cpa for the given op code
// 14534: Not owner
// 16059: Invalid value
// 17062: Invalid amount
// 18026: Only advertiser can modify affiliates withdrawl flag
// 18668: Can't Mint Anymore
// 19587: Only the advertiser can remove an existing affiliate
// 23951: Insufficient gas
// 26205: Only USDT Campaigns can accept USDT
// 26924: affiliate not approved yet
// 26953: Only affiliate can withdraw funds
// 27029: Cannot take from Affiliate more than their pendingApprovalEarnings
// 30892: Only owner can deploy
// 33318: Insufficient funds to repay parent for deployment and keep buffer
// 33594: Cannot manually add affiliates to an open campaign
// 34085: Only TON supported as payment method
// 34905: Bot can verify only op codes under 2000
// 35494: Affiliate with requiresAdvertiserApprovalForWithdrawl flag
// 36363: Only the advertiser can remove the campaign and withdraw all funds
// 38795: Advertiser can only modify requiresApprovalForWithdrawlFlag if campaign is setup this way
// 39945: Advertiser can only modify affiliate accrued earnings only if campaign is setup this requiresApprovalForWithdrawlFlag
// 40058: Campaign has no funds
// 40368: Contract stopped
// 40755: Only advertiser can send tokens to this contract
// 42708: Invalid sender!
// 43100: Reached max number of affiliates for this campagn
// 43422: Invalid value - Burn
// 44215: Invalid indices
// 44318: Only bot can Deploy new Campaign
// 48874: Insufficient contract funds to make payment
// 49469: Access denied
// 49782: affiliate not on allowed list
// 50865: owner must be deployer
// 52003: Campaign is expired
// 53205: Only the advertiser can replenish the contract
// 53296: Contract not stopped
// 53456: Affiliate does not exist
// 54206: Insufficient campaign balance to make payment
// 57013: Affiliate without requiresAdvertiserApprovalForWithdrawl flag
// 57313: Must be in state: STATE_CAMPAIGN_CREATED
// 58053: OP codes for regular and premium users must match
// 59035: Only contract wallet allowed to invoke
// 60644: Advertiser can verify only op codes over 2000
// 62634: Only bot can invoke User Actions
// 62972: Invalid balance

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
let unauthorizedUser: SandboxContract<TreasuryContract>;


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
                    allowedAffiliates: Dictionary.empty<Address, boolean>().set(affiliate1.address, true),
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
                    allowedAffiliates: Dictionary.empty<Address, boolean>().set(affiliate1.address, true),
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
                    allowedAffiliates: Dictionary.empty<Address, boolean>().set(affiliate1.address, true),
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
	
	it('should allow the advertiser to add and remove afiliate from allowed list', async () => {
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
                    allowedAffiliates: Dictionary.empty<Address, boolean>().set(affiliate1.address, true),
                    isPublicCampaign: false,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );

        const addAffiliateToAllowedListResult = await campaignContract.send(
            advertiser.getSender(),
            { 
				value: toNano('0.05') },
            { 
				$$type: 'AdvertiserAddNewAffiliateToAllowedList',
                affiliate: affiliate2.address 
			}
        );

        expect(addAffiliateToAllowedListResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });

        let campaignData = await campaignContract.getCampaignData();
        let afiliate2OnAllowedList = false;
		for (const [key, value] of campaignData.campaignDetails.allowedAffiliates) {
			if (affiliate2.address.toString() == key.toString()) {
				afiliate2OnAllowedList = true;
			}
		}
		
		expect(afiliate2OnAllowedList).toBe(true);
		
		//------------------------------------------------------
		
		const removeAffiliateFromAllowedListResult = await campaignContract.send(
            advertiser.getSender(),
            { 
				value: toNano('0.05') },
            { 
				$$type: 'AdvertiserRemoveExistingAffiliateFromAllowedList',
                affiliate: affiliate1.address 
			}
        );

        expect(removeAffiliateFromAllowedListResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true
        });

        campaignData = await campaignContract.getCampaignData();
        let afiliate1OnAllowedList = false;
		for (const [key, value] of campaignData.campaignDetails.allowedAffiliates) {
			if (affiliate1.address.toString() == key.toString()) {
				afiliate1OnAllowedList = true;
			}
		}
		
		expect(afiliate1OnAllowedList).toBe(false);
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
                    allowedAffiliates: Dictionary.empty<Address, boolean>().set(affiliate1.address, true),
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
        regularUsersMapCostPerActionMap.set(BigInt(2001), toNano('0.2')); // Custom op code for advertiser action

        await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('10') },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: regularUsersMapCostPerActionMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>().set(affiliate1.address, true),
                    isPublicCampaign: true,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );
		
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
                userActionOpCode: BigInt(2001), // Custom op code set by advertiser
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
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
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
        regularUsersMapCostPerActionMap.set(BigInt(2001), toNano('0.2')); // Custom op code for advertiser action

        await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('10') },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: regularUsersMapCostPerActionMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>().set(affiliate1.address, true),
                    isPublicCampaign: true,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );
		
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
                userActionOpCode: BigInt(2001), // Custom op code set by advertiser
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
        regularUsersMapCostPerActionMap.set(BigInt(2001), toNano('0.2')); // Custom op code for advertiser action

        await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('10') },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: regularUsersMapCostPerActionMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>().set(affiliate1.address, true),
                    isPublicCampaign: true,
                    campaignValidForNumDays: null,
					paymentMethod: BigInt(0), // TON
					requiresAdvertiserApprovalForWithdrawl: true
                }
            }
        );
		
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
                userActionOpCode: BigInt(2001), // Custom op code set by advertiser
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
