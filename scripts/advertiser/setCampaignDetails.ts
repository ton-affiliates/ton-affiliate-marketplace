import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS, BOT_OP_CODE_USER_CLICK } from '../constants'

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
    let campaignData = await campaignContract.getCampaignData();
	const stateBefore = campaignData.state;
		
	if (stateBefore !== 0n) {
		ui.write(`Error: Contract at address ${campaignAddress} has already set the details!`);
        return;
	}
	
	const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
    const premiumUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();

	regularUsersMapCostPerActionMap.set(BOT_OP_CODE_USER_CLICK, toNano('0.1')); // TODO parameter
	premiumUsersMapCostPerActionMap.set(BOT_OP_CODE_USER_CLICK, toNano('0.15')); // TODO parameter
	
	await campaignContract.send(
            provider.sender(),
            {
                value: toNano('0.15'),  // TODO parameter - e.g. amount of TON to fund the contract with (must be at least 0.15 TON for USDT campaign)
            },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap, // TODO parameter
                    premiumUsersCostPerAction: premiumUsersMapCostPerActionMap, // TODO parameter
                    allowedAffiliates: Dictionary.empty<Address, boolean>(), // TODO parameter
                    isOpenCampaign: false,  // open campaign // TODO parameter
                    campaignValidForNumDays: null, // no end date // TODO parameter
					paymentMethod: BigInt(1), // 0 - TON, 1 - USDT // TODO parameter
					requiresAdvertiserApprovalForWithdrawl: false // TODO parameter
                }
            }
        );

    ui.write('Waiting for campaign to update state...');

    let stateAfter = (await campaignContract.getCampaignData()).state;
    let attempt = 1;
    while (stateBefore === stateAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        stateAfter = (await campaignContract.getCampaignData()).state;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
