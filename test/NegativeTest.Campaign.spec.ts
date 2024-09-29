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
import { loadCampaignCreatedEvent } from './events'; // Ensure this utility is correctly set up for testing

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
let deployer: SandboxContract<TreasuryContract>;
let bot: SandboxContract<TreasuryContract>;
let advertiser: SandboxContract<TreasuryContract>;
let affiliate: SandboxContract<TreasuryContract>;
let unauthorizedUser: SandboxContract<TreasuryContract>;
let campaignContract:  SandboxContract<Campaign>

const BOT_OP_CODE_USER_CLICK = 0;
const ADVERTISER_OP_CODE_CUSTOMIZED_EVENT = 201;


//2417: daysWithoutUserActionForWithdrawFunds must be greater than MIN_NUM_DAYS_NO_USER_ACTION_WITHDRAW_FUNDS
//2509: Must have at least one wallet to withdraw to
//2839: Only the verifier contract can invoke this function
//4138: Only the advertiser can add a new affiliate
//6812: affiliate is on allowed list already
//7477: Must be in states: [STATE_CAMPAIGN_INACTIVE, STATE_CAMPAIGN_ACTIVE]
//9282: Only advertiser can invoke this function
//11398: Advertiser can withdraw funds only after agreed upon time period with no user action
//12533: Must be in state: STATE_CAMPAIGN_ACTIVE
//14486: Cannot find cpa for the given op code
//16628: cpa must be greater than min cost for premium user action
//31512: Can only replenish via 'AdvertiserReplenish' function
//32363: No earnings to withdraw
//33594: Cannot manually add affiliates to an open campaign
//36363: Only the advertiser can remove the campaign and withdraw all funds
//40368: Contract stopped
//41412: Only affiliate can withdraw earnings
//43100: Reached max number of affiliates for this campagn
//44322: parent must be deployer
//48874: Insufficient contract funds to make payment
//49469: Access denied
//49782: affiliate not on allowed list
//51754: Insufficient funds
//53205: Only the advertiser can replenish the contract
//53296: Contract not stopped
//53456: Affiliate does not exist
//54759: cpa must be greater than min cost for user action
//55162: Must be in state: STATE_CAMPAIGN_CREATED or have no affiliates at all
//61787: Only parent can upate fee percentage
//62634: Only bot can invoke User Actions
//63505: Must be in states: [STATE_CAMPAIGN_INACTIVE, STATE_CAMPAIGN_ACTIVE]
//63968: Insufficient funds.  Need at least 20 Ton.






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

    // Deploy a new Campaign contract through the AffiliateMarketplace
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
    campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));

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
});


describe('Negative Tests for Campaign', () => {

     it('should fail to replenish the campaign with insufficient amount', async () => {

        const replenishResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('10') }, // Less than MIN_AMOUNT_REPLENISH_CAMPAIGN
            { $$type: 'AdvertiserReplenish' }
        );

        expect(replenishResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false, //63968: Insufficient funds.  Need at least 20 Ton.
			exitCode: 63968
        });
    });

    // Affiliate Actions
    it('should fail to create an affiliate when campaign is closed and not in allowed list', async () => {
	
		const advertiserReplenishResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('20'),
            },
            {
                $$type: 'AdvertiserReplenish'
            }
        );

        expect(advertiserReplenishResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });


        const createAffiliateResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.05') },
            { $$type: 'CreateNewAffiliate' }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: affiliate.address,
            to: campaignContract.address,
            success: false, //49782: affiliate not on allowed list
			exitCode: 49782
        });
    });

    // Test: Unauthorized Campaign Removal
    it('should fail when a non-advertiser tries to remove the campaign and withdraw funds', async () => {

        unauthorizedUser = await blockchain.treasury('unauthorizedUser');
		
		const advertiserReplenishResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('20'),
            },
            {
                $$type: 'AdvertiserReplenish'
            }
        );

        expect(advertiserReplenishResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });

        // Attempt to remove the campaign by a non-advertiser user
        const removeCampaignResult = await campaignContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            { $$type: 'RemoveCampaignAndWithdrawFunds' }
        );

        expect(removeCampaignResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: campaignContract.address,
            success: false, //36363: Only the advertiser can remove the campaign and withdraw all funds
			exitCode: 36363

        });
    });
	
	it('should fail to replenish the campaign via AddNewAffiliateToAllowedList', async () => {
	
		const advertiserReplenishResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('20'),
            },
            {
                $$type: 'AdvertiserReplenish'
            }
        );

        expect(advertiserReplenishResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });

	
        const addNewAffiliateToAllowedListExcessiveFundsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('50') }, 
            { $$type: 'AddNewAffiliateToAllowedList',
			  affiliate: affiliate.address
			}
        );
		
        expect(addNewAffiliateToAllowedListExcessiveFundsResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false, //31512: Can only replenish via 'AdvertiserReplenish' function
			exitCode: 31512,
			
        });
    });
	
	it('should fail to RemoveCampaignAndWithdrawFunds before expiration of daysWithoutUserActionForWithdrawFunds', async () => {
	
	
		const advertiserReplenishResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('20'),
            },
            {
                $$type: 'AdvertiserReplenish'
            }
        );

        expect(advertiserReplenishResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });
		
		// need at least one Affiliate
		const addNewAffiliateToAllowedListResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') }, 
            { $$type: 'AddNewAffiliateToAllowedList',
			  affiliate: affiliate.address
			}
        );

        expect(addNewAffiliateToAllowedListResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true, 
        });
		
		const createAffiliateResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.1') },
            { $$type: 'CreateNewAffiliate' }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: affiliate.address,
            to: campaignContract.address,
            success: true, 
        });
		
		// user Action
		const userActionResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'UserAction',
                campaignId: BigInt(0),
                affiliateId: BigInt(0),
                advertiser: advertiser.address,
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
                isPremiumUser: false,
            }
        );

        expect(userActionResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true,
        });
	

        const removeCampaignAndWithdrawFundsResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') }, 
            { $$type: 'RemoveCampaignAndWithdrawFunds' }
        );

        expect(removeCampaignAndWithdrawFundsResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: false, //11398: Advertiser can withdraw funds only after agreed upon time period with no user action
			exitCode: 11398
        });
    });
	
	it('should fail if someone other than the affiliate tries to  withdraw earnings', async () => {
		
		unauthorizedUser = await blockchain.treasury('unauthorizedUser');
		
		const advertiserReplenishResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('20'),
            },
            {
                $$type: 'AdvertiserReplenish'
            }
        );

        expect(advertiserReplenishResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true,
        });
		
        const addNewAffiliateToAllowedListResult = await campaignContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') }, 
            { $$type: 'AddNewAffiliateToAllowedList',
			  affiliate: affiliate.address
			}
        );

        expect(addNewAffiliateToAllowedListResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContract.address,
            success: true, 
        });
		
		const createAffiliateResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.05') },
            { $$type: 'CreateNewAffiliate' }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: affiliate.address,
            to: campaignContract.address,
            success: true, // affiliateId = 0
        });
		
		// user Action
		const userActionResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'UserAction',
                campaignId: BigInt(0),
                affiliateId: BigInt(0),
                advertiser: advertiser.address,
                userActionOpCode: BigInt(BOT_OP_CODE_USER_CLICK),
                isPremiumUser: false,
            }
        );

        expect(userActionResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContract.address,
            success: true,
        });
		
		
		// AffiliateWithdrawResult
        const unauthorizedUserWithdrawResult = await campaignContract.send(
            unauthorizedUser.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateWithdrawEarnings', affiliateId: BigInt(0) }
        );

        expect(unauthorizedUserWithdrawResult.transactions).toHaveTransaction({
            from: unauthorizedUser.address,
            to: campaignContract.address,
            success: false,  //41412: Only affiliate can withdraw earnings
			exitCode: 41412
        });
		
		// affiliate can withdraw funds
		const affiliateWithdrawResult = await campaignContract.send(
            affiliate.getSender(),
            { value: toNano('0.05') },
            { $$type: 'AffiliateWithdrawEarnings', affiliateId: BigInt(0) }
        );

        expect(affiliateWithdrawResult.transactions).toHaveTransaction({
            from: affiliate.address,
            to: campaignContract.address,
            success: true,
        });
    });

});
