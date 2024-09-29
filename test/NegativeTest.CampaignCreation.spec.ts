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
import '@ton/test-utils'; // Ensure this utility is correctly set up for testing

// Set up global variables and initial state
let blockchain: Blockchain;
let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
let deployer: SandboxContract<TreasuryContract>;
let bot: SandboxContract<TreasuryContract>;
let advertiser: SandboxContract<TreasuryContract>;

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

describe('Negative Tests for AffiliateMarketplace Contract', () => {
    
	// Campaign Creation - insufficient funds
    it('should fail to create a campaign with insufficient funds', async () => {
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            { value: toNano('0.05') }, // Less than DEPLOY_NEW_CAMPAIGN_COST
            { $$type: 'CreateCampaign' }
        );

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //51754: Insufficient funds
			exitCode: 51754
        });
    });
	
	// Campaign Creation - excessive funds
    it('should fail to create a campaign with excessive funds', async () => {
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            { value: toNano('0.5') }, // more than MAX_MESSAGE_VAL_NO_REPLENISH which is 0.15
            { $$type: 'CreateCampaign' }
        );

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: false, //31512: Can only replenish via 'AdvertiserReplenish' function
			exitCode: 31512
        });
    });

});
