// TransactionButton.tsx
import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';       // your spinner
import SuccessIcon from './SuccessIcon'; // your success icon

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
};

const TransactionButton: React.FC<TransactionButtonProps> = ({
  onTransaction,
  buttonLabel = 'Send',
  showAmountField = false,
  defaultAmount = 0,
  autoHideSuccessSeconds = 3,
}) => {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Reset success when user changes the input
  useEffect(() => {
    if (isSuccess) setIsSuccess(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  const handleClick = async () => {
    setIsLoading(true);
    setIsSuccess(false);
    setError('');

    try {
      // If we need an amount, pass it. Otherwise call with no argument.
      if (showAmountField) {
        await onTransaction(amount);
      } else {
        await onTransaction();
      }

      setIsSuccess(true);

      // Auto-hide success if autoHideSuccessSeconds > 0
      if (autoHideSuccessSeconds > 0) {
        setTimeout(() => {
          setIsSuccess(false);
        }, autoHideSuccessSeconds * 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
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

      <button onClick={handleClick} disabled={isLoading}>
        {buttonLabel}
      </button>

      {isLoading && <Spinner />}
      {!isLoading && isSuccess && <SuccessIcon />}
      {!isLoading && error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default TransactionButton;
