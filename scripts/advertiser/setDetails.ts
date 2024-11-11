import { toNano, Address, fromNano, Dictionary } from '@ton/core';
import { Campaign } from '../../wrappers/Campaign';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { BOT_OP_CODE_USER_CLICK } from '../utils'; 

export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();
	
	// TODO get campaignId and fetch address from parent
    const campaignAddress = Address.parse(args.length > 0 ? args[0] : await ui.input('Campaign address'));

    if (!(await provider.isContractDeployed(campaignAddress))) {
        ui.write(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }

    const campaign = provider.open(Campaign.fromAddress(campaignAddress));
    let campaignData = await campaign.getCampaignData();
	const stateBefore = campaignData.state;
	
	console.log("Before:");
	console.log(stateBefore);
	
	const regularUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();
    const premiumUsersMapCostPerActionMap = Dictionary.empty<bigint, bigint>();

	regularUsersMapCostPerActionMap.set(BOT_OP_CODE_USER_CLICK, toNano('0.1'));
	premiumUsersMapCostPerActionMap.set(BOT_OP_CODE_USER_CLICK, toNano('0.15'));
	
	const advertiserSetCampaignDetailsResult = await campaign.send(
            provider.sender(),
            {
                value: toNano('2'),
            },
            {
                $$type: 'AdvertiserSetCampaignDetails',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsersCostPerAction: regularUsersMapCostPerActionMap,
                    premiumUsersCostPerAction: premiumUsersMapCostPerActionMap,
                    allowedAffiliates: Dictionary.empty<Address, boolean>(),
                    isOpenCampaign: true,  // open campaign
                    campaignValidForNumDays: null, // no end date
					paymentMethod: BigInt(1), // 0 - TON, 1 - USDT
					requiresAdvertiserApprovalForWithdrawl: false
                }
            }
        );

    ui.write('Waiting for campaign to update state...');

    let stateAfter = (await campaign.getCampaignData()).state;
    let attempt = 1;
    while (stateBefore === stateAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        stateAfter = (await campaign.getCampaignData()).state;
        attempt++;
    }
	
    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
