import React, { useEffect } from "react";
import { TonConnectButton } from "@tonconnect/ui-react";
import { useTonConnectFetchContext } from "./TonConnectProvider"; // Assuming you're using a provider

const WalletConnectScreen: React.FC = () => {
  const { connectedStatus } = useTonConnectFetchContext(); // Use context to monitor wallet status

  useEffect(() => {
    console.log(`Wallet connection status: ${connectedStatus ? "Connected" : "Disconnected"}`);
  }, [connectedStatus]);

  return (
    <div style={{ textAlign: "center", marginTop: "20%" }}>
      <h2>Connect Your Wallet</h2>
      {!connectedStatus ? (
        <>
          <p>Please connect your Telegram wallet to proceed.</p>
          <TonConnectButton />
        </>
      ) : (
        <p>Your wallet is connected. You can disconnect from the wallet interface if needed.</p>
      )}
    </div>
  );
};

export default WalletConnectScreen;
