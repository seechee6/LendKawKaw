import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import BN from 'bn.js';
import { toast } from 'react-hot-toast';
import idl from '../idl/idl.json';

// Use program ID from environment variable
const programID = new PublicKey(import.meta.env.VITE_PROGRAM_ID || "DAyqZYocAeQd8ApqkoyYQuLG8dcYv3JDwehxbaxmwZ1n");

// Helper to get provider
export const getProvider = (connection, wallet) => {
  if (!wallet.connected) return null;
  
  return new AnchorProvider(
    connection,
    wallet,
    { preflightCommitment: 'confirmed' }
  );
};

// Helper to get program
export const getProgram = (connection, wallet) => {
  const provider = getProvider(connection, wallet);
  if (!provider) return null;
  
  return new Program(idl, programID, provider);
};

// Find PDA for user account
export const findUserPDA = async (publicKey) => {
  if (!publicKey) return null;
  
  const [userPDA] = await web3.PublicKey.findProgramAddress(
    [Buffer.from('user'), publicKey.toBuffer()],
    programID
  );
  
  return userPDA;
};

// Check if user is initialized
export const checkUserInitialized = async (connection, wallet) => {
  if (!wallet.connected) return { isInitialized: false, userAccount: null };
  
  try {
    const program = getProgram(connection, wallet);
    const userPDA = await findUserPDA(wallet.publicKey);
    
    try {
      const account = await program.account.user.fetch(userPDA);
      return { isInitialized: true, userAccount: account };
    } catch (error) {
      console.log('User not initialized yet');
      return { isInitialized: false, userAccount: null };
    }
  } catch (error) {
    console.error('Error checking user initialization:', error);
    return { isInitialized: false, userAccount: null };
  }
};

// Initialize user account
export const initializeUser = async (connection, wallet) => {
  if (!wallet.connected) {
    toast.error('Please connect your wallet first');
    return { success: false, message: 'Wallet not connected' };
  }

  const loadingToast = toast.loading('Initializing user account...');

  try {
    const program = getProgram(connection, wallet);
    const userPDA = await findUserPDA(wallet.publicKey);
    
    const tx = await program.methods
      .initialize()
      .accounts({
        user: userPDA,
        authority: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
    
    toast.dismiss(loadingToast);
    toast.success('User account successfully initialized!');
    
    return {
      success: true,
      message: 'User account initialized successfully',
      signature: tx,
    };
  } catch (error) {
    toast.dismiss(loadingToast);
    console.error('Error initializing user:', error);
    
    toast.error(`Initialization failed: ${error.message || 'Unknown error'}`);
    return {
      success: false,
      message: `Error: ${error.message || 'Unknown error'}`,
      error
    };
  }
};

// Create a loan
export const createLoan = async (connection, wallet, loanAmount, interestRate, duration, description = '') => {
  if (!wallet.connected) {
    toast.error('Please connect your wallet first');
    return { success: false, message: 'Wallet not connected' };
  }

  // Check user initialization
  const { isInitialized } = await checkUserInitialized(connection, wallet);
  if (!isInitialized) {
    // Auto-initialize the user if needed
    const initResult = await initializeUser(connection, wallet);
    if (!initResult.success) {
      return { success: false, message: 'Failed to initialize user account' };
    }
  }

  const loadingToast = toast.loading('Creating loan...');

  try {
    const program = getProgram(connection, wallet);
    const userPDA = await findUserPDA(wallet.publicKey);
    
    // Fetch user to get loansTaken count
    const userAccount = await program.account.user.fetch(userPDA);
    const loanId = userAccount.loansTaken;
    
    // Find PDA for the loan account
    const [loanPDA] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from('loan'),
        wallet.publicKey.toBuffer(),
        new BN(loanId).toArrayLike(Buffer, 'le', 8)
      ],
      programID
    );
    
    // Convert loan values to proper format
    const amountLamports = new BN(loanAmount * LAMPORTS_PER_SOL);
    const interestRateBasisPoints = interestRate * 100; // Convert percentage to basis points
    const durationMonths = duration * 30 * 24 * 60 * 60; // Convert months to seconds
    
    const tx = await program.methods
      .createLoan(
        amountLamports,
        interestRateBasisPoints,
        new BN(durationMonths)
      )
      .accounts({
        user: userPDA,
        loan: loanPDA,
        borrower: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
    
    toast.dismiss(loadingToast);
    toast.success('Loan created successfully!');
    
    return {
      success: true,
      message: 'Loan created successfully',
      signature: tx,
      loanId: loanId.toString(),
      loanAddress: loanPDA.toString()
    };
  } catch (error) {
    toast.dismiss(loadingToast);
    console.error('Error creating loan:', error);
    
    toast.error(`Loan creation failed: ${error.message || 'Unknown error'}`);
    return {
      success: false,
      message: `Error: ${error.message || 'Unknown error'}`,
      error
    };
  }
};

// Fund a loan (as a lender)
export const fundLoan = async (connection, wallet, loanPublicKey) => {
  if (!wallet.connected) {
    toast.error('Please connect your wallet first');
    return { success: false, message: 'Wallet not connected' };
  }

  console.log('Starting fundLoan function with:', {
    wallet: wallet ? 'Connected' : 'Not connected',
    walletConnected: wallet.connected,
    walletPublicKey: wallet.publicKey?.toString(),
    loanPublicKey: loanPublicKey instanceof PublicKey 
      ? loanPublicKey.toString() 
      : typeof loanPublicKey === 'string' ? loanPublicKey : 'Invalid',
  });

  const loadingToast = toast.loading('Funding loan...');

  try {
    // Ensure loanPublicKey is a PublicKey instance
    const loanPubKey = loanPublicKey instanceof PublicKey
      ? loanPublicKey
      : new PublicKey(loanPublicKey);
    
    console.log('Getting program instance...');
    const program = getProgram(connection, wallet);
    
    if (!program) {
      throw new Error('Failed to get program instance');
    }
    
    console.log('Fetching loan account...');
    // Fetch the loan account to get borrower and amount
    const loanAccount = await program.account.loan.fetch(loanPubKey);
    console.log('Loan account fetched:', {
      borrower: loanAccount.borrower.toString(),
      amount: loanAccount.amount.toString(),
      isActive: loanAccount.isActive,
    });
    
    if (loanAccount.isActive) {
      throw new Error('This loan has already been funded');
    }
    
    const borrowerPubkey = loanAccount.borrower;
    const amount = loanAccount.amount;
    
    console.log('Building transaction...');
    console.log('Transaction accounts:', {
      lender: wallet.publicKey.toString(),
      borrower: borrowerPubkey.toString(),
      loan: loanPubKey.toString(),
    });
    
    const tx = await program.methods
      .fundLoan(amount)
      .accounts({
        lender: wallet.publicKey,
        borrower: borrowerPubkey,
        loan: loanPubKey,
        systemProgram: web3.SystemProgram.programId,
        clock: web3.SYSVAR_CLOCK_PUBKEY
      })
      .rpc();
    
    console.log('Transaction sent:', tx);
    
    toast.dismiss(loadingToast);
    toast.success('Loan funded successfully!');
    
    return {
      success: true,
      message: 'Loan funded successfully',
      signature: tx
    };
  } catch (error) {
    console.error('Error details:', error);
    
    let errorMessage = 'Unknown error';
    
    // Try to extract a more specific error message
    if (error.message) {
      errorMessage = error.message;
    } else if (error.logs) {
      // Logs often contain useful error information
      errorMessage = error.logs.join('\n');
    }
    
    toast.dismiss(loadingToast);
    console.error('Error funding loan:', error);
    
    toast.error(`Funding failed: ${errorMessage}`);
    return {
      success: false,
      message: `Error: ${errorMessage}`,
      error
    };
  }
};

// Repay a loan (monthly installment)
export const repayLoan = async (connection, wallet, loanPublicKey, repaymentAmount, isPlatformFee = false) => {
  if (!wallet.connected) {
    toast.error('Please connect your wallet first');
    return { success: false, message: 'Wallet not connected' };
  }

  const loadingToast = toast.loading('Processing repayment...');

  try {
    const program = getProgram(connection, wallet);
    const userPDA = await findUserPDA(wallet.publicKey);
    
    // Get loan details to find lender
    const loanAccount = await program.account.loan.fetch(new PublicKey(loanPublicKey));
    const lenderPubkey = loanAccount.lender;
    
    // Platform account - in a real app, this would be the platform's wallet
    const [platformPDA] = await web3.PublicKey.findProgramAddress(
      [Buffer.from('platform')],
      programID
    );
    
    // Convert amount to lamports
    const amountLamports = new BN(repaymentAmount * LAMPORTS_PER_SOL);
    
    const tx = await program.methods
      .repayLoan(amountLamports, isPlatformFee)
      .accounts({
        loan: new PublicKey(loanPublicKey),
        borrower: wallet.publicKey,
        lender: lenderPubkey,
        platformAccount: platformPDA,
        user: userPDA,
        systemProgram: web3.SystemProgram.programId,
        clock: web3.SYSVAR_CLOCK_PUBKEY
      })
      .rpc();
    
    toast.dismiss(loadingToast);
    toast.success('Loan repayment successful!');
    
    return {
      success: true,
      message: 'Loan repayment successful',
      signature: tx,
      destination: isPlatformFee ? 'Platform' : 'Lender'
    };
  } catch (error) {
    toast.dismiss(loadingToast);
    console.error('Error repaying loan:', error);
    
    toast.error(`Repayment failed: ${error.message || 'Unknown error'}`);
    return {
      success: false,
      message: `Error: ${error.message || 'Unknown error'}`,
      error
    };
  }
};

// Fetch all available loans
export const fetchAvailableLoans = async (connection) => {
  if (!connection) return [];
  
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
    
    const program = new Program(idl, programID, provider);
    
    // Fetch all loan accounts
    const allLoanAccounts = await program.account.loan.all();
    
    // Filter for available loans (not active and not completed)
    const loans = allLoanAccounts
      .filter(account => !account.account.isActive && !account.account.isCompleted)
      .map(account => {
        const data = account.account;
        return {
          id: data.id.toString(),
          publicKey: account.publicKey.toString(),
          borrower: data.borrower.toString(),
          amount: data.amount.toString() / LAMPORTS_PER_SOL,
          interestRate: data.interestRate / 100, // Convert basis points to percentage
          duration: data.duration.toString() / (30 * 24 * 60 * 60), // Convert seconds to months
          isActive: data.isActive,
          isCompleted: data.isCompleted,
          description: data.description || 'Loan Application'
        };
      });
    
    return loans;
  } catch (error) {
    console.error('Error fetching available loans:', error);
    toast.error('Failed to fetch available loans');
    return [];
  }
};

// Fetch active loans where the user is the borrower
export const fetchUserActiveLoans = async (connection, wallet) => {
  if (!wallet.connected) return [];
  
  try {
    const program = getProgram(connection, wallet);
    
    // Find all loans
    const allLoans = await program.account.loan.all();
    
    // Find loans where the user is the borrower
    const userLoans = allLoans.filter(loan => 
      loan.account.borrower.toString() === wallet.publicKey.toString()
    );
    
    // Format active loans
    const activeLoans = userLoans.map(loan => {
      const data = loan.account;
      
      // Calculate time since loan started
      const startTimestamp = parseInt(data.startDate) * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeDiff = currentTime - startTimestamp;
      const daysSinceStart = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      // Calculate loan details
      const principal = parseFloat(data.amount.toString()) / LAMPORTS_PER_SOL;
      const interestRatePercent = data.interestRate / 100; // Convert basis points to percentage
      const durationMonths = parseFloat(data.duration.toString()) / (30 * 24 * 60 * 60);
      
      // Calculate total interest for the loan period (simple interest)
      const totalInterest = principal * (interestRatePercent / 100) * (durationMonths / 12);
      
      // Total amount to repay
      const totalToRepay = principal + totalInterest;
      
      // Calculate monthly installment
      const monthlyPayment = totalToRepay / durationMonths;
      
      // Calculate progress
      const totalRepaid = parseFloat(data.totalRepaid.toString()) / LAMPORTS_PER_SOL;
      const percentageRepaid = (totalRepaid / totalToRepay) * 100;
      
      // Calculate remaining payments
      const totalPayments = Math.ceil(durationMonths);
      const paymentsMade = Math.floor(totalRepaid / monthlyPayment);
      const remainingPayments = Math.max(0, totalPayments - paymentsMade);
      
      return {
        id: data.id.toString(),
        publicKey: loan.publicKey.toString(),
        borrower: data.borrower.toString(),
        lender: data.lender.toString(),
        amount: principal,
        interestRate: interestRatePercent,
        monthlyPayment: monthlyPayment,
        duration: durationMonths,
        startDate: startTimestamp > 0 ? new Date(startTimestamp) : null,
        totalRepaid: totalRepaid,
        totalAmountDue: totalToRepay,
        percentComplete: Math.min(100, percentageRepaid.toFixed(1)),
        remainingPayments: remainingPayments,
        isActive: data.isActive,
        isCompleted: data.isCompleted,
        daysSinceStart: daysSinceStart,
        description: data.description || 'Loan Application'
      };
    });
    
    return activeLoans;
  } catch (error) {
    console.error('Error fetching user active loans:', error);
    toast.error('Failed to load your active loans');
    return [];
  }
};

// Calculate monthly installment for a loan
export const calculateMonthlyInstallment = (loan) => {
  const principal = parseFloat(loan.amount);
  const interestRate = parseFloat(loan.interestRate) / 100; // annual interest rate
  const durationMonths = parseFloat(loan.duration);
  
  // Calculate total interest for the loan period (simple interest)
  const totalInterest = principal * interestRate * (durationMonths / 12);
  
  // Total amount to repay
  const totalToRepay = principal + totalInterest;
  
  // Divide by duration to get monthly installment
  const monthlyPayment = totalToRepay / durationMonths;
  
  return {
    monthlyPayment: monthlyPayment.toFixed(4),
    totalToRepay: totalToRepay.toFixed(4),
    totalInterest: totalInterest.toFixed(4)
  };
}; 