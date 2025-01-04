// TelegramCampaignContext.tsx
import React, { createContext, useContext, useState } from 'react';

export enum TelegramCategory {
  GAMING = 'Gaming',
  CRYPTO = 'Crypto',
  TECHNOLOGY = 'Technology',
  LIFESTYLE = 'Lifestyle',
  EDUCATION = 'Education',
  HEALTH = 'Health',
  TRAVEL = 'Travel',
  FINANCE = 'Finance',
  ENTERTAINMENT = 'Entertainment',
  POLITICS = 'Politics',
  SOCIAL = 'Social',
  SPORTS = 'Sports',
  NEWS = 'News',
  SCIENCE = 'Science',
  ART = 'Art',
  MUSIC = 'Music',
  OTHER = 'Other',
}

export enum TelegramAssetType {
  CHANNEL,
  GROUP,
  SUPER_GROUP,
  FORUM,
  MINI_APP,
}

export interface TelegramAsset {
  id: number;
  name: string;
  type: TelegramAssetType;
  isPublic: boolean;
  url: string;
}

export interface TelegramCampaign {
  campaignId: string;
  name: string;
  description: string;
  category: TelegramCategory;
  telegramAsset: TelegramAsset | null;
}

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
