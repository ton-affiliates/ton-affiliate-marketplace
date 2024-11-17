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
	
	const campaignContract = provider.open(Campaign.fromAddress(campaignAddress));
	let feePercentageBefore = BigInt((await campaignContract.getCampaignData()).feePercentage);

	const newFeePercentageInput = args.length > 1 ? args[1] : await ui.input('New fee (e.g. 1, 1.5, 2.3 etc...)');
	const newFeePercentage: number = parseFloat(newFeePercentageInput);
	if (isNaN(newFeePercentage)) {
		throw new Error("Invalid input! Please provide a valid decimal number.");
	}	
	
	if (feePercentageBefore == BigInt(Math.round(newFeePercentage * 100))) {
		ui.write(`Error: Campaign already has this exact value!`);
        return;
	}
		
    await affiliateMarketplace.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
			$$type: 'AdminModifyCampaignFeePercentage',
			campaignId: campaignId,
			feePercentage: BigInt(Math.round(newFeePercentage * 100))
        }
    );
		
    ui.write('Waiting for campaign to update fee percentage...');

    let feePercentageAfter = BigInt((await campaignContract.getCampaignData()).feePercentage);
    let attempt = 1;
    while (feePercentageBefore === feePercentageAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        feePercentageAfter = BigInt((await campaignContract.getCampaignData()).feePercentage);
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
