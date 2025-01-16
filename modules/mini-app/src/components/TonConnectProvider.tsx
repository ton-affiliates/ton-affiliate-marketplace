// components/TonConnectProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { TonConnectUI } from '@tonconnect/ui';
import type { Account } from '@tonconnect/ui';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useTelegramContext } from './TelegramContext'; // to get userInfo from context

type TonConnectContextType = {
  connectedStatus: boolean;
  tonConnectUI: TonConnectUI;
  userAccount: Account | null;
  transactionStatus: string | null;
  sendTransaction: (tx: any) => Promise<void>;
};

const TonConnectContext = createContext<TonConnectContextType | undefined>(undefined);

export const TonConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectedStatus, setConnectedStatus] = useState(false);
  const [userAccount, setUserAccount] = useState<Account | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [tonConnectUI] = useTonConnectUI();

  // The Telegram user from our new context
  const { userInfo } = useTelegramContext(); // e.g. { id: 1420603175, ... }

  useEffect(() => {
    // Listen for wallet connect/disconnect
    const unsubscribe = tonConnectUI.onStatusChange((walletInfo) => {
      setConnectedStatus(!!walletInfo);
      if (walletInfo) {
        setUserAccount(walletInfo.account);
      } else {
        setUserAccount(null);
      }
    });
    return () => unsubscribe();
  }, [tonConnectUI]);

  // If user is connected & we have userInfo, POST /api/v1/users/add
  useEffect(() => {
    async function addWallet() {
      if (!userAccount || !userInfo?.id) return;
      try {
        const res = await fetch('/api/v1/users/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userInfo.id,
            address: userAccount.address,
            walletType: userAccount.chain,
            publicKey: userAccount.publicKey
          }),
        });
        const data = await res.json();
        if (data.success) {
          console.log('Wallet added successfully:', data.wallet);
        } else {
          console.error('Error adding wallet:', data.error);
        }
      } catch (err) {
        console.error('Network error adding wallet:', err);
      }
    }

    if (connectedStatus && userAccount) {
      addWallet();
    }
  }, [connectedStatus, userAccount, userInfo]);

  const sendTransaction = async (tx: any) => {
    setTransactionStatus('pending');
    try {
      await tonConnectUI.sendTransaction(tx);
      setTransactionStatus('success');
    } catch (error) {
      setTransactionStatus('error');
      console.error('Transaction failed:', error);
    }
  };

  return (
    <TonConnectContext.Provider
      value={{
        connectedStatus,
        tonConnectUI,
        userAccount,
        transactionStatus,
        sendTransaction,
      }}
    >
      {children}
    </TonConnectContext.Provider>
  );
};

export const useTonConnectFetchContext = () => {
  const ctx = useContext(TonConnectContext);
  if (!ctx) {
    throw new Error('useTonConnectFetchContext must be used within a TonConnectProvider');
  }
  return ctx;
};
