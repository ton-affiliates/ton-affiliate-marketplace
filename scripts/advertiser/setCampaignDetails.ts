import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { AffiliateMarketplace } from '../../wrappers/AffiliateMarketplace';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { AFFILIATE_MARKETPLACE_ADDRESS, BOT_OP_CODE_USER_CLICK } from '../constants'
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
	
	const campaignContract = provider.open(Campaign.fromAddress(campaignAddress));
    let campaignData = await campaignContract.getCampaignData();
	const stateBefore = campaignData.state;
		
	if (stateBefore !== 0n) {
		ui.write(`Error: Contract at address ${campaignAddress} has already set the details!`);
        return;
	}
	
	const regularUsersMapCostPerActionMapAsString: string = args.length > 2 ? args[2] : await ui.input('regularUsersMapCostPerActionMap: i.e. {0: 0.05, 2: 0.2}');
	const regularUsersMapCostPerActionMap: Dictionary<bigint, bigint> = await parseBigIntToPriceMap(regularUsersMapCostPerActionMapAsString);
	
	const premiumUsersMapCostPerActionMapAsString: string = args.length > 3 ? args[3] : await ui.input('premiumUsersMapCostPerActionMap: i.e. {0: 0.05, 2: 0.2}');
	const premiumUsersMapCostPerActionMap: Dictionary<bigint, bigint> = await parseBigIntToPriceMap(premiumUsersMapCostPerActionMapAsString);
	
	const isPublicCampaign = Boolean(args.length > 4 ? args[4] : await ui.input('isPublicCampaign '));
	
	const campaignValidForNumDays = BigInt(args.length > 5 ? args[5] : await ui.input('campaignValidForNumDays (0 = no expiration) '));
	const paymentMethod = BigInt(args.length > 6 ? args[6] : await ui.input('Payment Method: (0 = TON, 1=USDT) '));
	const requiresAdvertiserApprovalForWithdrawl = Boolean(args.length > 7 ? args[7] : await ui.input('requiresAdvertiserApprovalForWithdrawl '));
	
	let tonToSend = toNano('0.15'); // default for USDT
	if (paymentMethod == BigInt(0)) {
		const tonToSend = toNano(args.length > 8 ? args[8] : await ui.input('Amount of TON to start with: (e.g. 100) '));
	}
	
	await campaignContract.send(
            provider.sender(),
            {
                value: tonToSend,  
            },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap, 
                    premiumUsersCostPerAction: premiumUsersMapCostPerActionMap, 
                    allowedAffiliates: Dictionary.empty<Address, boolean>(), // always empty at first stage
                    isPublicCampaign: isPublicCampaign,  // public campaign 
                    campaignValidForNumDays: campaignValidForNumDays == BigInt(0) ? null: campaignValidForNumDays, // null = no end date 
					paymentMethod: paymentMethod, // 0 - TON, 1 - USDT 
					requiresAdvertiserApprovalForWithdrawl: requiresAdvertiserApprovalForWithdrawl 
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
