// src/components/TransactionButton.tsx
import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';        // your spinner component
import SuccessIcon from './SuccessIcon'; // your success icon component

type TransactionButtonProps = {
  /**
   * The async function that executes the blockchain transaction.
   * If `showAmountField` is true, we pass `amount` to onTransaction.
   * Otherwise, we call onTransaction() with no argument (amount is undefined).
   */
  onTransaction: (amount?: number) => Promise<void>;

  /** Label for the button (e.g. "Replenish TON", "Add Funds", etc.) */
  buttonLabel?: string;

  /**
   * Whether we show a numeric input box for the user to specify an amount.
   * If false, the user sees no input, and we call onTransaction() with no param.
   */
  showAmountField?: boolean;

  /**
   * If `showAmountField` is true, you can optionally set a default numeric amount.
   */
  defaultAmount?: number;

  /**
   * How many seconds to show the success icon before hiding it automatically.
   * If omitted or 0, the icon stays until the user changes something or unmount.
   */
  autoHideSuccessSeconds?: number;

  /**
   * Allows you to disable the button externally.
   * Merged with `isLoading` internally.
   */
  disabled?: boolean;

  /**
   * Called if the transaction finishes successfully (no exceptions).
   * You can use this to set local "txSuccess" states or navigate away.
   */
  onSuccess?: () => void;

  /**
   * Called if the transaction throws an error.
   * You can use this to set a local "errorMessage" or "txFailed" state.
   */
  onError?: (err: any) => void;
};

const TransactionButton: React.FC<TransactionButtonProps> = ({
  onTransaction,
  buttonLabel = 'Send',
  showAmountField = false,
  defaultAmount = 0,
  autoHideSuccessSeconds = 3,
  disabled = false,
  onSuccess,
  onError,
}) => {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Reset success if the user changes the amount
  useEffect(() => {
    if (isSuccess) setIsSuccess(false);
  }, [amount, isSuccess]);

  const handleClick = async () => {
    // Start the transaction
    setIsLoading(true);
    setIsSuccess(false);
    setError('');

    try {
      // If we need an amount, pass it to onTransaction. Otherwise just call onTransaction().
      if (showAmountField) {
        await onTransaction(amount);
      } else {
        await onTransaction();
      }

      // If no errors => success
      setIsSuccess(true);
      onSuccess?.(); // call the prop callback if provided

      // If autoHideSuccessSeconds > 0, hide the success icon after that many seconds
      if (autoHideSuccessSeconds > 0) {
        setTimeout(() => {
          setIsSuccess(false);
        }, autoHideSuccessSeconds * 1000);
      }
    } catch (err: any) {
      const message = err.message || 'Transaction failed';
      setError(message);
      onError?.(err); // pass the error to the callback if provided
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* If showAmountField is true, let the user input an amount */}
      {showAmountField && (
        <input
          type="number"
          min="0"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          style={{ width: '100px', marginRight: '0.5rem' }}
        />
      )}

      <button onClick={handleClick} disabled={isLoading || disabled}>
        {isLoading ? 'Processing...' : buttonLabel}
      </button>

      {isLoading && <Spinner />}
      {!isLoading && isSuccess && <SuccessIcon />}
      {!isLoading && error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default TransactionButton;
