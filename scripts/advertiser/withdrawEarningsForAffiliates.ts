import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS } from '../constants'


/**
 * Loads a dictionary of affiliateId to amountToWithdraw from user input or a provided argument.
 * @param input Optional input string in the format "{0: 100, 1: 0.1}".
 * @returns A Dictionary<BigInt, BigInt> mapping affiliateId to amountToWithdraw.
 */
async function loadAffiliateIdToAmountMap(userInput: string): Promise<Dictionary<bigint, bigint>> {
    const affiliateIdToAmountMap = Dictionary.empty<bigint, bigint>();

    try {
        // Parse JSON-like input (e.g., "{1: 100, 2: 200}")
        const parsedInput: Record<string, number> = JSON.parse(
            userInput.replace(/(\w+):/g, '"$1":') // Convert to valid JSON format
        );

        // Populate the dictionary
        for (const [key, value] of Object.entries(parsedInput)) {
            const affiliateId = BigInt(key);
            const amountToWithdraw = value;
			console.log(`Withdraw ${amountToWithdraw} for affiliate ${affiliateId}`);
			affiliateIdToAmountMap.set(affiliateId, toNano(amountToWithdraw.toString()));
        }
    } catch (error) {
        console.error("Invalid input format. Please provide input as {1: 100, 2: 200}.");
        throw error;
    }

    return affiliateIdToAmountMap;
}


export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();

    const campaignId = BigInt(args.length > 0 ? args[0] : await ui.input('Campaign id'));	
	const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromAddress(AFFILIATE_MARKETPLACE_ADDRESS));
	
	let campaignAddress = await affiliateMarketplace.getCampaignContractAddress(campaignId);
	if (!(await provider.isContractDeployed(campaignAddress))) {
        ui.write(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }
	
	const userInputAsString: string = args.length > 1 ? args[1] : await ui.input('affiliateIdToAmountMap: i.e. {1: 100, 2: 200}');
	const affiliateIdToAmountMap: Dictionary<bigint, bigint> = await loadAffiliateIdToAmountMap(userInputAsString);
	
	const campaign = provider.open(Campaign.fromAddress(campaignAddress));

	for (const [key, value] of affiliateIdToAmountMap) {
		
		let affiliateData = await campaign.getAffiliateData(key);
		if (affiliateData == null) {
			ui.write(`Error: Affiliate ${key.toString()} does not exist!`);
			return;
		}
		
		let affiliateMaxWithdraw = affiliateData!	.accruedEarnings;
		console.log(`Affiliate ID: ${key.toString()}, Amount to withdraw: ${fromNano(value.toString())}, Max amount to withdraw: ${fromNano(affiliateMaxWithdraw)}`);
		if (affiliateMaxWithdraw < toNano(value.toString())) {
			ui.write(`Error: Affiliate does not have sufficient funds to withdraw!`);
			return;
		}
	}
	
	
	let totalAccruedEarningsBefore = (await campaign.getCampaignData()).totalAccruedEarnings;
			
	await campaign.send(
        provider.sender(),
        { 
			value: toNano('0.1') // might need to take more ton to cover for all affiliates
		},
        { 
			$$type: 'AdvertiserWithdrawEarningsForAffiliates',
			affiliatesEarnings: affiliateIdToAmountMap
		}
	);
		
    ui.write('Waiting for campaign to update allowed affiliates...');
	
	let totalAccruedEarningsAfter = (await campaign.getCampaignData()).totalAccruedEarnings;
    let attempt = 1;
    while(totalAccruedEarningsBefore === totalAccruedEarningsAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		totalAccruedEarningsAfter = (await campaign.getCampaignData()).totalAccruedEarnings;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');

	
}
