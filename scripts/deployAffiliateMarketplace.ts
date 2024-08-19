import { toNano } from '@ton/core';
import { AffiliateMarketplace } from '../wrappers/AffiliateMarketplace';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const affiliateMarketplace = provider.open(await AffiliateMarketplace.fromInit());

    await affiliateMarketplace.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(affiliateMarketplace.address);

    // run methods on `affiliateMarketplace`
}
