import { toNano, Address } from '@ton/core';
import { Campaign } from '../wrappers/Campaign';
import { NetworkProvider } from '@ton/blueprint';


export async function run(provider: NetworkProvider) {

	const usdtMasterAddress = Address.parse("kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy");
    const deployer = Address.parse("0QCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL5kn");

    // Initialize contract object
	//init(owner: Address, campaignId: Int, payout: Address, usdtMasterAddress: Address)

    const campaign = provider.open(await Campaign.fromInit(deployer, BigInt(0), deployer, usdtMasterAddress));

    await campaign.send(
        provider.sender(),
        {
            value: toNano('0.3'),
        },
        {
            $$type: 'ParentToChildDeployCampaign',
            campaignId: BigInt(0n),
        }
    );

    await provider.waitForDeploy(campaign.address);

    // run methods on `Campaign`
}
