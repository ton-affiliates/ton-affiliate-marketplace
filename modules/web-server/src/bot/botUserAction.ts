import { Sender, toNano, Address, SenderArguments } from '@ton/core';
import { Campaign } from '../contracts/Campaign';
import { TonConfig } from '../config/TonConfig';
import { mnemonicToWalletKey, mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient4, WalletContractV4, WalletContractV5R1 } from '@ton/ton';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { Logger } from '../utils/Logger';
import { MnemonicProvider, WalletVersion, } from "@ton/blueprint/dist/network/send/MnemonicProvider";
import { BlueprintTonClient } from "@ton/blueprint/dist/network/NetworkProvider";
import { UIProvider  } from "@ton/blueprint/dist/ui/UIProvider";
import { InquirerUIProvider } from "@ton/blueprint/dist/ui/InquirerUIProvider";
// import { SendProviderSender } from "@ton/blueprint/dist/network/createNetworkProvider";
import { SendProvider } from '@ton/blueprint/dist/network/send/SendProvider';


class SendProviderSender implements Sender {
    #provider: SendProvider;
    readonly address?: Address;

    constructor(provider: SendProvider) {
        this.#provider = provider;
        this.address = provider.address();
    }

    async send(args: SenderArguments): Promise<void> {
        await this.#provider.sendTransaction(args.to, args.value, args.body ?? undefined, args.init ?? undefined);
    }
}


export async function botUserAction(
  campaignContractAddress: string,
  affiliateId: bigint,
  userActionOpCode: bigint,
  isPremiumUser: boolean,
): Promise<void> {
  try {

    // Derive wallet key from mnemonic and get endpoint
    let endpoint;
    if (TonConfig.HTTP_ENDPOINT_NETWORK === 'testnet') {
      endpoint = await getHttpV4Endpoint({ network: 'testnet' });
      Logger.info(`Using testnet endpoint: ${endpoint}`);
    } else {
      endpoint = await getHttpV4Endpoint(); // mainnet
      Logger.info(`Using mainnet endpoint: ${endpoint}`);
    }
    
    // Read mnemonic from environment variables
    const mnemonic = process.env.WALLET_MNEMONIC?.split(' ');
    Logger.info(`Retrieved mnemonic: ${mnemonic ? mnemonic.join(' ') : 'undefined'}`);
    if (!mnemonic || mnemonic.length !== 24) {
      throw new Error('Invalid or missing WALLET_MNEMONIC. Ensure it is set in the .env file.');
    }

    const { secretKey } = await mnemonicToPrivateKey(mnemonic);
    
    // Initialize TON client
    const client: BlueprintTonClient = new TonClient4({ endpoint });

    // Initialize UI Provider (Replace with your actual UI handler)
    const uiProvider: UIProvider = new InquirerUIProvider();

    // Wallet version
    const version: WalletVersion = process.env.WALLET_VERSION as WalletVersion || "v4";  // default to v4 if not found in env
    Logger.info(`[BotUserAction] - Using Wallet Version: ${version}`);

    // Create MnemonicProvider instance
    const provider = new MnemonicProvider({
        version,
        workchain: 0, // Use 0 for the main workchain
        secretKey: Buffer.from(secretKey), // Convert secret key to Buffer
        client,
        ui: uiProvider
    });

    Logger.info("[BotUserAction] - Using address: " + provider.address().toString({bounceable: true, testOnly: true}));
    Logger.info("[BotUserAction] - Using address: " + provider.address().toRawString());

    // Open campaign contract
    const parsedCampaignAddress = Address.parse(campaignContractAddress);
    const campaign = client.open(Campaign.fromAddress(parsedCampaignAddress));

    // Pre-check affiliate balance
    const affiliateDataBefore = await campaign.getAffiliateData(affiliateId);
    if (!affiliateDataBefore) {
      throw new Error(`No such affiliate ${affiliateId} exists in this campaign.`);
    }
    const affiliateBalanceBefore = affiliateDataBefore.totalEarnings;
    Logger.info(`Affiliate balance before transaction: ${affiliateBalanceBefore}`);

    const sender: Sender = new SendProviderSender(provider);
    Logger.info(`Sender: ${sender.address!.toString({bounceable: true, testOnly: true})}`);
    Logger.info(`Sender: ${sender.address!.toRawString()}`);

    // Send user action transaction
    await campaign.send(
      sender,
      { value: TonConfig.GAS_FEE },
      {
        $$type: 'BotUserAction',
        affiliateId,
        userActionOpCode,
        isPremiumUser,
      }
    );
    Logger.info('Transaction sent by bot, waiting for confirmation...');

    // Polling loop: wait until affiliate data changes
    let attempt = 0;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    while (true) {
      const newAffiliateData = await campaign.getAffiliateData(affiliateId);
      if (newAffiliateData?.totalEarnings !== affiliateBalanceBefore) {
        Logger.info(
          `Tx written successfully for campaign: ${campaignContractAddress}, affiliate: ${affiliateId}, opCode: ${userActionOpCode}`
        );
        break;
      }

      attempt++;
      if (attempt > TonConfig.MAX_ATTEMPTS) {
        throw new Error("Reached MAX ATTEMPTS when writing event to blockchain");
      }
      Logger.info(`Polling attempt ${attempt}: Affiliate balance unchanged. Waiting before next attempt...`);
      await delay(2000); // 2-second delay between polls
    }
  } catch (error: any) {
    Logger.error("botUserAction failed:", error);
    throw new Error(error.message || "Unknown error in botUserAction");
  }
}
