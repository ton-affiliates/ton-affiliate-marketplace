import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS, MAX_ATTEMPTS, GAS_FEE } from '../../constants'

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

	let tonToSend = toNano(BigInt(args.length > 2 ? args[2] : await ui.input('Amount of TON to replenish: (e.g. 10) ')));
	
	const campaign = provider.open(Campaign.fromAddress(campaignAddress));
	let numAdvertiserReplenishBefore = (await campaign.getCampaignData()).numAdvertiserReplenishCampaign;
				
	await campaign.send(
        provider.sender(),
        { 
			value: tonToSend  
		},
        { 
			$$type: 'AdvertiserReplenish'
		}
	);
		
    ui.write('Waiting for campaign to update numAdvertiserReplenishCampaign...');
	
	let numAdvertiserReplenishAfter = (await campaign.getCampaignData()).numAdvertiserReplenishCampaign;
    let attempt = 1;
	
    while (numAdvertiserReplenishBefore == numAdvertiserReplenishAfter) {
		
		if (attempt == MAX_ATTEMPTS) {
			// tx failed
			ui.write(`Error: TX failed or timedout!`);
			return;
		}
	
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		numAdvertiserReplenishAfter = (await campaign.getCampaignData()).numAdvertiserReplenishCampaign;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Adveriser signed off all affiliates successfully!');

	
}
