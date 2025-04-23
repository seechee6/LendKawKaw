import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  Keypair, 
  SystemProgram, 
  Transaction, 
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import BN from 'bn.js';
import idl from '../idl/idl.json';

// Use program ID from environment variable
const programID = new PublicKey(import.meta.env.VITE_PROGRAM_ID || "DAyqZYocAeQd8ApqkoyYQuLG8dcYv3JDwehxbaxmwZ1n");

console.log("Using Solana Program ID:", programID.toString());

// Helper function to get Anchor Provider
const getProvider = (connection, wallet) => {
  if (!wallet.publicKey) return null;
  
  const provider = new AnchorProvider(
    connection,
    wallet,
    { preflightCommitment: 'confirmed' }
  );
  
  return provider;
};

// Helper function to get Program instance
const getProgram = (provider) => {
  if (!provider) return null;
  
  return new Program(idl, programID, provider);
};

/**
 * Convert string to Buffer compatible with browser environment
 * @param {string} str - String to convert to buffer
 * @returns {Uint8Array} - Buffer-like object
 */
const strToBuffer = (str) => {
  return new TextEncoder().encode(str);
};

// Generate a consistent seed for PDA generation
const PROGRAM_DATA_SEED = "program-data";

/**
 * Create a new loan on the Solana blockchain
 * @param {object} connection - Solana connection object
 * @param {object} wallet - Solana wallet object
 * @param {object} loanData - Loan data to store
 * @returns {Promise<object>} - Transaction results
 */
export const createLoanOnChain = async (connection, wallet, loanData) => {
  try {
    console.log("Creating loan with data:", JSON.stringify(loanData, null, 2));
    
    const provider = getProvider(connection, wallet);
    if (!provider) throw new Error("Wallet not connected");
    
    const program = getProgram(provider);
    if (!program) throw new Error("Program not found");
    
    console.log("Program ID in use:", program.programId.toString());
    
    // First, check wallet balance
    const lamports = await connection.getBalance(wallet.publicKey);
    console.log("Current wallet balance:", lamports / LAMPORTS_PER_SOL, "SOL");
    
    if (lamports < LAMPORTS_PER_SOL * 0.1) { // Require at least 0.1 SOL for the entire transaction
      throw new Error("Insufficient balance to create loan account");
    }
    
    // Make sure program data is initialized and get the correct pubkey
    const initResult = await initializeProgramDataIfNeeded(connection, wallet);
    const programDataPubkey = initResult.programDataPubkey;
    
    console.log("Using program data account:", programDataPubkey.toString());

    // Generate a new Keypair for the loan account
    const loanKeypair = Keypair.generate();
    console.log("Generated loan account key:", loanKeypair.publicKey.toString());
    
    // Convert loan values to proper format
    const loanAmount = new BN(Math.floor(loanData.loanAmount * LAMPORTS_PER_SOL));
    const interestRateBasisPoints = loanData.interestRate * 100; // Convert percentage to basis points
    const durationSeconds = new BN(Math.floor(loanData.repaymentPeriod * 30 * 24 * 60 * 60)); // Months to seconds
    const description = loanData.purpose || "Loan Application";
    
    console.log("Converted values:", {
      loanAmount: loanAmount.toString(),
      interestRateBasisPoints,
      durationSeconds: durationSeconds.toString(),
      description
    });
    
    try {
      // Create the loan on-chain
      const tx = await program.methods
        .createLoan(
          loanAmount,
          interestRateBasisPoints,
          durationSeconds,
          description
        )
        .accounts({
          programData: programDataPubkey,
          loan: loanKeypair.publicKey,
          borrower: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([loanKeypair])
        .rpc({
          commitment: 'confirmed',
          skipPreflight: false
        });
      
      console.log("Loan created on-chain with signature:", tx);
      console.log("Loan public key:", loanKeypair.publicKey.toString());
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature: tx,
        lastValidBlockHeight: await connection.getBlockHeight(),
        blockhash: (await connection.getLatestBlockhash()).blockhash
      }, 'confirmed');
      
      console.log("Loan creation confirmation:", confirmation);
      
      // Return both transaction signature and loan public key
      return {
        signature: tx,
        loanPublicKey: loanKeypair.publicKey.toString()
      };
    } catch (callError) {
      console.error("Transaction failed:", callError);
      
      if (callError.logs) {
        console.error("Transaction logs:", callError.logs);
      }
      
      throw callError;
    }
  } catch (error) {
    console.error("Error creating loan on-chain:", error);
    throw error;
  }
};

/**
 * Fetch loan details from Solana blockchain
 * @param {object} connection - Solana connection object 
 * @param {string} loanPublicKey - Public key of the loan account
 * @returns {Promise<object>} - Loan details
 */
export const fetchLoanFromChain = async (connection, loanPublicKey) => {
  try {
    // Create provider without wallet (read-only)
    const provider = new AnchorProvider(
      connection, 
      {
        publicKey: PublicKey.default,
        signTransaction: () => Promise.reject(new Error("Read-only")),
        signAllTransactions: () => Promise.reject(new Error("Read-only")),
      },
      { preflightCommitment: 'confirmed' }
    );
    
    const program = getProgram(provider);
    if (!program) throw new Error("Program not found");
    
    // Fetch loan account data
    const loanAccount = await program.account.loan.fetch(new PublicKey(loanPublicKey));
    
    // Format the loan data
    return {
      id: loanAccount.id.toString(),
      borrower: loanAccount.borrower.toString(),
      lender: loanAccount.lender.toString(),
      amount: (loanAccount.amount.toNumber() / LAMPORTS_PER_SOL).toString(),
      interestRate: (loanAccount.interestRate / 100).toString(), // Convert basis points to percentage
      duration: (loanAccount.duration.toNumber() / (30 * 24 * 60 * 60)).toString(), // Convert seconds to months
      description: loanAccount.description,
      startDate: loanAccount.startDate.toNumber() > 0 ? new Date(loanAccount.startDate.toNumber() * 1000).toLocaleDateString() : 'Not started',
      totalRepaid: (loanAccount.totalRepaid.toNumber() / LAMPORTS_PER_SOL).toString(),
      isActive: loanAccount.isActive,
      isCompleted: loanAccount.isCompleted
    };
  } catch (error) {
    console.error("Error fetching loan from chain:", error);
    throw error;
  }
};

/**
 * Fetch all available loan applications from the blockchain
 * @param {object} connection - Solana connection object
 * @returns {Promise<Array>} - Array of loan applications
 */
export const fetchAvailableLoansFromChain = async (connection) => {
  try {
    // Create provider without wallet (read-only)
    const provider = new AnchorProvider(
      connection, 
      {
        publicKey: PublicKey.default,
        signTransaction: () => Promise.reject(new Error("Read-only")),
        signAllTransactions: () => Promise.reject(new Error("Read-only")),
      },
      { preflightCommitment: 'confirmed' }
    );
    
    const program = getProgram(provider);
    if (!program) throw new Error("Program not found");
    
    // Fetch all loan accounts
    const allLoanAccounts = await program.account.loan.all();
    
    // Filter for available loans (not active and not completed)
    const availableLoans = allLoanAccounts
      .filter(account => !account.account.isActive && !account.account.isCompleted)
      .map(account => {
        const data = account.account;
        return {
          id: data.id.toString(),
          publicKey: account.publicKey.toString(),
          borrower: data.borrower.toString(),
          amount: (data.amount.toNumber() / LAMPORTS_PER_SOL).toString(),
          interestRate: (data.interestRate / 100).toString(), // Convert basis points to percentage
          duration: (data.duration.toNumber() / (30 * 24 * 60 * 60)).toString(), // Convert seconds to months
          description: data.description,
          title: data.description.split(' ').slice(0, 3).join(' ') // Generate a title from the first few words
        };
      });
    
    return availableLoans;
  } catch (error) {
    console.error("Error fetching available loans from chain:", error);
    throw error;
  }
};

/**
 * Get the Program Data PDA (Program Derived Address)
 * @returns {Promise<{pda: PublicKey, bump: number}>} - The program data PDA and bump
 */
export const getProgramDataPDA = async () => {
  try {
    // Use the constant seed defined earlier
    const [pda, bump] = await PublicKey.findProgramAddress(
      [Buffer.from(PROGRAM_DATA_SEED)],  // This matches the constant we defined
      programID
    );
    
    console.log("Generated Program Data PDA:", pda.toString(), "with bump:", bump);
    return { pda, bump };
  } catch (error) {
    console.error("Error generating PDA:", error);
    throw error;
  }
};

/**
 * Fund a loan on the Solana blockchain
 * @param {object} connection - Solana connection object
 * @param {object} wallet - Solana wallet object
 * @param {string} loanPublicKey - Public key of the loan account
 * @param {string} borrowerPublicKey - Public key of the borrower
 * @param {number} amount - Loan amount in SOL
 * @returns {Promise<string>} - Transaction signature
 */
export const fundLoanOnChain = async (connection, wallet, loanPublicKey, borrowerPublicKey, amount) => {
  try {
    const provider = getProvider(connection, wallet);
    if (!provider) throw new Error("Wallet not connected");
    
    const program = getProgram(provider);
    if (!program) throw new Error("Program not found");
    
    // Find or create token accounts
    // Note: In a real app, you would need to handle SPL token accounts properly
    // This is a simplified version using system transfers
    
    const amountLamports = amount * LAMPORTS_PER_SOL;
    
    const tx = await program.methods
      .fundLoan(new BN(amountLamports))
      .accounts({
        loan: new PublicKey(loanPublicKey),
        lender: wallet.publicKey,
        lenderTokenAccount: wallet.publicKey,
        borrowerTokenAccount: new PublicKey(borrowerPublicKey),
        tokenProgram: SystemProgram.programId, // In a real app, this would be TOKEN_PROGRAM_ID
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("Loan funded on-chain with signature:", tx);
    return tx;
  } catch (error) {
    console.error("Error funding loan on-chain:", error);
    throw error;
  }
};

/**
 * Initialize the program data if it hasn't been initialized yet
 * This uses the direct method to initialize the program data
 * @param {object} connection - Solana connection object
 * @param {object} wallet - Solana wallet object
 * @returns {Promise<string|null>} - Transaction signature or null if already initialized
 */
export const initializeProgramDataRaw = async (connection, wallet) => {
  try {
    const { pda: programDataPDA } = await getProgramDataPDA();
    
    // Check if program data already exists
    const accountInfo = await connection.getAccountInfo(programDataPDA);
    if (accountInfo) {
      console.log("Program data already exists");
      return null;
    }
    
    // Create a new keypair for the program data account since it needs to be a signer
    const programDataKeypair = Keypair.generate();
    console.log("Created program data keypair:", programDataKeypair.publicKey.toString());
    
    // If we're here, we need to create the program data
    console.log("Creating program data account directly");
    
    // To do this, we need to use a direct transaction
    const recentBlockhash = await connection.getLatestBlockhash();
    const transaction = new Transaction({ 
      recentBlockhash: recentBlockhash.blockhash,
      feePayer: wallet.publicKey
    });
    
    // Create a proper instruction data buffer
    // In Anchor, the first 8 bytes are the instruction discriminator for "initialize"
    const discriminator = new Uint8Array([
      175, 175, 109, 31, 13, 152, 155, 237
    ]);

    // Create the instruction - According to IDL, program_data must be a signer
    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: programDataKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: programID,
      data: discriminator
    });
    
    // Add instruction to create account with proper space
    const space = 200; // Adjust this based on the program data size requirements
    const rentExemptLamports = await connection.getMinimumBalanceForRentExemption(space);
    
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: programDataKeypair.publicKey,
      lamports: rentExemptLamports,
      space: space,
      programId: programID,
    });
    
    // Set up compute budget to allow for more complex operations
    const computeBudgetIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 200000
    });
    
    // Add prioritization fee to improve chances of transaction processing
    const priorityFeeIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1000
    });
    
    transaction.add(computeBudgetIx, priorityFeeIx, createAccountInstruction, instruction);
    
    // Sign and send the transaction with both the wallet and the program data keypair
    const signed = await wallet.signTransaction(transaction);
    
    // Manually sign with the program data keypair
    signed.partialSign(programDataKeypair);
    
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: true,
      preflightCommitment: 'processed'
    });
    
    console.log("Program data initialization requested:", signature);
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash: recentBlockhash.blockhash,
      lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
    }, 'confirmed');
    
    // Verify the account was created
    const verifyAccount = await connection.getAccountInfo(programDataKeypair.publicKey);
    if (!verifyAccount) {
      throw new Error("Failed to initialize program data - account wasn't created");
    }
    
    console.log("Program data initialized with signature:", signature);
    return {
      signature,
      programDataPubkey: programDataKeypair.publicKey
    };
  } catch (error) {
    console.error("Error initializing program data raw:", error);
    
    // Log specific error details if available
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
    
    throw error;
  }
};

/**
 * Initialize the program data if it hasn't been initialized yet
 * @param {object} connection - Solana connection object
 * @param {object} wallet - Solana wallet object
 * @returns {Promise<string|null>} - Transaction signature or null if already initialized
 */
export const initializeProgramDataIfNeeded = async (connection, wallet) => {
  try {
    const provider = getProvider(connection, wallet);
    if (!provider) throw new Error("Wallet not connected");
    
    const { pda: programDataPDA, bump } = await getProgramDataPDA();
    console.log("Checking if program data needs initialization:", programDataPDA.toString(), "with bump:", bump);
    
    // Check if program data already exists
    const programDataAccount = await connection.getAccountInfo(programDataPDA);
    console.log("Program data account info:", programDataAccount ? "Exists" : "Does not exist");
    
    if (programDataAccount) {
      console.log("Program data already initialized, size:", programDataAccount.data.length);
      return { initialized: false, programDataPubkey: programDataPDA }; // Already initialized
    }

    console.log("Initializing program data at:", programDataPDA.toString());
    
    // Check for sufficient balance
    const lamports = await connection.getBalance(wallet.publicKey);
    console.log("Current wallet balance:", lamports / LAMPORTS_PER_SOL, "SOL");
    
    if (lamports < LAMPORTS_PER_SOL * 0.05) { // Require at least 0.05 SOL
      throw new Error("Insufficient balance to create program data account");
    }
    
    // Try using the raw initialization method directly
    // This is more reliable than trying multiple approaches
    console.log("Initializing program data with raw transaction");
    const rawTxResult = await initializeProgramDataRaw(connection, wallet);
    if (rawTxResult) {
      console.log("Program initialization succeeded with signature:", rawTxResult.signature);
      
      // Double-check the account was created
      const verifiedAccount = await connection.getAccountInfo(rawTxResult.programDataPubkey);
      if (!verifiedAccount) {
        throw new Error("Program data initialization transaction completed, but account wasn't created");
      }
      
      return { initialized: true, programDataPubkey: rawTxResult.programDataPubkey };
    } else {
      throw new Error("Raw initialization returned null");
    }
  } catch (error) {
    console.error("Error initializing program data:", error);
    
    // Log specific error details if available
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
    
    throw error;
  }
};

/**
 * Get Program instance for external services
 * @param {object} connection - Solana connection
 * @param {object} wallet - Optional wallet for signing transactions
 * @returns {object|null} - Program instance or null
 */
export const getProgramInstance = (connection, wallet = null) => {
  let provider;
  
  if (wallet) {
    // Create provider with wallet for transaction signing
    provider = new AnchorProvider(
      connection,
      wallet,
      { preflightCommitment: 'confirmed' }
    );
  } else {
    // Create read-only provider without wallet
    provider = new AnchorProvider(
      connection, 
      {
        publicKey: PublicKey.default,
        signTransaction: () => Promise.reject(new Error("Read-only")),
        signAllTransactions: () => Promise.reject(new Error("Read-only")),
      },
      { preflightCommitment: 'confirmed' }
    );
  }
  
  return new Program(idl, programID, provider);
}; 