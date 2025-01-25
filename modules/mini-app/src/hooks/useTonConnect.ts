import { useTonConnectUI } from '@tonconnect/ui-react';
import { Sender, SenderArguments } from '@ton/core';

export function useTonWalletConnect(): { sender: Sender; connected: boolean } {
  const [tonConnectUI] = useTonConnectUI();

  return {
    sender: {
      send: async (args: SenderArguments) => {
        try {
          // Prompt user to agree to the Terms of Service before sending a transaction
          const userAgreed = window.confirm(
            "By proceeding, you agree to the Terms of Service. Read them here: https://tonaffiliates.com/terms"
          );

          if (!userAgreed) {
            console.log("User did not agree to the Terms of Service.");
            throw new Error("Terms of Service not agreed to");
          }

          // Proceed with the transaction if the user agrees
          await tonConnectUI.sendTransaction({
            messages: [
              {
                address: args.to.toString(),
                amount: args.value.toString(),
                payload: args.body?.toBoc().toString('base64'),
              },
            ],
            validUntil: Date.now() + 5 * 60 * 1000, // Set transaction validity
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes("canceled")) {
            console.log("Transaction was canceled by the user.");
            throw new Error("canceled");
          }
          console.error("Transaction failed:", error);
          throw error;
        }
      },
    },
    connected: tonConnectUI.connected,
  };
}
