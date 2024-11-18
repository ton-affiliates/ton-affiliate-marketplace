import { toNano, Address, fromNano } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS } from '../constants';
import {toUSDT, fromUSDT} from '../utils';

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
	const campaignData = await campaign.getCampaignData();
	if (campaignData.campaignDetails.paymentMethod !== 1n) {
		ui.write(`Error: Campaign at address ${campaignAddress} is not USDT!`);
        return;
	}
	
	const affiliateId = BigInt(args.length > 0 ? args[0] : await ui.input('Affiliate id'));	
	const affiliateDataBefore = await campaign.getAffiliateData(affiliateId);
	if (affiliateDataBefore == null) {
		ui.write(`Error: Campaign at address ${campaignAddress} does not have affiliate: ${affiliateId}!`);
        return;
	}
	
	let affiliateEarningsBefore = affiliateDataBefore!.accruedEarnings;
	
	let campaignBalanceBefore = (await campaign.getCampaignData()).contractUSDTBalance;
	const userInputUSDT: string = await ui.input('Enter USDT amount to add (e.g. 100.3, 250, 1000.5, etc...):');
	
	const parsedUSDT: number = parseFloat(userInputUSDT); // Convert input to a number

	ui.write(`USDT amount entered by admin user: ${parsedUSDT}`);

	if (isNaN(parsedUSDT) || parsedUSDT <= 0) {
		ui.write(`USDT amount must be a positive integer!`);
		return;
	}
	
	await affiliateMarketplace.send(
		provider.sender(),
		{ 
			value: toNano('0.05') 
		},
		{
			$$type: 'AdminPayAffiliateUSDTBounced',
			campaignId: campaignId,
			affiliateId: affiliateId,
			amount: toNano(userInputUSDT)
		}
	);
	
    ui.write('Waiting for campaign to update fee percentage...');

	let affiliateEarningsAfter = (await campaign.getAffiliateData(affiliateId))!.accruedEarnings;
    let attempt = 1;
    while (affiliateEarningsBefore === affiliateEarningsAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        affiliateEarningsAfter = (await campaign.getAffiliateData(affiliateId))!.accruedEarnings;
        attempt++;
    }
	
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
