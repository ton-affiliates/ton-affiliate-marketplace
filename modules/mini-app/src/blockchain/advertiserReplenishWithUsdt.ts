import { Address, beginCell, OpenedContract, Sender, Cell, toNano } from '@ton/core';
import { Campaign } from '../contracts/Campaign';
import { TonConfig } from '../config/TonConfig'
import { randomBytes } from 'crypto';
import { TonClient } from '@ton/ton';
import { pollUntil } from './pollUntil'; // adjust path to your pollUntil

// Function to calculate Jetton Wallet Address
async function getUSDTWalletAddress(ownerAddress: Address, client: TonClient) {
  const ownerAddressCell = beginCell().storeAddress(ownerAddress).endCell();
  const result = await client.runMethod(
    TonConfig.USDT_MASTER_ADDRESS,
    'get_wallet_address',
    [{ type: 'slice', cell: ownerAddressCell }]
  );
  return result.stack.readAddress();
}

/**
 * Converts a user-entered USDT amount (e.g., "100.5") to 6-decimal representation.
 */
function toUSDT(amount: string | number): bigint {
  const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(parsedAmount)) {
    throw new Error('Invalid amount: Must be a finite number.');
  }
  return BigInt(Math.round(parsedAmount * 10 ** 6));
}

export async function replenishWithUsdt(
  campaignContract: OpenedContract<Campaign> | null,
  usdtAmount: number,
  sender: Sender,
  userAccountAddress: string | undefined, // renamed for consistency
  tonClient: TonClient | null
): Promise<void> {
  if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
  }
  if (!tonClient) {
    throw new Error('Ton Client is not initialized or null.');
  }
  if (!userAccountAddress) {
    throw new Error('UserAccount is not initialized or does not have an address.');
  }

  // Before-balance
  const { contractUSDTBalance: balanceBefore } = await campaignContract.getCampaignData();

  const usdtAmountNano = toUSDT(usdtAmount.toString());
  console.log('usdtAmountNano:', usdtAmountNano);

  // Generate random query ID
  const randomQueryId = BigInt('0x' + randomBytes(8).toString('hex'));

  // Calculate sender's Jetton Wallet Address
  const senderJettonWalletAddress = await getUSDTWalletAddress(
    Address.parse(userAccountAddress),
    tonClient
  );
  console.log(`Sender Jetton Wallet Address: ${senderJettonWalletAddress.toString()}`);

  // Create forward payload
  const forwardPayload = beginCell()
    .storeUint(0, 32) // 0 opcode means a comment
    .storeStringTail('Replenish Campaign with USDT')
    .endCell();

  // Jetton transfer payload
  const jettonTransferPayload: Cell = beginCell()
    .storeUint(0xf8a7ea5, 32) // OP code for Jetton transfer
    .storeUint(randomQueryId, 64) // Query ID
    .storeCoins(usdtAmountNano) // Amount of USDT to send
    .storeAddress(campaignContract.address) // Recipient address
    .storeAddress(campaignContract.address) // Response address for excess gas
    .storeBit(0) // No custom payload
    .storeCoins(TonConfig.GAS_FEE) // Forwarded TON amount
    .storeBit(1) // Forward payload is stored as a reference
    .storeRef(forwardPayload)
    .endCell();

  // Gas fee for the transaction
  const fixedGasFee = toNano('0.05');
  const totalValueToSend = TonConfig.GAS_FEE + fixedGasFee;

  // Send the Jetton transfer from the user's jetton wallet
  await sender.send({
    value: totalValueToSend,
    to: senderJettonWalletAddress,
    body: jettonTransferPayload,
    bounce: true,
  });

  // Poll until the campaign's USDT balance changes
  await pollUntil(
    async () => {
      const { contractUSDTBalance: balanceAfter } = await campaignContract.getCampaignData();
      return balanceAfter !== balanceBefore;
    },
    campaignContract,
    userAccountAddress
  );

  console.log('USDT replenished successfully!');
}
