// TonConnectProvider.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { TonConnectUI } from "@tonconnect/ui";
import type { Account } from "@tonconnect/ui"; // The type for walletInfo.account
import { useTonConnectUI } from "@tonconnect/ui-react";

type TonConnectContextType = {
  connectedStatus: boolean;
  tonConnectUI: TonConnectUI;
  /**
   * The entire wallet account object from TonConnect.
   * If not connected, this is `null`.
   */
  userAccount: Account | null;
};

const TonConnectContext = createContext<TonConnectContextType | undefined>(undefined);

export const TonConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectedStatus, setConnectedStatus] = useState(false);
  const [userAccount, setUserAccount] = useState<Account | null>(null);
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    // Subscribe to connection/disconnection events
    const unsubscribe = tonConnectUI.onStatusChange((walletInfo) => {
      // If walletInfo exists, user is connected
      setConnectedStatus(!!walletInfo);

      if (walletInfo) {
        // Store the entire account object, e.g. { address: "...", chain: "...", ... }
        setUserAccount(walletInfo.account);
      } else {
        setUserAccount(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI]);

  return (
    <TonConnectContext.Provider value={{ connectedStatus, tonConnectUI, userAccount }}>
      {children}
    </TonConnectContext.Provider>
  );
};

// Custom hook for consuming the context
export const useTonConnectFetchContext = () => {
  const context = useContext(TonConnectContext);
  if (!context) {
    throw new Error("useTonConnectFetchContext must be used within a TonConnectProvider");
  }
  return context;
};
