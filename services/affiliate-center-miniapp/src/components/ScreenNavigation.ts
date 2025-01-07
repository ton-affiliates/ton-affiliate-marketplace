export type ScreenTypes =
  | "main"
  | "advertiser"
  | "campaign"
  | "status"
  | "setupTelegram"
  | "deployEmptyCampaign";

export interface ScreenProps {
  setScreen: React.Dispatch<React.SetStateAction<ScreenTypes>>;
}