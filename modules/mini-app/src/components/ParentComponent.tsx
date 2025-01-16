import { useState } from 'react';
import DeployCampaignButton from './DeployEmptyCampaign';
import TelegramSetup from './TelegramSetupCampaign';
import { ScreenTypes } from './ScreenNavigation'; // Import ScreenProps for consistency

const ParentComponent: React.FC = () => {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenTypes>('deployEmptyCampaign'); // Use ScreenTypes here

  return (
    <>
      {currentScreen === 'deployEmptyCampaign' && (
        <DeployCampaignButton setScreen={setCurrentScreen} setCampaignId={setCampaignId} />
      )}
      {currentScreen === 'setupTelegram' && (
        <TelegramSetup campaignId={campaignId} setScreen={setCurrentScreen} />
      )}
    </>
  );
};

export default ParentComponent;
