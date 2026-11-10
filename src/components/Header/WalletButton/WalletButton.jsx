import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BiWallet } from 'react-icons/bi';
import { useAppContext } from 'contexts/AppContext';
import {
  clearWalletError,
  connectWallet,
  disconnectWallet,
  useNexusWallet,
} from 'hooks/useNexusWallet/useNexusWallet';
import { userHref } from 'utils/search';
import { shortHash } from 'utils/format';
import styles from './WalletButton.module.scss';

/** Connect the Nexus Wallet extension, shown only when it is installed */
export default function WalletButton() {
  const { available, info, network, busy, error } = useNexusWallet();
  const { appContext } = useAppContext();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  //closes on a click outside or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!available) return null;

  if (!info) {
    return (
      <div className={styles.box}>
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          title={error || 'Connect your Nexus Wallet'}
          onClick={() => {
            clearWalletError();
            connectWallet();
          }}>
          <BiWallet aria-hidden="true" />
          <span>{busy ? 'Connecting...' : 'Connect wallet'}</span>
        </button>
        {error && (
          <span className={styles.error} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  //the wallet's core may be on another chain than the one shown here
  const shown = appContext.network.name.toLowerCase();
  const otherNetwork = network && network !== shown;

  return (
    <div className={styles.box} ref={box}>
      <button
        type="button"
        className={styles.button}
        data-connected="true"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}>
        <BiWallet aria-hidden="true" />
        <span>{info.username || shortHash(info.genesis)}</span>
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <p className={styles.who}>
            <strong>{info.username}</strong>
            <span>{shortHash(info.genesis)}</span>
          </p>
          {otherNetwork && (
            <p className={styles.warn}>
              The wallet is on {network}, this explorer shows {shown}.
            </p>
          )}
          <Link href={userHref(info)}>
            <a role="menuitem" onClick={() => setOpen(false)}>
              My profile and transactions
            </a>
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={async () => {
              await disconnectWallet();
              setOpen(false);
            }}>
            Disconnect
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  );
}
