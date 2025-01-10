// TelegramCampaignContext.tsx
import React, { createContext, useContext, useState } from 'react';
import {TelegramCampaign} from '@common/models'

interface TelegramCampaignContextProps {
  telegramCampaign: TelegramCampaign | null;
  setTelegramCampaign: (campaign: TelegramCampaign | null) => void;
}

const TelegramCampaignContext = createContext<TelegramCampaignContextProps>({
  telegramCampaign: null,
  setTelegramCampaign: () => {},
});

export const TelegramCampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [telegramCampaign, setTelegramCampaign] = useState<TelegramCampaign | null>(null);

  return (
    <TelegramCampaignContext.Provider value={{ telegramCampaign, setTelegramCampaign }}>
      {children}
    </TelegramCampaignContext.Provider>
  );
};

export const useTelegramCampaignContext = () => useContext(TelegramCampaignContext);
