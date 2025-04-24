// createPlatformWallet.js
// This script generates a platform wallet and its associated USDC token account
// Run with: node createPlatformWallet.js

import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';

// USDC Token mint on devnet
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

async function main() {
  try {
    // Create a connection to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Generate a new keypair for the platform wallet
    const platformWallet = Keypair.generate();
    
    console.log('Platform Wallet Public Key:', platformWallet.publicKey.toString());
    
    // Get the associated token account address for USDC
    const platformTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      platformWallet.publicKey
    );
    
    console.log('Platform Token Account for USDC:', platformTokenAccount.toString());
    
    // Save the keypair to a file for safekeeping
    const keyData = {
      publicKey: platformWallet.publicKey.toString(),
      privateKey: Array.from(platformWallet.secretKey),
      tokenAccount: platformTokenAccount.toString()
    };
    
    fs.writeFileSync('platform-wallet.json', JSON.stringify(keyData, null, 2));
    console.log('Wallet keypair saved to platform-wallet.json');
    
    console.log('\nTo use this in your app:');
    console.log('1. Add to your .env file:');
    console.log(`VITE_PLATFORM_TOKEN_ACCOUNT=${platformTokenAccount.toString()}`);
    console.log('\n2. Initialize the wallet with SOL and create the token account:');
    console.log('- Transfer some SOL to the platform wallet address');
    console.log('- Run a script to create the token account (uses 0.00204 SOL)');
    
  } catch (error) {
    console.error('Error creating platform wallet:', error);
  }
}

main();