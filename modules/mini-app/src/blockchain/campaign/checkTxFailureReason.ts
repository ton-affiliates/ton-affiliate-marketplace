// checkTxFailureReason.ts
import { Address } from '@ton/core';
import { TonClient4 } from '@ton/ton';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { HTTP_ENDPOINT_NETWORK } from '../../common/constants';
import { OpenedContract } from '@ton/core';
import { Campaign } from '../../contracts/Campaign';

// This attempts to look up the last transactions and figure out if we hit a known contract error.
export async function checkTxFailureReason(
  campaignContract: OpenedContract<Campaign>,
  userAccountAddress?: string
): Promise<void> {
  // Decide endpoint
  const endpoint =
    HTTP_ENDPOINT_NETWORK === 'testnet'
      ? await getHttpV4Endpoint({ network: HTTP_ENDPOINT_NETWORK })
      : await getHttpV4Endpoint();

  const client = new TonClient4({ endpoint });

  // Load block and account info
  const block = (await client.getLastBlock()).last.seqno;
  const account = await client.getAccount(block, campaignContract.address);

  if (account.account.state.type !== 'active') {
    throw new Error('Campaign account is not active');
  }

  // Retrieve the last few transactions for the campaign
  const campaignTxs = (
    await client.getAccountTransactions(
      campaignContract.address,
      BigInt(account.account.last!.lt),
      Buffer.from(account.account.last!.hash, 'base64')
    )
  ).map((v) => v.tx);

  // If we know the user’s wallet address, we can attempt to filter for
  // any transaction that originated from that address.
  if (userAccountAddress) {
    for (const tx of campaignTxs) {
      const inMsg = tx?.inMessage;
      const senderAddress = (inMsg as any)?.info?.src?.toString();

      // Compare addresses
      if (senderAddress !== Address.parse(userAccountAddress).toString()) {
        continue;
      }

      // Check if there's an exit code in the compute phase
      const computePhase = (tx.description as any)?.computePhase;
      if (computePhase && computePhase.exitCode !== undefined) {
        const exitCode = computePhase.exitCode;
        // The contract’s ABI might have a known error mapped to that exit code
        const error = campaignContract.abi?.errors?.[Number(exitCode.toString())];
        if (error) {
          throw new Error(error.message);
        }
      }
    }
  }

  // If we got here, we either didn’t find the matching TX
  // or no known exit-code was present.
  throw new Error('Tx failed!');
}
