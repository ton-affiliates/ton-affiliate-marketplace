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
	
	let campaignData = await campaign.getCampaignData();
	for (const [key, value] of campaignData.campaignDetails.allowedAffiliates) {
		if (key.toString() == provider.sender().address!.toString()) {
			ui.write(`Error: Affiliate already nominee for campaign at address ${campaignAddress}`);
			return;
		}
	}
	
	let allowedAffiliatesSizeBefore = campaignData.campaignDetails.allowedAffiliates.size;
	
	await campaign.send(
        provider.sender(),
        { 
			value: GAS_FEE
		},
        { 
			$$type: 'AffiliateAskToJoinAllowedList'
		}
	);
		
    ui.write('Waiting for campaign to update allowed affiliates...');
	
	campaignData = await campaign.getCampaignData();
	let allowedAffiliatesSizeAfter = campaignData.campaignDetails.allowedAffiliates.size;
    let attempt = 1;
    while(allowedAffiliatesSizeBefore === allowedAffiliatesSizeAfter) {
		
		if (attempt == MAX_ATTEMPTS) {
			// tx failed
			ui.write(`Error: TX failed or timedout!`);
			return;
		}
	
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		campaignData = await campaign.getCampaignData();
		allowedAffiliatesSizeAfter = campaignData.campaignDetails.allowedAffiliates.size;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');

	
}
