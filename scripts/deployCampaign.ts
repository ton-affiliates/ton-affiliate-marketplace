import { toNano, Address } from '@ton/core';
import { Campaign } from '../wrappers/Campaign';
import { NetworkProvider } from '@ton/blueprint';
import { hexToCell, stringToCell, USDT_MAINNET_ADDRESS, USDT_WALLET_BYTECODE } from '../test/utils'


export async function run(provider: NetworkProvider) {

    const deployer = Address.parse("0QCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL5kn");

    // Initialize contract object
	//init(owner: Address, campaignId: Int, payout: Address, usdtMasterAddress: Address)

    const campaign = provider.open(await Campaign.fromInit(deployer, BigInt(0), deployer, USDT_MAINNET_ADDRESS, hexToCell(USDT_WALLET_BYTECODE)));


    await campaign.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'ParentToChildDeployCampaign',
            campaignId: BigInt(0n),
        }
    );

    await provider.waitForDeploy(campaign.address);

    // run methods on `Campaign`
}
