import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS, MAX_ATTEMPTS, GAS_FEE } from '../constants'
import { parseBigIntToPriceMap } from '../utils'


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
	
	const userInputAsString: string = args.length > 2 ? args[2] : await ui.input('affiliateIdToWithdrawEarningsMap: i.e. {1: 100, 2: 200}');
	const affiliateIdToWithdrawEarningsMap: Dictionary<bigint, bigint> = await parseBigIntToPriceMap(userInputAsString);
	
	let affiliateIdBefore = BigInt(0);
	let affiliatePendingApprovalEarningsBefore = BigInt(0); 
	
	for (const [key, value] of affiliateIdToWithdrawEarningsMap) {
		
		let affiliateData = await campaign.getAffiliateData(key);
		if (affiliateData == null) {
			ui.write(`Error: Affiliate ${key.toString()} does not exist!`);
			return;
		}
		
		if (affiliatePendingApprovalEarningsBefore == BigInt(0)) {
			affiliateIdBefore = key;
			affiliatePendingApprovalEarningsBefore = (await campaign.getAffiliateData(key))!.pendingApprovalEarnings;
		}
		
		console.log(`AffiliateData before update for affiliate: ${key} with updatedEarnings: ${fromNano(value)} - 
			pendingApprovalEarnings: ${fromNano(affiliateData!.pendingApprovalEarnings)}
			withdrawEarnings: ${fromNano(affiliateData!.withdrawEarnings)}
			totalEarnings: ${fromNano(affiliateData!.totalEarnings)}`);
	}
	
	if (affiliateIdBefore == BigInt(0)) {
		ui.write(`Error: Could not extract pending approval data!`);
		return;
	}
	
	
			
	await campaign.send(
        provider.sender(),
        { 
			value: toNano('0.3') // will get diff back from contract
		},
        { 
			$$type: 'AdvertiserSignOffWithdraw',
			setAffiliatesWithdrawEarnings: affiliateIdToWithdrawEarningsMap
		}
	);
		
    ui.write('Waiting for campaign to update...');
	
	let affiliatePendingApprovalEarningsAfter = (await campaign.getAffiliateData(affiliateIdBefore))!.pendingApprovalEarnings;

    let attempt = 1;
    while(affiliatePendingApprovalEarningsBefore === affiliatePendingApprovalEarningsAfter) {
		
		if (attempt == MAX_ATTEMPTS) {
			// tx failed
			ui.write(`Error: TX failed or timedout!`);
			return;
		}
	
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		affiliatePendingApprovalEarningsAfter = (await campaign.getAffiliateData(affiliateIdBefore))!.pendingApprovalEarnings;        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
	
	
	for (const [key, value] of affiliateIdToWithdrawEarningsMap) {
		
		let affiliateDataAfter = await campaign.getAffiliateData(key);
		console.log(`AffiliateData after update for affiliate: ${key} - 
			pendingApprovalEarnings: ${fromNano(affiliateDataAfter!.pendingApprovalEarnings)}
			withdrawEarnings: ${fromNano(affiliateDataAfter!.withdrawEarnings)}
			totalEarnings: ${fromNano(affiliateDataAfter!.totalEarnings)}`);
	}

	
}
