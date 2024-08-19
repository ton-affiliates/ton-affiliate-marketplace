import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address, Contract } from '@ton/core';
import { AffiliateMarketplace } from '../wrappers/AffiliateMarketplace';
import { Affiliate } from '../wrappers/Affiliate';
import '@ton/test-utils';

// Import events and event loaders
import { loadAffiliateCreatedEvent } from './events';

describe('AffiliateMarketplace Negative Tests', () => {
    let blockchain: Blockchain;
    let affiliateMarketplaceContract: SandboxContract<AffiliateMarketplace>;
    let affiliateContract: SandboxContract<Affiliate>;
    let deployer: SandboxContract<TreasuryContract>;
    let bot: SandboxContract<TreasuryContract>;
    let advertiser: SandboxContract<TreasuryContract>;
    let publisher: SandboxContract<TreasuryContract>;
    let affiliateContractAddress: string | null = null;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        bot = await blockchain.treasury('bot');
        advertiser = await blockchain.treasury('advertiser');
        publisher = await blockchain.treasury('publisher');
        affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address));

        // Deploy the AffiliateMarketplace contract
        const deployResult = await affiliateMarketplaceContract.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: affiliateMarketplaceContract.address,
            deploy: true,
            success: true,
        });

        // Create an Affiliate contract
        const cpc = toNano('0.1');
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            {
                value: toNano('0.15'),
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: publisher.address,
                cpc: cpc,
            }
        );

        for (const external of createAffiliateResult.externals) {
            if (external.body) {
                const decodedAffiliate = loadAffiliateCreatedEvent(external.body);
                affiliateContractAddress = decodedAffiliate.affiliateContractAddress;
            }
        }
        if (affiliateContractAddress) affiliateContract = blockchain.openContract(await Affiliate.fromAddress(Address.parse(affiliateContractAddress)));
    });

    it('should fail if an unauthorized party tries to sign the contract as an advertiser', async () => {
        const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
        const unauthorizedPartyResult = await affiliateContract.send(
            unauthorizedParty.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'AdvertiserSigned',
            }
        );

        expect(unauthorizedPartyResult.transactions).toHaveTransaction({
            from: unauthorizedParty.address,
            to: affiliateContract.address,
            success: false
        });
    });

    it('should fail if advertiser tries to sign the contract twice', async () => {
        // Advertiser signs the contract
        await affiliateContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'AdvertiserSigned',
            }
        );

        // Attempt to sign the contract again as the advertiser
        const advertiserSignedAgainResult = await affiliateContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'AdvertiserSigned',
            }
        );

        expect(advertiserSignedAgainResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateContract.address,
            success: false
        });
    });

    it('should fail if publisher tries to sign the contract twice', async () => {
        // Publisher signs the contract
        await affiliateContract.send(
            publisher.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'PublisherSigned',
            }
        );

        // Attempt to sign the contract again as the publisher
        const publisherSignedAgainResult = await affiliateContract.send(
            publisher.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'PublisherSigned',
            }
        );

        expect(publisherSignedAgainResult.transactions).toHaveTransaction({
            from: publisher.address,
            to: affiliateContract.address,
            success: false
        });
    });

    it('should fail if advertiser tries to sign before affiliate creation', async () => {
        const unauthorizedAdvertiser = await blockchain.treasury('unauthorizedAdvertiser');
        const newAffiliateContract = blockchain.openContract(await Affiliate.fromInit(affiliateMarketplaceContract.address, 999n, unauthorizedAdvertiser.address, publisher.address, toNano('0.1')));

        const advertiserSignedWithoutCreationResult = await newAffiliateContract.send(
            unauthorizedAdvertiser.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'AdvertiserSigned',
            }
        );

        expect(advertiserSignedWithoutCreationResult.transactions).toHaveTransaction({
            from: unauthorizedAdvertiser.address,
            to: newAffiliateContract.address,
            success: false
        });
    });

    it('should fail if funds are added by an unauthorized party', async () => {
        const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
        const unauthorizedAddFundsResult = await affiliateContract.send(
            unauthorizedParty.getSender(),
            {
                value: toNano('2'),
            },
            {
                $$type: 'AddFunds',
            }
        );

        expect(unauthorizedAddFundsResult.transactions).toHaveTransaction({
            from: unauthorizedParty.address,
            to: affiliateContract.address,
            success: false
        });
    });

    it('should fail if an unauthorized party tries to remove the affiliate', async () => {
        const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
        const unauthorizedRemoveAffiliateResult = await affiliateContract.send(
            unauthorizedParty.getSender(),
            {
                value: toNano('0.02'),
            },
            {
                $$type: 'RemoveAffiliateAndWithdrawFunds',
            }
        );

        expect(unauthorizedRemoveAffiliateResult.transactions).toHaveTransaction({
            from: unauthorizedParty.address,
            to: affiliateContract.address,
            success: false
        });
    });

    it('should fail if someone other than the bot tries to create an affiliate', async () => {
        const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            unauthorizedParty.getSender(),
            {
                value: toNano('0.15'),
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: publisher.address,
                cpc: toNano('0.1'),
            }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: unauthorizedParty.address,
            to: affiliateMarketplaceContract.address,
            success: false
        });
    });

    it('should fail if someone other than the owner tries to withdraw funds from the marketplace', async () => {
        const unauthorizedParty = await blockchain.treasury('unauthorizedParty');
        const withdrawResult = await affiliateMarketplaceContract.send(
            unauthorizedParty.getSender(),
            {
                value: toNano('0.01'),
            },
            {
                $$type: 'AdminWithdraw',
                amount: toNano('1'),
            }
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: unauthorizedParty.address,
            to: affiliateMarketplaceContract.address,
            success: false
        });
    });
});
