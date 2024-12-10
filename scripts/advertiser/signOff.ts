import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS } from '../constants'
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
	
	const userInputAsString: string = args.length > 2 ? args[2] : await ui.input('affiliateIdToWithdrawEarningsMap: i.e. {1: 100, 2: 200}');
	const affiliateIdToWithdrawEarningsMap: Dictionary<bigint, bigint> = await parseBigIntToPriceMap(userInputAsString);
	
	const campaign = provider.open(Campaign.fromAddress(campaignAddress));
	let campaignData = await campaign.getCampaignData();
	if (campaignData.totalAffiliateEarnings == toNano("0")) {
		ui.write(`Error: No earnings to sign off at ${campaignAddress}!`);
        return;
	}
	
	// search for first affiliate with earnings
	let affiliateIdWithAccruedEarnings: bigint = BigInt(-1);
	for (let i = 0; i < campaignData.numAffiliates; i++) {
		
		let affiliateData = await campaign.getAffiliateData(BigInt(i));
		if (affiliateData == null) {
			ui.write(`Error: Affiliate ${i.toString()} does not exist!`);
			return;
		}
		
		if (affiliateData.accruedEarnings > toNano("0")) {
			affiliateIdWithAccruedEarnings = BigInt(i);
			break;
		}
	}
	
	if (affiliateIdWithAccruedEarnings == BigInt(-1)) {
		ui.write(`Error: No accrued earnings to all affiliates at ${campaignAddress}!`);
        return;
	}
	
	let affiliateDataAccruedEarningsBefore = (await campaign.getAffiliateData(affiliateIdWithAccruedEarnings))!.accruedEarnings;
	
	for (const [key, value] of affiliateIdToWithdrawEarningsMap) {
		
		let affiliateData = await campaign.getAffiliateData(key);
		if (affiliateData == null) {
			ui.write(`Error: Affiliate ${key.toString()} does not exist!`);
			return;
		}
		
		let affiliateMaxWithdraw = affiliateData!.accruedEarnings;
		console.log(`Affiliate ID: ${key.toString()}, valueSetByAdvertiser: ${fromNano(value.toString())}, accruedEarnings: ${fromNano(affiliateMaxWithdraw)}`);
		
		if (affiliateMaxWithdraw < value) {
			ui.write(`Error: Affiliate does not have sufficient funds to withdraw!`);
			return;
		}
		
		console.log(`AffiliateData after update for affiliate: ${key} - 
			accruedEarnings: ${fromNano(affiliateData!.accruedEarnings)}
			withdrawEarnings: ${fromNano(affiliateData!.withdrawEarnings)}
			totalEarnings: ${fromNano(affiliateData!.totalEarnings)}`);
	}
	
	
			
	await campaign.send(
        provider.sender(),
        { 
			value: toNano('0.2') // will get diff back from contract
		},
        { 
			$$type: 'AdvertiserSignOffWithdraw',
			setAffiliatesWithdrawEarnings: affiliateIdToWithdrawEarningsMap
		}
	);
		
    ui.write('Waiting for campaign to update...');
	
	let affiliateDataAccruedEarningsAfter = (await campaign.getAffiliateData(affiliateIdWithAccruedEarnings))!.accruedEarnings;
    let attempt = 1;
    while(affiliateDataAccruedEarningsBefore === affiliateDataAccruedEarningsAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
		affiliateDataAccruedEarningsAfter = (await campaign.getAffiliateData(affiliateIdWithAccruedEarnings))!.accruedEarnings;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
	
	
	for (const [key, value] of affiliateIdToWithdrawEarningsMap) {
		
		let affiliateDataAfter = await campaign.getAffiliateData(key);
		console.log(`AffiliateData after update for affiliate: ${key} - 
			accruedEarnings: ${fromNano(affiliateDataAfter!.accruedEarnings)}
			withdrawEarnings: ${fromNano(affiliateDataAfter!.withdrawEarnings)}
			totalEarnings: ${fromNano(affiliateDataAfter!.totalEarnings)}`);
	}

	
}
