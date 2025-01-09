import React, { useState, useEffect } from "react";
import { TonConnectButton } from "@tonconnect/ui-react";
import { useTonConnectFetchContext } from "../TonConnectProvider"; // Assuming you're using a provider

const WalletConnectScreen: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { connectedStatus } = useTonConnectFetchContext(); // Use context to monitor wallet status

  useEffect(() => {
    if (!connectedStatus) {
      setError("Failed to connect to the wallet. Please try again.");
    } else {
      setError(null); // Clear error when connected
    }
  }, [connectedStatus]);

  return (
    <div style={{ textAlign: "center", marginTop: "20%" }}>
      <h2>Connect Your Wallet</h2>
      <p>Please connect your Telegram wallet to proceed.</p>
      <TonConnectButton />
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default WalletConnectScreen;
