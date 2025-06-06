import { toNano, Address, fromNano, Dictionary } from '@ton/core';
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
	let numAdvertiserWithdrawlsBefore = (await campaign.getCampaignData()).numAdvertiserWithdrawls;
	let campaignBalanceBefore = (await campaign.getCampaignData()).campaignBalance;
	
	const userInputAsString = args.length > 2 ? args[2] : await ui.input(`Enter amount to withdraw.  Max amount to withdraw ${fromNano(campaignBalanceBefore)}:`);
	const parsedInput: number = parseFloat(userInputAsString); // Convert input to a number
	
	ui.write(`amount entered by user: ${parsedInput}`);

	if (isNaN(parsedInput) || parsedInput <= 0) {
		ui.write(`amount must be a positive integer!`);
		return;
	}
		
		
	await campaign.send(
        provider.sender(),
        { 
			value: GAS_FEE 
		},
        { 
			$$type: 'AdvertiserWithdrawFunds',
			amount: toNano(userInputAsString)
		}
	);
		
    ui.write('Waiting for campaign to update allowed affiliates...');
	
	let numAdvertiserWithdrawlsAfter = (await campaign.getCampaignData()).numAdvertiserWithdrawls;
    let attempt = 1;
	
    while (numAdvertiserWithdrawlsBefore == numAdvertiserWithdrawlsAfter) {
		
		if (attempt == MAX_ATTEMPTS) {
			// tx failed
			ui.write(`Error: TX failed or timedout!`);
			return;
		}
	
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		numAdvertiserWithdrawlsAfter = (await campaign.getCampaignData()).numAdvertiserWithdrawls;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Funds transffered from campaign successfully!');

	
}
