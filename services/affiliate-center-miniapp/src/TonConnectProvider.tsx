import React, { createContext, useContext, useState, useEffect } from "react";
import { TonConnectUI } from "@tonconnect/ui";
import { useTonConnectUI } from "@tonconnect/ui-react";

type TonConnectContextType = {
  connectedStatus: boolean;
  tonConnectUI: TonConnectUI;
};

const TonConnectContext = createContext<TonConnectContextType | undefined>(undefined);

export const TonConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [connectedStatus, setConnectedStatus] = useState(false);
    const [tonConnectUI] = useTonConnectUI();
  

  useEffect(() => {
    // Subscribe to connection and disconnection events
    const unsubscribe = tonConnectUI.onStatusChange((walletInfo) => {
      setConnectedStatus(!!walletInfo);
    });

    return () => {
      unsubscribe(); // Clean up subscription
    };
  }, [tonConnectUI]);

  return (
    <TonConnectContext.Provider value={{ connectedStatus, tonConnectUI }}>
      {children}
    </TonConnectContext.Provider>
  );
};

// Custom hook to use TonConnectContext
export const useTonConnectFetchContext = () => {
  const context = useContext(TonConnectContext);
  if (!context) {
    throw new Error("useTonConnectFetchContext must be used within a TonConnectProvider");
  }
  return context;
};
