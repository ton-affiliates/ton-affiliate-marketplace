import { toNano, Address, fromNano } from '@ton/core';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS, MAX_ATTEMPTS, GAS_FEE } from '../constants'


export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();

    const affiliateMarketplace = provider.open(AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS));
    let numCampaignsBefore = await affiliateMarketplace.getNumCampaigns();
	
	console.log("Before:");
	console.log(numCampaignsBefore);
	
	await affiliateMarketplace.send(
        provider.sender(),
        {
            value: toNano('0.15'),
        },
        {
           $$type: 'AdvertiserDeployNewCampaign'
        }
    );

    ui.write('Waiting for affiliateMarketplace to update numCampaigns...');

    let numCampaignsAfter = await affiliateMarketplace.getNumCampaigns();
    let attempt = 1;
    while (numCampaignsBefore === numCampaignsAfter) {
		
		if (attempt == MAX_ATTEMPTS) {
			// tx failed
			ui.write(`Error: TX failed or timedout!`);
			return;
		}
	
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        numCampaignsAfter = await affiliateMarketplace.getNumCampaigns();
        attempt++;
    }
	
	console.log("After:");
	console.log(numCampaignsAfter);

    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
