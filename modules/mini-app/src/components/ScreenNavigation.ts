export type ScreenTypes =
  | 'main'
  | 'advertiser'
  | 'campaign'
  | 'status'
  | 'setupTelegram'
  | 'deployEmptyCampaign'
  | 'login'
  | 'blockchainCampaignSetup';

export interface ScreenProps {
  setScreen: React.Dispatch<React.SetStateAction<ScreenTypes>>;
}
