import { toNano, Address, fromNano } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS, MAX_ATTEMPTS, GAS_FEE } from '../constants'

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
	
	const affiliateId = BigInt(args.length > 2 ? args[2] : await ui.input('Affiliate id'));		
	let affiliateEarningsBefore = (await campaign.getAffiliateData(affiliateId))!.withdrawEarnings;
	
	console.log(`Affiliate's earnings: ${fromNano(affiliateEarningsBefore)}`);
	if (affiliateEarningsBefore == BigInt(0)) {
        ui.write(`Error: no withdrawable earnings for affiliate ${affiliateId}!`);
        return;
    }
	

	await campaign.send(
        provider.sender(),
        { 
			value: GAS_FEE 
		},
        { 
			$$type: 'AffiliateWithdrawEarnings',
			affiliateId: affiliateId
		}
	);
		
    ui.write('Waiting for campaign to update earnings...');

	let affiliateEarningsAfter = (await campaign.getAffiliateData(affiliateId))!.withdrawEarnings;
    let attempt = 1;
    while(affiliateEarningsBefore === affiliateEarningsAfter) {
        
		if (attempt == MAX_ATTEMPTS) {
			// tx failed
			ui.write(`Error: TX failed or timedout!`);
			return;
		}
		
		ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        affiliateEarningsAfter = (await campaign.getAffiliateData(affiliateId))!.withdrawEarnings;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
