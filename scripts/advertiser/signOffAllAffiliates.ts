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
	
	const campaign = provider.open(Campaign.fromAddress(campaignAddress));
	let numAdvertiserSignOffsBefore = (await campaign.getCampaignData()).numAdvertiserSignOffs;

	const affiliateIdToWithdrawEarningsMap: Dictionary<bigint, bigint> = await parseBigIntToPriceMap(userInputAsString);
				
	for (const [key, value] of affiliateIdToWithdrawEarningsMap) {
		
		let affiliateData = await campaign.getAffiliateData(key);
		if (affiliateData == null) {
			ui.write(`Error: Affiliate ${key.toString()} does not exist!`);
			return;
		}
	}
			
	await campaign.send(
        provider.sender(),
        { 
			value: toNano('0.3')  // remainder will be returned to advertiser 
		},
        { 
			$$type: 'AdvertiserSignOffWithdraw',
			setAffiliatesWithdrawEarnings: affiliateIdToWithdrawEarningsMap
		}
	);
		
    ui.write('Waiting for campaign to update numAdvertiserSignOffs...');
	
	let numAdvertiserSignOffsAfter = (await campaign.getCampaignData()).numAdvertiserSignOffs;
    let attempt = 1;
	
    while (numAdvertiserSignOffsBefore == numAdvertiserSignOffsAfter) {
		
		if (attempt == MAX_ATTEMPTS) {
			// tx failed
			ui.write(`Error: TX failed or timedout!`);
			return;
		}
	
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		numAdvertiserSignOffsAfter = (await campaign.getCampaignData()).numAdvertiserSignOffs;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Adveriser signed off all affiliates successfully!');

	
}
