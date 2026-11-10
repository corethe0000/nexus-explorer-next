import { useState } from 'react';
import Link from 'next/link';
import { BiSend } from 'react-icons/bi';
import { styles } from '.';
import {
  clearWalletError,
  sendWithWallet,
  useNexusWallet,
} from 'hooks/useNexusWallet/useNexusWallet';

const amountPattern = /^\d+([.,]\d+)?$/;

/** Pay into this account with the connected Nexus Wallet; the wallet window shows it again and asks for the PIN */
export default function WalletSend({ address, token, ticker }) {
  const { info, busy, error } = useNexusWallet();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [txid, setTxid] = useState(null);
  if (!info || !address) return null;

  const value = amount.trim().replace(',', '.');
  const valid = amountPattern.test(value) && Number(value) > 0;

  if (!open) {
    return (
      <button
        type="button"
        className={styles.watchButton}
        onClick={() => {
          clearWalletError();
          setTxid(null);
          setOpen(true);
        }}>
        <BiSend aria-hidden="true" />
        <span>Send with wallet</span>
      </button>
    );
  }

  return (
    <form
      className={styles.walletSend}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        const r = await sendWithWallet({
          to: address,
          amount: value,
          token: token && token !== '0' ? token : 'NXS',
        });
        if (r?.txid) {
          setTxid(r.txid);
          setAmount('');
        }
      }}>
      <label>
        <span>Amount</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          autoFocus
          disabled={busy}
        />
        <span>{ticker || 'NXS'}</span>
      </label>
      <button type="submit" className={styles.watchButton} disabled={busy || !valid}>
        {busy ? 'Waiting for the wallet...' : 'Send'}
      </button>
      <button type="button" className={styles.watchButton} disabled={busy} onClick={() => setOpen(false)}>
        Close
      </button>
      {txid && (
        <p className={styles.walletNote}>
          Sent:{' '}
          <Link href={`/scan/${txid}`}>
            <a>{txid.slice(0, 16)}...</a>
          </Link>{' '}
          (shown after the next block)
        </p>
      )}
      {error && <p className={styles.walletError}>{error}</p>}
    </form>
  );
}
