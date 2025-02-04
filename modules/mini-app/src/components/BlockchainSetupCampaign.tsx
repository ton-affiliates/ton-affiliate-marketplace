import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';

// Hooks
import { useTonConnectFetchContext } from './TonConnectProvider';
import { useCampaignContractAdvertiserAndId } from '../hooks/useCampaignContractAdvertiserAndId';
import { useTonWalletConnect } from '../hooks/useTonConnect';

// Transaction logic
import { advertiserSetCampaignDetails } from '../blockchain/advertiserSetCampaignDetails';

// Ton utilities
import { Dictionary } from '@ton/core';

// Our user-events config
import {
  eventsConfig,
  getOpCodeByEventName,
} from '@common/UserEventsConfig';

// A reusable button for Ton transactions
import TransactionButton from './TransactionButton';

function BlockchainSetupCampaign() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  // ----------------------------------------------------------------
  // Local form states
  // ----------------------------------------------------------------
  // We'll store the user-entered cost strings per eventName
  // in two sub-objects: regularUsers and premiumUsers.
  const [commissionValues, setCommissionValues] = useState<{
    regularUsers: Record<string, string>;
    premiumUsers: Record<string, string>;
  }>({
    regularUsers: {},
    premiumUsers: {},
  });

  const [isPublicCampaign, setIsPublicCampaign] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<bigint>(0n);
  const [expirationDateEnabled, setExpirationDateEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');

  // Local UI states
  const [txSuccess, setTxSuccess] = useState(false);
  const [txFailed, setTxFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // TonConnect/wallet
  const { connectedStatus, userAccount } = useTonConnectFetchContext();
  const { sender } = useTonWalletConnect();

  // The advertiser’s address
  const advertiserAddress = userAccount?.address || '';
  const numericCampaignId = campaignId ? BigInt(campaignId) : undefined;

  // Load the campaign contract
  const { campaignContract, isLoading, error } =
    useCampaignContractAdvertiserAndId(
      advertiserAddress,
      numericCampaignId
    );

  // Navigation after success
  function navigateToCampaignPage() {
    if (!campaignId) {
      console.warn('No campaignId in URL, cannot navigate to /campaign/:id');
      return;
    }
    navigate(`/campaign/${campaignId}`);
  }

  /**
   * Build the on-chain dictionaries from the user’s typed costs,
   * always storing the cost string if `opCode` is valid.
   * No local validation here — let advertiserSetCampaignDetails handle it.
   */
  function buildCommissionDictionary(
    costRecord: Record<string, string>
  ): Dictionary<bigint, string> {
    const dict = Dictionary.empty<bigint, string>();
    for (const [eventName, costStr] of Object.entries(costRecord)) {
      const opCode = getOpCodeByEventName(eventName);
      if (opCode !== undefined) {
        dict.set(opCode, costStr);
      }
    }
    return dict;
  }

  return (
    <motion.div
      className="screen-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="card">
        <p>
          <strong>Campaign ID:</strong>{' '}
          {campaignId || 'No campaign ID provided'}
        </p>

        {isLoading && <p>Loading Campaign Contract...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}

        {/* Public/Private radio buttons */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <label>Campaign Type:</label>
          <label>
            <input
              type="radio"
              value="public"
              checked={isPublicCampaign}
              onChange={() => setIsPublicCampaign(true)}
            />
            Public
          </label>
          <label>
            <input
              type="radio"
              value="private"
              checked={!isPublicCampaign}
              onChange={() => setIsPublicCampaign(false)}
            />
            Private
          </label>
        </div>

        {/* Payment method => 0n or 1n */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <label>Payment Method:</label>
          <label>
            <input
              type="radio"
              value="0"
              checked={paymentMethod === 0n}
              onChange={() => setPaymentMethod(0n)}
            />
            TON
          </label>
          <label>
            <input
              type="radio"
              value="1"
              checked={paymentMethod === 1n}
              onChange={() => setPaymentMethod(1n)}
            />
            USDT
          </label>
        </div>

        {/* List all events in 2 columns: Regular vs. Premium */}
        <div className="card container-column" style={{ marginTop: '1rem' }}>
          <h3>Commissionable Events</h3>
          <p style={{ fontSize: '0.9rem' }}>
            Specify how much to pay for each event (in TON, e.g. "0.1").
            Leave blank or 0 to pay nothing. 
          </p>

          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '6px' }}>
                  Event Name
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px' }}>
                  Regular Users
                </th>
                <th style={{ border: '1px solid #ccc', padding: '6px' }}>
                  Premium Users
                </th>
              </tr>
            </thead>
            <tbody>
              {eventsConfig.events.map((evt) => {
                const regVal =
                  commissionValues.regularUsers[evt.eventName] || '';
                const premVal =
                  commissionValues.premiumUsers[evt.eventName] || '';

                return (
                  <tr key={evt.eventName}>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                      <strong>{evt.eventName}</strong>
                      <br />
                      {evt.description && (
                        <small style={{ color: '#666' }}>
                          {evt.description}
                        </small>
                      )}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={{ width: '5rem' }}
                        value={regVal}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setCommissionValues((prev) => ({
                            ...prev,
                            regularUsers: {
                              ...prev.regularUsers,
                              [evt.eventName]: newVal,
                            },
                          }));
                        }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={{ width: '5rem' }}
                        value={premVal}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setCommissionValues((prev) => ({
                            ...prev,
                            premiumUsers: {
                              ...prev.premiumUsers,
                              [evt.eventName]: newVal,
                            },
                          }));
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expiration date => sets a "campaignValidForNumDays" or null */}
        <ExpirationDateSelector
          expirationDateEnabled={expirationDateEnabled}
          setExpirationDateEnabled={setExpirationDateEnabled}
          expirationDate={expirationDate}
          setExpirationDate={setExpirationDate}
        />

        {/* If TX fails, show error */}
        {txFailed && errorMessage && (
          <p style={{ color: 'red', marginTop: '1rem' }}>
            Error: {errorMessage}
          </p>
        )}

        {/* If TX success, show success note */}
        {txSuccess && (
          <p style={{ color: 'green', marginTop: '1rem' }}>
            Campaign updated successfully! Navigating to campaign page...
          </p>
        )}

        {/**
         * The TransactionButton:
         * - "disabled" if the contract is not loaded
         * - onTransaction calls the same logic we had before in handleSubmit
         * - onSuccess sets txSuccess, then navigates
         * - onError sets txFailed and errorMessage
         */}
        <TransactionButton
          buttonLabel="Finalize & View Campaign"
          disabled={isLoading || !campaignContract}
          onTransaction={async () => {
            if (!connectedStatus || !advertiserAddress) {
              throw new Error(
                'No wallet connected. Please connect your wallet first.'
              );
            }
            if (!campaignContract) {
              throw new Error(error || 'Campaign contract not loaded yet.');
            }
            if (!sender) {
              throw new Error('Sender is not set. Could not send transaction.');
            }

            // 1) Build the dictionaries from local state
            const regularDict = buildCommissionDictionary(
              commissionValues.regularUsers
            );
            const premiumDict = buildCommissionDictionary(
              commissionValues.premiumUsers
            );

            // 2) Execute the blockchain logic
            await advertiserSetCampaignDetails(
              campaignContract,
              sender,
              advertiserAddress,
              {
                regularUsers: regularDict,
                premiumUsers: premiumDict,
              },
              isPublicCampaign,
              paymentMethod,
              expirationDateEnabled,
              expirationDate
            );
          }}
          onSuccess={() => {
            setTxSuccess(true);
            // Navigate after short delay
            setTimeout(navigateToCampaignPage, 500);
          }}
          onError={(err) => {
            setTxFailed(true);
            setErrorMessage(err.message || 'Transaction failed or canceled');
          }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Sub-component for selecting an expiration date or disabling it.
 */
function ExpirationDateSelector({
  expirationDateEnabled,
  setExpirationDateEnabled,
  expirationDate,
  setExpirationDate,
}: {
  expirationDateEnabled: boolean;
  setExpirationDateEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  expirationDate: string;
  setExpirationDate: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <div className="card container-column" style={{ marginTop: '1rem' }}>
      <label>Campaign Expiration Date:</label>
      <label>
        <input
          type="checkbox"
          checked={expirationDateEnabled}
          onChange={(e) => setExpirationDateEnabled(e.target.checked)}
        />
        <span style={{ marginLeft: '0.5rem' }}>Enable expiration date</span>
      </label>
      {expirationDateEnabled && (
        <input
          type="date"
          value={expirationDate}
          onChange={(e) => setExpirationDate(e.target.value)}
          style={{ marginTop: '0.5rem' }}
        />
      )}
      <p style={{ fontSize: '0.85em', marginTop: '0.5em' }}>
        We compute days from now until the chosen date. If it’s 0 or negative,
        we use “no expiration”.
      </p>
    </div>
  );
}

export default BlockchainSetupCampaign;
