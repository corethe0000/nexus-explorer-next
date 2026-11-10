import { useEffect, useSyncExternalStore } from 'react';

//window.nexus of the Nexus Wallet browser extension, shared by every component on the page
const rememberKey = 'nexusWalletConnected';
const initTimeoutMs = 2000;
const codeUserRejected = 4001;

let state = {
  //null = not checked yet, false = no extension
  available: null,
  //{ genesis, username, accounts } while connected
  info: null,
  //'mainnet' | 'testnet' | 'private' of the wallet's core
  network: null,
  busy: false,
  error: null,
};
const subscribers = new Set();
let started = false;

function set(patch) {
  state = { ...state, ...patch };
  subscribers.forEach((fn) => fn());
}

function provider() {
  return typeof window !== 'undefined' ? window.nexus : undefined;
}

function remember(on) {
  try {
    if (on) {
      localStorage.setItem(rememberKey, '1');
    } else {
      localStorage.removeItem(rememberKey);
    }
  } catch {
    //storage blocked, the page just forgets the connection
  }
}

function remembered() {
  try {
    return localStorage.getItem(rememberKey) === '1';
  } catch {
    return false;
  }
}

async function readNetwork(nexus) {
  try {
    const n = await nexus.request({ method: 'nexus_getNetwork' });
    set({ network: n.network });
  } catch {
    set({ network: null });
  }
}

//finds the extension once, reconnects without a window when this site was connected before
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const ready = () => {
    const nexus = provider();
    if (!nexus) {
      set({ available: false });
      return;
    }
    set({ available: true });
    nexus.on('accountsChanged', (info) => set({ info: info || null }));
    nexus.on('disconnect', () => {
      remember(false);
      set({ info: null });
    });
    readNetwork(nexus);
    if (remembered()) {
      //getAccounts never opens a window, it fails when the site is not connected or the wallet is locked
      nexus
        .request({ method: 'nexus_getAccounts' })
        .then(() => nexus.request({ method: 'nexus_connect' }))
        .then((info) => set({ info }))
        .catch(() => null);
    }
  };
  if (provider()) {
    ready();
    return;
  }
  const timer = setTimeout(ready, initTimeoutMs);
  window.addEventListener(
    'nexus#initialized',
    () => {
      clearTimeout(timer);
      ready();
    },
    { once: true }
  );
}

async function run(fn) {
  if (state.busy) return null;
  set({ busy: true, error: null });
  try {
    return await fn(provider());
  } catch (e) {
    set({ error: e?.code === codeUserRejected ? null : e?.message || String(e) });
    return null;
  } finally {
    set({ busy: false });
  }
}

export const connectWallet = () =>
  run(async (nexus) => {
    const info = await nexus.request({ method: 'nexus_connect' });
    remember(true);
    set({ info });
    readNetwork(nexus);
    return info;
  });

export const disconnectWallet = () =>
  run(async (nexus) => {
    await nexus.request({ method: 'nexus_disconnect' });
    remember(false);
    set({ info: null });
  });

//opens the wallet's send window, the user picks the account and confirms there
export const sendWithWallet = (params) =>
  run((nexus) => nexus.request({ method: 'nexus_send', params }));

export const clearWalletError = () => set({ error: null });

export function useNexusWallet() {
  useEffect(start, []);
  return useSyncExternalStore(
    (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    () => state,
    () => state
  );
}
