import { toNano, Address } from '@ton/core';
import { AffiliateMarketplace } from '../wrappers/AffiliateMarketplace';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {

	const usdtMasterAddress = Address.parse("kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy");
    const botAddress = Address.parse("0QCslGoFs0l5iNsxK47W6gAedbdZ51lR_ZUm5prC8RUoL5kn");

    // Initialize contract object
    const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromInit(botAddress, usdtMasterAddress));

    await affiliateMarketplace.send(
        provider.sender(),
        {
            value: toNano('0.3'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(affiliateMarketplace.address);

    // run methods on `affiliateMarketplace`
}
