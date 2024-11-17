import { toNano, Address, fromNano } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS } from '../constants'

export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();

    const campaignId = BigInt(args.length > 0 ? args[0] : await ui.input('Campaign id'));	
	const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS));
	
	let campaignAddress = await affiliateMarketplace.getCampaignContractAddress(campaignId);
	if (!(await provider.isContractDeployed(campaignAddress))) {
        ui.write(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }
	
	const campaign = provider.open(Campaign.fromAddress(campaignAddress));
	console.log(await campaign.getCampaignData());
	
	const affiliateId = BigInt(args.length > 0 ? args[0] : await ui.input('Affiliate id'));		
	let affiliateEarningsBefore = (await campaign.getAffiliateData(affiliateId))!.accruedEarnings;
	console.log(affiliateEarningsBefore);

	await campaign.send(
        provider.sender(),
        { 
			value: toNano('0.05') 
		},
        { 
			$$type: 'AffiliateWithdrawEarnings',
			affiliateId: affiliateId
		}
	);
		
    ui.write('Waiting for campaign to update earnings...');

	let affiliateEarningsAfter = (await campaign.getAffiliateData(affiliateId))!.accruedEarnings;
    let attempt = 1;
    while(affiliateEarningsBefore === affiliateEarningsAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        affiliateEarningsAfter = (await campaign.getAffiliateData(affiliateId))!.accruedEarnings;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
