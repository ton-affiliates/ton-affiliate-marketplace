import { Sender, toNano, Address } from '@ton/core';
import { Campaign } from '../contracts/Campaign';
import { TonConfig } from '../config/TonConfig';
import { mnemonicToWalletKey } from '@ton/crypto';

// For chain checks
import { TonClient4, WalletContractV4 } from '@ton/ton';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { Logger } from '../utils/Logger';

export async function botUserAction(
  campaignContractAddress: string,
  affiliateId: bigint,
  userActionOpCode: bigint,
  isPremiumUser: boolean,
): Promise<void> {

    // Derive wallet key from mnemonic
    let endpoint;
    if (TonConfig.HTTP_ENDPOINT_NETWORK === 'testnet') {
        endpoint = await getHttpV4Endpoint({ network: 'testnet' });
    } else {
        endpoint = await getHttpV4Endpoint(); // mainnet
    }
    const client = new TonClient4({ endpoint });

     // Read mnemonic from environment variables
    const mnemonic = process.env.BOT_WALLET_MNEMONIC?.split(' ');
    if (!mnemonic || mnemonic.length !== 24) {
        throw new Error('Invalid or missing WALLET_MNEMONIC. Ensure it is set in the .env file.');
    }
    const keyPair = await mnemonicToWalletKey(mnemonic);

    // Open Wallet V4 (modify if using another wallet version)
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const sender: Sender = client.open(wallet).sender(keyPair.secretKey);

    // 3) On-chain checks
    
    const campaignAddress = Address.parse(campaignContractAddress);
    const campaign = client.open(Campaign.fromAddress(campaignAddress));

    // Pre-check affiliate balance
    const affiliateDataBefore = await campaign.getAffiliateData(affiliateId);
    if (!affiliateDataBefore) {
        throw new Error(`No such affiliate ${affiliateId} exists in this campaign.`);
    }
    const affiliateBalanceBefore = affiliateDataBefore.totalEarnings;

    console.log(
        `[botUserAction] Sending BotUserAction: campaignId=${campaignContractAddress}, affiliateId=${affiliateId}, opCode=${userActionOpCode}, isPremiumUser=${isPremiumUser}`
    );

    // Send user action
    await campaign.send(sender, { value: toNano(TonConfig.GAS_FEE) }, {
        $$type: 'BotUserAction',
        affiliateId,
        userActionOpCode,
        isPremiumUser,
    });

    let attempt = 0;
    while (true) {
        const newAffiliateData = await campaign.getAffiliateData(affiliateId);
        if (newAffiliateData?.totalEarnings !== affiliateBalanceBefore) {
            Logger.info(`Tx written successfully! for campaign: ${campaignContractAddress} affilaite: ${affiliateId} opCode: ${userActionOpCode}`)
            break;
        }

        if (++attempt > TonConfig.MAX_ATTEMPTS) {
            throw new Error("Reached MAX ATTEMPTS when writing event to blockchain");
        }
    }

}
