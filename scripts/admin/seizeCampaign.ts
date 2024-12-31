import { toNano, Address, fromNano } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS } from '../constants'
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';


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
	let campaignBalanceBefore = (await campaign.getCampaignData()).contractTonBalance;

	 await affiliateMarketplace.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
           $$type: 'AdminSeizeCampaignBalance',
		   campaignId: campaignId
        }
    );

    ui.write('Waiting for campaign to update contractTonBalance...');
	
	let campaignBalanceAfter = (await campaign.getCampaignData()).contractTonBalance;
    let attempt = 1;
    while(campaignBalanceBefore === campaignBalanceAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		campaignBalanceAfter = (await campaign.getCampaignData()).contractTonBalance;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
