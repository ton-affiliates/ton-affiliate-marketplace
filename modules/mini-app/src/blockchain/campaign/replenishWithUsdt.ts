import { Address, beginCell, OpenedContract, Sender, Cell, toNano } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';
import { MAX_ATTEMPTS, GAS_FEE, USDT_MASTER_ADDRESS } from '@common/constants';
import { randomBytes } from 'crypto';
import { TonClient } from "@ton/ton";

// Function to calculate Jetton Wallet Address
async function getUSDTWalletAddress (ownerAddress: Address, client: TonClient) {
    const ownerAddressCell = beginCell().storeAddress(ownerAddress).endCell();
    const result = await client.runMethod(USDT_MASTER_ADDRESS, 'get_wallet_address', [{ type: 'slice', cell: ownerAddressCell }]);
    return result.stack.readAddress();
}

/**
 * Converts a user-entered USDT amount (e.g., "100.5" or 100.5) to 6-decimal representation.
 * @param {string | number} amount - The user-entered amount in human-readable format (e.g., 100.5).
 * @returns {bigint} - The amount converted to 6-decimal representation as a bigint.
 */
function toUSDT(amount: string | number): bigint {
    const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!Number.isFinite(parsedAmount)) {
        throw new Error("Invalid amount: Must be a finite number.");
    }
    return BigInt(Math.round(parsedAmount * 10 ** 6));
}


export async function replenishWithUsdt(
   campaignContract: OpenedContract<Campaign> | null,
   usdtAmount: number,
   sender: Sender,
   userAccount: string | undefined,
   tonClient: TonClient | null
): Promise<void> {

 if (!campaignContract) {
    throw new Error('Campaign contract is not initialized or null.');
 }

 if (!tonClient) {
    throw new Error('Ton Client is not initialized or null.');
 }

 if (!userAccount) {
    throw new Error("UserAccount is not initialized or does not have an address.");
 }

 const balanceBefore = (await campaignContract.getCampaignData()).contractUSDTBalance;
  
  const usdtAmountNano = toUSDT(usdtAmount.toString());
  console.log("usdtAmountNano: " + usdtAmountNano);
  // Generate random query ID
  const randomQueryId = BigInt('0x' + randomBytes(8).toString('hex'));

  // Calculate sender's Jetton Wallet Address (USDT Wallet)
  const senderJettonWalletAddress = await getUSDTWalletAddress(Address.parse(userAccount), tonClient);
  console.log(`Sender Jetton Wallet Address: ${senderJettonWalletAddress.toString()}`);

  // Create forward payload (optional comment)
  const forwardPayload = beginCell()
      .storeUint(0, 32) // 0 opcode means we have a comment
      .storeStringTail('Replenish Campaign with USDT')
      .endCell();

    const jettonTransferPayload: Cell = beginCell()
    .storeUint(0xf8a7ea5, 32) // OP code for Jetton transfer
    .storeUint(randomQueryId, 64) // Query ID
    .storeCoins(usdtAmountNano) // Amount of USDT to send
    .storeAddress(campaignContract.address) // Recipient address
    .storeAddress(campaignContract.address) // Response address for excess gas
    .storeBit(0) // No custom payload
    .storeCoins(GAS_FEE) // Forwarded TON amount
    .storeBit(1) // Forward payload is stored as a reference
    .storeRef(forwardPayload)
    .endCell();

  // Fixed gas fee (e.g., 0.05 TON for the transaction)
 const fixedGasFee = toNano('0.05');

  // Calculate the total value to send (forwarded TON + gas fee)
  const totalValueToSend = GAS_FEE + fixedGasFee;

  await sender.send({
    value: totalValueToSend, 
    to: senderJettonWalletAddress,
    body: jettonTransferPayload,
    bounce: true,
  });

  let attempt = 0;
  while (true) {
    const balanceAfter = (await campaignContract.getCampaignData()).contractUSDTBalance;
    if (balanceAfter !== balanceBefore) break;

    console.log("Atempt: " + attempt + " balanceAfter: " + balanceAfter)

    if (++attempt > MAX_ATTEMPTS) throw new Error('USDT replenish timed out.');
    await new Promise((res) => setTimeout(res, 2000)); // Sleep 2 seconds
  }
}

