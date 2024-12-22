import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS, MAX_ATTEMPTS, GAS_FEE } from '../constants'
import { parseBigIntToPriceMap } from '../utils'

export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();
	
	const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS));
    const campaignId = BigInt(args.length > 0 ? args[0] : await ui.input('Campaign id'));
	const advertiser = Address.parse(args.length > 1 ? args[1] : await ui.input('Advertiser address'));	
	
	let campaignAddress = await affiliateMarketplace.getCampaignContractAddress(campaignId, advertiser);
	if (!(await provider.isContractDeployed(campaignAddress))) {
        ui.write(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }
	
	const campaignContract = provider.open(Campaign.fromAddress(campaignAddress));
    let campaignData = await campaignContract.getCampaignData();
	const stateBefore = campaignData.state;
		
	if (stateBefore !== 0n) {
		ui.write(`Error: Contract at address ${campaignAddress} has already set the details!`);
        return;
	}
	
	const regularUsersMapCostPerActionMapAsString: string = args.length > 2 ? args[2] : await ui.input('regularUsersMapCostPerActionMap: i.e. {0: 0.05, 2: 0.2}');
	const regularUsersMapCostPerActionMap: Dictionary<bigint, bigint> = await parseBigIntToPriceMap(regularUsersMapCostPerActionMapAsString);
	
	const premiumUsersMapCostPerActionMapAsString: string = args.length > 3 ? args[3] : await ui.input('premiumUsersMapCostPerActionMap: i.e. {0: 0.05, 2: 0.2}');
	const premiumUsersMapCostPerActionMap: Dictionary<bigint, bigint> = await parseBigIntToPriceMap(premiumUsersMapCostPerActionMapAsString);
	
	const isPublicCampaign = args.length > 4
		? args[4].trim().toLowerCase() === 'true' // Parse input argument if provided
		: (await ui.input('isPublicCampaign: ')).trim().toLowerCase() === 'true'; // Prompt user and parse input
		
	
	const campaignValidForNumDays = BigInt(args.length > 5 ? args[5] : await ui.input('campaignValidForNumDays (0 = no expiration) '));
	const paymentMethod = BigInt(args.length > 6 ? args[6] : await ui.input('Payment Method: (0 = TON, 1=USDT) '));
	const requiresAdvertiserApprovalForWithdrawl = args.length > 7
		? args[7].trim().toLowerCase() === 'true' // Parse input argument if provided
		: (await ui.input('requiresAdvertiserApprovalForWithdrawl: ')).trim().toLowerCase() === 'true'; // Prompt user and parse input
		
	
	await campaignContract.send(
            provider.sender(),
            {
                value: GAS_FEE,   
            },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap, 
                    premiumUsersCostPerAction: premiumUsersMapCostPerActionMap, 
                    allowedAffiliates: Dictionary.empty<Address, boolean>(), // always empty at first stage
                    isPublicCampaign: isPublicCampaign,  // public campaign 
                    campaignValidForNumDays: campaignValidForNumDays == BigInt(0) ? null: campaignValidForNumDays, // null = no end date 
					paymentMethod: paymentMethod, // 0 - TON, 1 - USDT 
					requiresAdvertiserApprovalForWithdrawl: requiresAdvertiserApprovalForWithdrawl 
                }
            }
        );

    ui.write('Waiting for campaign to update state...');

    let stateAfter = (await campaignContract.getCampaignData()).state;
    let attempt = 1;
    while (stateBefore === stateAfter) {
        
        if (attempt == MAX_ATTEMPTS) {
            // tx failed
            ui.write(`Error: TX failed or timedout!`);
            return;
        }

        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        stateAfter = (await campaignContract.getCampaignData()).state;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
