import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from 'react-hot-toast';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { LoanProvider } from "./context/LoanContext";
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
        <LoanProvider>
        <TransactionsProvider>
          <App />
          <Toaster position="top-center" />
        </TransactionsProvider>
        </LoanProvider>
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);
