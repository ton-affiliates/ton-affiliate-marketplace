import { toNano, Address, fromNano } from '@ton/core';
import { Campaign } from '../wrappers/Campaign';
import { NetworkProvider, sleep } from '@ton/blueprint';


export async function run(provider: NetworkProvider, args: string[]) {
    
	const ui = provider.ui();

    const campaignAddress = Address.parse(args.length > 0 ? args[0] : await ui.input('Campaign address'));

    if (!(await provider.isContractDeployed(campaignAddress))) {
        ui.write(`Error: Contract at address ${campaignAddress} is not deployed!`);
        return;
    }

    const campaign = provider.open(Campaign.fromAddress(campaignAddress));
    let campaignData = await campaign.getCampaignData();
	const totalUsdtBalanceBefore = campaignData.contractUSDTBalance;
	
	console.log("Before:");
	console.log(fromNano(totalUsdtBalanceBefore));
	console.log(campaignData.campaignDetails.paymentMethod);
	
	 await campaign.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
           $$type: 'ParentToChildSeizeCampaign'
        }
    );

    ui.write('Waiting for campaign to update contractUSDTBalance...');

    let totalUsdtBalanceAfter = (await campaign.getCampaignData()).contractUSDTBalance;
    let attempt = 1;
    while (totalUsdtBalanceBefore === totalUsdtBalanceAfter) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        totalUsdtBalanceAfter = (await campaign.getCampaignData()).contractUSDTBalance;
        attempt++;
    }
	
	console.log("After:");
	console.log(totalUsdtBalanceAfter);

    ui.clearActionPrompt();
    ui.write('Campaign updated successfully!');
}
