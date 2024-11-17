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
	const campaignData = await campaign.getCampaignData();
	if (campaignData.campaignDetails.paymentMethod !== 1n) {
		ui.write(`Error: Campaign at address ${campaignAddress} is not USDT!`);
        return;
	}
	
	let campaignBalanceBefore = (await campaign.getCampaignData()).contractUSDTBalance;
	const userInputUSDT: string = await ui.input('Enter USDT amount to add as integer (e.g., 100, 250, 1000, etc...):');
	const parsedUSDT: number = parseInt(userInputUSDT, 10); // Convert input to a number

	ui.write(`USDT amount entered by admin user: ${parsedUSDT}`);

	if (isNaN(parsedUSDT) || parsedUSDT <= 0) {
		ui.write(`USDT amount must be a positive integer!`);
		return;
	}
	
	const usdtAmountNano = BigInt(parsedUSDT) * (10n ** 6n); // Convert to 6 decimals (nano USDT)
	await affiliateMarketplace.send(
		provider.sender(),
		{ 
			value: toNano('0.05') 
		},
		{
			$$type: 'AdminJettonNotificationMessageFailure',
			campaignId: campaignId,
			amount: usdtAmountNano
		}
	);
	
    ui.write('Waiting for campaign to update fee percentage...');

	let campaignBalanceAfter = (await campaign.getCampaignData()).contractUSDTBalance;
    let attempt = 1;
    while (campaignBalanceBefore === campaignBalanceAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        campaignBalanceAfter = (await campaign.getCampaignData()).contractUSDTBalance;
        attempt++;
    }
	
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
