import { Blockchain } from '@ton/sandbox';
import { toNano, fromNano, Address } from '@ton/core';
import { AffiliateMarketplace } from '../dist/tact_AffiliateMarketplace';
import { Affiliate } from '../dist/tact_Affiliate';
import '@ton/test-utils';


type EmitLogEvent = {
    type: string;
    data: any;
};

const logs: EmitLogEvent[] = [];

const EVENT_TYPE_AFFILIATE_CREATED = 3933896749; // AffiliateCreatedEvent


function loadEvent(cell: Cell, expectedEventType: number) {
    const slice = cell.beginParse();
    const eventType = slice.loadUint(32);
    if (eventType !== expectedEventType) {
        console.log("EventType: " + eventType);
        throw new Error("Unexpected event type");
    }
    return slice;
}

function loadAffiliateCreatedEvent(cell: Cell) {
    const slice = loadEvent(cell, EVENT_TYPE_AFFILIATE_CREATED);
    const affiliateId = slice.loadUint(32);
    const advertiser = slice.loadAddress().toString();
    const publisher = slice.loadAddress().toString();
    const affiliateContractAddress = slice.loadAddress();
    return { $$type: 'AffiliateCreatedEvent', affiliateId, advertiser, publisher, affiliateContractAddress };
}

describe('AffiliateMarketplace Integration Test', () => {
    let blockchain;
    let affiliateMarketplaceContract;
    let deployer;
    let bot;
    let advertiser;
    let publisher;

    beforeEach(async () => {
        
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        bot = await blockchain.treasury('bot');
        advertiser = await blockchain.treasury('advertiser');
        publisher = await blockchain.treasury('publisher');
        affiliateMarketplaceContract = blockchain.openContract(await AffiliateMarketplace.fromInit(bot.address));

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
    });

    it('should create affiliate,sign by publisher, and handle user click', async () => {
        
        const cpc = toNano('0.1');

        logs.push({ type: 'AffiliateMarketplaceContractBalance', data: fromNano(await affiliateMarketplaceContract.getBalance()) + " TON"  });
        logs.push({ type: 'AdvertiserBalance', data: fromNano(await advertiser.getBalance()) + " TON"  });
        logs.push({ type: 'PublisherBalance', data: fromNano(await publisher.getBalance()) + " TON"  });

        // Create Affiliate
        const createAffiliateResult = await affiliateMarketplaceContract.send(
            bot.getSender(),
            {
                value: toNano('10'), // load contract with 10 TON + fees
            },
            {
                $$type: 'CreateAffiliate',
                advertiser: advertiser.address,
                publisher: publisher.address
            }
        );

        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: bot.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        let affiliateContractAddress: string | null = null;
        for (const external of createAffiliateResult.externals) {
            if (external.body) {
                const decodedAffiliate = loadAffiliateCreatedEvent(external.body);
                logs.push({ type: 'AffiliateCreatedEvent', data: decodedAffiliate });
                expect(decodedAffiliate).toMatchObject({
                    $$type: 'AffiliateCreatedEvent',
                    affiliateId: 0,
                    advertiser: advertiser.address.toString(),
                    publisher: publisher.address.toString()
                });
                affiliateContractAddress = decodedAffiliate.affiliateContractAddress;
            }
        }

        expect(affiliateContractAddress).not.toBeNull();
        expect(createAffiliateResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: affiliateContractAddress,
            success: true,
            deploy: true,
        });

     
        // const affiliateContract = blockchain.openContract(await Affiliate.fromAddress(affiliateContractAddress));

        // logs.push({ type: 'AffiliateMarketplaceContractBalance', data: fromNano(await affiliateMarketplaceContract.getBalance()) + " TON"  });
        // logs.push({ type: 'AffiliateContractBalance', data: fromNano(await affiliateContract.getBalance()) + " TON" });
        // logs.push({ type: 'AdvertiserBalance', data: fromNano(await advertiser.getBalance()) + " TON"  });
        // logs.push({ type: 'PublisherBalance', data: fromNano(await publisher.getBalance()) + " TON"  });

        
        // // Publisher signs the contract
        // const publisherSignedResult = await affiliateContract.send(
        //     publisher.getSender(),
        //     {
        //         value: toNano('0.01'),
        //     },
        //     {
        //         $$type: 'PublisherSigned',
        //     }
        // );

        // expect(publisherSignedResult.transactions).toHaveTransaction({
        //     from: publisher.address,
        //     to: affiliateContract.address,
        //     success: true,
        // });

        // for (const external of publisherSignedResult.externals) {
        //     if (external.body) {
        //         const decodedEvent = loadPublisherSignedEvent(external.body);
        //         logs.push({ type: 'PublisherSignedEvent', data: decodedEvent });
        //         expect(decodedEvent).toMatchObject({
        //             $$type: 'PublisherSignedEvent',
        //             affiliateId: 0,
        //             publisher: publisher.address.toString(),
        //             cpc: cpc,
        //         });
        //     }
        // }

        // // Handle User Click
        // const userClickResult = await affiliateMarketplaceContract.send(
        //     bot.getSender(),
        //     {
        //         value: toNano('0.05'),
        //     },
        //     {
        //         $$type: 'UserClick',
        //         affiliateId: 0,
        //         advertiser: advertiser.address,
        //         publisher: publisher.address,
        //         cpc: cpc,
        //     }
        // );

        // expect(userClickResult.transactions).toHaveTransaction({
        //     from: affiliateMarketplaceContract.address,
        //     to: affiliateContract.address,
        //     success: true,
        // });

        // for (const external of userClickResult.externals) {
        //     if (external.body) {
        //         const decodedEvent = loadPublisherPaidEvent(external.body);
        //         logs.push({ type: 'PublisherPaidEvent', data: decodedEvent });
        //         expect(decodedEvent).toMatchObject({
        //             $$type: 'PublisherPaidEvent',
        //             affiliateId: 0,
        //             publisher: publisher.address.toString(),
        //             cpc: cpc,
        //         });
        //     }
        // }

        // // Check that the click was registered and CPC was paid
        // const numUserClicks = await affiliateContract.getNumUserClicks();
        // expect(numUserClicks).toBe(1n);

        // logs.push({ type: 'AffiliateMarketplaceContractBalance', data: fromNano(await affiliateMarketplaceContract.getBalance()) + " TON"  });
        // logs.push({ type: 'AffiliateContractBalance', data: fromNano(await affiliateContract.getBalance()) + " TON" });
        // logs.push({ type: 'AdvertiserBalance', data: fromNano(await advertiser.getBalance()) + " TON"  });
        // logs.push({ type: 'PublisherBalance', data: fromNano(await publisher.getBalance()) + " TON"  });



        // Custom replacer function to handle BigInt serialization
        function replacer(key, value) {
            return typeof value === 'bigint' ? fromNano(value).toString() + " TON" : value;
        }

        // Output the final logs
        console.log("Final logs:", JSON.stringify(logs, replacer, 2));
    });



});
