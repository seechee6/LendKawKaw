import React from "react";
import { createRoot } from "react-dom/client";
import { Buffer } from 'buffer';

// Add minimal polyfills needed for Solana web3.js
window.Buffer = Buffer;

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import App from "./App";
import { TransactionsProvider } from "./context/TransactionContext";
import "./index.css";

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Set up Solana network connection
const network = WalletAdapterNetwork.Devnet; // Change to Mainnet when ready
const endpoint = clusterApiUrl(network);

// Set up wallet adapters
const wallets = [
  new PhantomWalletAdapter(),
];

const root = createRoot(document.getElementById("root"));
root.render(
  <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <TransactionsProvider>
          <App />
        </TransactionsProvider>
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);
