import { Blockchain, printTransactionFees, prettyLogTransactions } from '@ton/sandbox';
import { toNano, fromNano, Address, Dictionary  } from '@ton/core';
import { AffiliateMarketplace, loadCampaignCreatedReply } from '../dist/tact_AffiliateMarketplace';
import { Campaign } from '../dist/tact_Campaign';
import '@ton/test-utils';

import {
    loadAffiliateCreatedEvent,
    loadCampaignCreatedEvent
} from './events';

import { formatCampaignData } from './helpers';

type EmitLogEvent = {
    type: string;
    data: any;
};

const logs: EmitLogEvent[] = [];


describe('AffiliateMarketplace Integration Test', () => {
    let blockchain;
    let affiliateMarketplaceContract;
    let deployer;
    let bot;
    let advertiser;
    let affiliate1;
    let affiliate2;

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

    it('should create campaign, create affiliate, set details by advertiser, sign by publisher, and handle user click', async () => {
        
        logs.push({ type: 'AffiliateMarketplaceContractBalance', data: fromNano(await affiliateMarketplaceContract.getBalance()) + " TON"  });
        logs.push({ type: 'AdvertiserBalance', data: fromNano(await advertiser.getBalance()) + " TON"  });

        // Create Affiliate
        const createCampaignResult = await affiliateMarketplaceContract.send(
            advertiser.getSender(),
            {
                value: toNano('0.5'), 
            },
            {
                $$type: 'CreateCampaign'
            }
        );

        // prettyLogTransactions(createCampaignResult.transactions);
        // printTransactionFees(createCampaignResult.transactions); 

        expect(createCampaignResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: affiliateMarketplaceContract.address,
            success: true,
        });

        let campaignContractAddress: string | null = null;
        let campaignId: number | null = null;

        for (const external of createCampaignResult.externals) {
            if (external.body) {
                const decodedCampaign = loadCampaignCreatedEvent(external.body);
                logs.push({ type: 'CampaignCreatedEvent', data: decodedCampaign });
                expect(decodedCampaign).toMatchObject({
                    $$type: 'CampaignCreatedEvent',
                    campaignId: 0,
                    advertiser: advertiser.address.toString()
                });
                campaignContractAddress = Address.parse(decodedCampaign.campaignContractAddress);
                campaignId = 0;
            }
        }

        expect(campaignId).not.toBeNull();        
        expect(campaignContractAddress).not.toBeNull();
        expect(createCampaignResult.transactions).toHaveTransaction({
            from: affiliateMarketplaceContract.address,
            to: campaignContractAddress,
            success: true,
            deploy: true,
        });
        
        let campaignContractAddressFromMarketplace = await affiliateMarketplaceContract.getCampaignContractAddress(campaignId, advertiser.address);
        
        expect(campaignContractAddress.toString()).toEqual(campaignContractAddressFromMarketplace.toString());
        
        const campaignContract = blockchain.openContract(await Campaign.fromAddress(campaignContractAddress));
        
        // Advertiser Signed
        let USER_CLICK = 0;
        
        const regularUsersMap = Dictionary.empty<bigint, bigint>();
        const premiumUsersMap = Dictionary.empty<bigint, bigint>();
        const allowedAffiliatesMap = Dictionary.empty<Address, bool>();

        regularUsersMap.set(BigInt(USER_CLICK), toNano("0.1"));
        premiumUsersMap.set(BigInt(USER_CLICK), toNano("0.2"));
        
        const advertiserSignedResult = await campaignContract.send(
            advertiser.getSender(),
            {
                value: toNano('250'),
            },
            {
                $$type: 'AdvertiserSigned',
                campaignDetails: {
                    $$type: 'CampaignDetails',
                    regularUsers: regularUsersMap,// userAction => price
                    premiumUsers: premiumUsersMap, // userAction => price
                    allowedAffiliates: allowedAffiliatesMap,  // address -> dummy (closed campaign)
                    isOpenCampaign: true, // anyone can be an affiliate
                    daysWithoutUserActionForWithdrawFunds: 30
                }
            }
        );

        expect(advertiserSignedResult.transactions).toHaveTransaction({
            from: advertiser.address,
            to: campaignContractAddress,
            success: true
        });

        logs.push({ type: 'AffiliateMarketplaceContractBalance', data: fromNano(await affiliateMarketplaceContract.getBalance()) + " TON"  });
        logs.push({ type: 'AdvertiserBalance', data: fromNano(await advertiser.getBalance()) + " TON"  });

        campaignData = await campaignContract.getCampaignDetails();
        logs.push('CampaignData', await formatCampaignData(campaignData));
      
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



        // Then when you log it at the end of your test:
        function replacer(key, value) {
            return typeof value === 'bigint' ? fromNano(value).toString() + " TON" : value;
        }

        // Using JSON.stringify with proper indentation
        console.log("Final logs:", JSON.stringify(logs, replacer, 2)); // The '2' provides pretty-printed JSON output with two spaces of indentation.


        
    });



});
