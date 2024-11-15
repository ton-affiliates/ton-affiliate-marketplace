// usdtUtils.ts
import { toNano, Address, fromNano, Dictionary, Cell, beginCell } from 'ton-core';
import { USDT_MASTER_ADDRESS } from './utils'; 
import {TonClient}from 'ton';


// Function to calculate Jetton Wallet Address
export async function getUSDTWalletAddress (ownerAddressStr: string, client: TonClient) {
  let ownerAddress = Address.parse(ownerAddressStr);
  const ownerAddressCell = beginCell().storeAddress(ownerAddress).endCell();
  const result = await client.runMethod(USDT_MASTER_ADDRESS, 'get_wallet_address', [{ type: 'slice', cell: ownerAddressCell }]);
  return result.stack.readAddress();
}