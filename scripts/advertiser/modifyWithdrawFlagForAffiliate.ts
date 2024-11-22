import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS } from '../constants'


export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();

    const campaignId = BigInt(args.length > 0 ? args[0] : await ui.input('Campaign id: '));	
	const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS));
	
	let campaignAddress = await affiliateMarketplace.getCampaignContractAddress(campaignId);
	if (!(await provider.isContractDeployed(campaignAddress))) {
        ui.write(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }
	
	const campaign = provider.open(Campaign.fromAddress(campaignAddress));
	const affiliateId = BigInt(args.length > 1 ? args[1] : await ui.input('affiliateId: '));
	const requiresAdvertiserApprovalForWithdrawl = args.length > 2 ? args[2].toLowerCase() === 'true'
				: (await ui.input('requiresAdvertiserApprovalForWithdrawl: ')).toLowerCase() === 'true';

	let requiresAdvertiserApprovalForWithdrawlBefore = (await campaign.getAffiliateData(affiliateId))!.requiresAdvertiserApprovalForWithdrawl;
	
	if (requiresAdvertiserApprovalForWithdrawlBefore == requiresAdvertiserApprovalForWithdrawl) {
		ui.write(`Error: requiresAdvertiserApprovalForWithdrawl is already ${requiresAdvertiserApprovalForWithdrawl} for affiliate: ${affiliateId}!`);
        return;
	}
	
	await campaign.send(
        provider.sender(),
        { 
			value: toNano('0.05') // might need to take more ton to cover for all affiliates
		},
        { 
			$$type: 'AdvertiserModifyAffiliateRequiresApprovalForWithdrawlFlag',
			affiliateId: affiliateId,
			requiresAdvertiserApprovalForWithdrawl: requiresAdvertiserApprovalForWithdrawl
		}
	);
		
    ui.write('Waiting for campaign to update allowed affiliates...');
	
	let requiresAdvertiserApprovalForWithdrawlAfter = (await campaign.getAffiliateData(affiliateId))!.requiresAdvertiserApprovalForWithdrawl;
	let attempt = 1;
    while(requiresAdvertiserApprovalForWithdrawlBefore === requiresAdvertiserApprovalForWithdrawlAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		requiresAdvertiserApprovalForWithdrawlAfter = (await campaign.getAffiliateData(affiliateId))!.requiresAdvertiserApprovalForWithdrawl;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');

	
}
