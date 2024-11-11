import { toNano, Address, fromNano } from '@ton/core';
import { AffiliateMarketplace } from '../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';


export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();

    const affiliateMarketplaceAddress = Address.parse(args.length > 0 ? args[0] : await ui.input('AffiliateMarketplace address'));

    if (!(await provider.isContractDeployed(affiliateMarketplaceAddress))) {
        ui.write(`Error: Contract at address ${affiliateMarketplaceAddress} is not deployed!`);
        return;
    }

    const affiliateMarketplace = provider.open(AffiliateMarketplace.fromAddress(affiliateMarketplaceAddress));
    let numCampaignsBefore = await affiliateMarketplace.getNumCampaigns();
	
	console.log("Before:");
	console.log(numCampaignsBefore);
	
	 await affiliateMarketplace.send(
        provider.sender(),
        {
            value: toNano('1'),
        },
        {
           $$type: 'BotDeployNewCampaign'
        }
    );

    ui.write('Waiting for affiliateMarketplace to update numCampaigns...');

    numCampaignsAfter = await affiliateMarketplace.getNumCampaigns();
    let attempt = 1;
    while (numCampaignsBefore === numCampaignsAfter) {
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
