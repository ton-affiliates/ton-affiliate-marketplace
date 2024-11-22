import { toNano, Address, fromNano, Dictionary } from '@ton/core';
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
	let campaignBalanceBefore = (await campaign.getCampaignData()).campaignBalance;
	
	const userInputAsString: string = await ui.input(`Enter amount to withdraw.  Max amount to withdraw ${fromNano(campaignBalanceBefore)}:`);
	const parsedInput: number = parseFloat(userInputAsString); // Convert input to a number
	
	ui.write(`amount entered by user: ${parsedInput}`);

	if (isNaN(parsedInput) || parsedInput <= 0) {
		ui.write(`amount must be a positive integer!`);
		return;
	}
		
	
			
	await campaign.send(
        provider.sender(),
        { 
			value: toNano('0.05') 
		},
        { 
			$$type: 'AdvertiserWithdrawFunds',
			amount: toNano(userInputAsString)
		}
	);
		
    ui.write('Waiting for campaign to update allowed affiliates...');
	
	let campaignBalanceAfter = (await campaign.getCampaignData()).campaignBalance;
    let attempt = 1;
    while(campaignBalanceBefore === campaignBalanceAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		campaignBalanceAfter = (await campaign.getCampaignData()).campaignBalance;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Funds transffered from campaign successfully!');

	
}
