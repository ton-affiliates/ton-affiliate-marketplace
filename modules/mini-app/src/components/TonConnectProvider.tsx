import React, { createContext, useContext, useState, useEffect } from "react";
import { TonConnectUI } from "@tonconnect/ui";
import type { Account } from "@tonconnect/ui"; // The type for walletInfo.account
import { useTonConnectUI } from "@tonconnect/ui-react";

type TonConnectContextType = {
  connectedStatus: boolean;
  tonConnectUI: TonConnectUI;
  userAccount: Account | null;
  transactionStatus: string | null;
  sendTransaction: (tx: any) => Promise<void>; // Function to send a transaction
};

const TonConnectContext = createContext<TonConnectContextType | undefined>(undefined);

export const TonConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectedStatus, setConnectedStatus] = useState(false);
  const [userAccount, setUserAccount] = useState<Account | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    // Subscribe to connection/disconnection events
    const unsubscribe = tonConnectUI.onStatusChange((walletInfo) => {
      setConnectedStatus(!!walletInfo);

      if (walletInfo) {
        setUserAccount(walletInfo.account);
      } else {
        setUserAccount(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI]);

  const sendTransaction = async (tx: any) => {
    setTransactionStatus("pending");

    try {
      await tonConnectUI.sendTransaction(tx); // Send the transaction
      setTransactionStatus("success");
    } catch (error) {
      setTransactionStatus("error");
      console.error("Transaction failed:", error);
    }
  };

  return (
    <TonConnectContext.Provider
      value={{
        connectedStatus,
        tonConnectUI,
        userAccount,
        transactionStatus,
        sendTransaction, // Expose the transaction sender
      }}
    >
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
