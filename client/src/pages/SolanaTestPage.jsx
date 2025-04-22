import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import idl from '../idl/idl.json';
import * as anchor from '@project-serum/anchor';

// Modern UI theme colors
const colors = {
  primary: {
    light: '#4f46e5', // indigo-600
    DEFAULT: '#4338ca', // indigo-700
    dark: '#3730a3', // indigo-800
  },
  secondary: {
    light: '#7c3aed', // violet-600
    DEFAULT: '#6d28d9', // violet-700
    dark: '#5b21b6', // violet-800
  },
  success: {
    light: '#10b981', // emerald-500
    DEFAULT: '#059669', // emerald-600
    dark: '#047857', // emerald-700
  },
  warning: {
    light: '#f59e0b', // amber-500
    DEFAULT: '#d97706', // amber-600
    dark: '#b45309', // amber-700
  },
  error: {
    light: '#ef4444', // red-500
    DEFAULT: '#dc2626', // red-600
    dark: '#b91c1c', // red-700
  },
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  }
};

const programID = new PublicKey('9euLSxzKoMvpQb5N7GjjvLrb6XurpuiJsk7jZ4mHUvhb');

const SolanaTestPage = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [isUserInitialized, setIsUserInitialized] = useState(false);
  const [loanAmount, setLoanAmount] = useState(0.1);
  const [interestRate, setInterestRate] = useState(10);
  const [duration, setDuration] = useState(6);
  const [activeLoan, setActiveLoan] = useState(null);
  const [repaymentAmount, setRepaymentAmount] = useState(0.01);
  const [isPlatformFee, setIsPlatformFee] = useState(false);
  const [availableLoans, setAvailableLoans] = useState([]);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  const [activeUserLoans, setActiveUserLoans] = useState([]);
  const [isLoadingUserLoans, setIsLoadingUserLoans] = useState(false);
  const [activeTab, setActiveTab] = useState('active-loans');
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Get Anchor provider
  const getProvider = () => {
    if (!wallet.connected) return null;
    
    return new AnchorProvider(
      connection,
      wallet,
      { preflightCommitment: 'confirmed' }
    );
  };

  // Get program instance
  const getProgram = () => {
    const provider = getProvider();
    if (!provider) return null;
    
    return new Program(idl, programID, provider);
  };

  // Find PDA for user account
  const findUserPDA = async () => {
    if (!wallet.publicKey) return null;
    
    const [userPDA] = await web3.PublicKey.findProgramAddress(
      [Buffer.from('user'), wallet.publicKey.toBuffer()],
      programID
    );
    
    return userPDA;
  };

  // Check if user is initialized
  const checkUserInitialized = async () => {
    if (!wallet.connected) return;
    
    try {
      setIsLoading(true);
      const program = getProgram();
      const userPDA = await findUserPDA();
      
      try {
        const account = await program.account.user.fetch(userPDA);
        setUserAccount(account);
        setIsUserInitialized(true);
      } catch (error) {
        console.log('User not initialized yet');
        setIsUserInitialized(false);
      }
    } catch (error) {
      console.error('Error checking user initialization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize user account
  const handleInitializeUser = async () => {
    if (!wallet.connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Initializing user account...');

    try {
      const program = getProgram();
      const userPDA = await findUserPDA();
      
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
      
      setResult({
        success: true,
        message: 'User account initialized successfully',
        signature: tx,
      });
      
      // Refresh user data
      await checkUserInitialized();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error initializing user:', error);
      
      toast.error(`Initialization failed: ${error.message || 'Unknown error'}`);
      setResult({
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`,
        error
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a loan
  const handleCreateLoan = async () => {
    if (!wallet.connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isUserInitialized) {
      toast.error('Please initialize your user account first');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Creating loan...');

    try {
      const program = getProgram();
      const userPDA = await findUserPDA();
      
      // Calculate the loan ID from current loans taken
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
      
      setResult({
        success: true,
        message: 'Loan created successfully',
        signature: tx,
        loanId: loanId.toString(),
        loanAddress: loanPDA.toString()
      });
      
      // Refresh user data
      await checkUserInitialized();
      
      // Set the active loan for further operations
      setActiveLoan({
        publicKey: loanPDA,
        id: loanId
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error creating loan:', error);
      
      toast.error(`Loan creation failed: ${error.message || 'Unknown error'}`);
      setResult({
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`,
        error
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fund a loan (as a lender)
  const handleFundLoan = async () => {
    if (!wallet.connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!activeLoan) {
      toast.error('No active loan to fund');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Funding loan...');

    try {
      const program = getProgram();
      
      // Fetch the loan account to get borrower and amount
      const loanAccount = await program.account.loan.fetch(activeLoan.publicKey);
      const borrowerPubkey = loanAccount.borrower;
      const amount = loanAccount.amount;
      
      const tx = await program.methods
        .fundLoan(amount)
        .accounts({
          lender: wallet.publicKey,
          borrower: borrowerPubkey,
          loan: activeLoan.publicKey,
          systemProgram: web3.SystemProgram.programId,
          clock: web3.SYSVAR_CLOCK_PUBKEY
        })
        .rpc();
      
      toast.dismiss(loadingToast);
      toast.success('Loan funded successfully!');
      
      setResult({
        success: true,
        message: 'Loan funded successfully',
        signature: tx
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error funding loan:', error);
      
      toast.error(`Funding failed: ${error.message || 'Unknown error'}`);
      setResult({
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`,
        error
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Repay a loan
  const handleRepayLoan = async () => {
    if (!wallet.connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!activeLoan) {
      toast.error('No active loan to repay');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Repaying loan...');

    try {
      const program = getProgram();
      const userPDA = await findUserPDA();
      
      // Get loan details to find lender
      const loanAccount = await program.account.loan.fetch(activeLoan.publicKey);
      const lenderPubkey = loanAccount.lender;
      
      // Platform account - in a real app, this would be the platform's wallet
      // For test purposes, we'll use a derived PDA
      const [platformPDA] = await web3.PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        programID
      );
      
      // Convert amount to lamports
      const amountLamports = new BN(repaymentAmount * LAMPORTS_PER_SOL);
      
      const tx = await program.methods
        .repayLoan(amountLamports, isPlatformFee)
        .accounts({
          loan: activeLoan.publicKey,
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
      
      setResult({
        success: true,
        message: 'Loan repayment successful',
        signature: tx,
        destination: isPlatformFee ? 'Platform' : 'Lender'
      });
      
      // Refresh user data
      await checkUserInitialized();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error repaying loan:', error);
      
      toast.error(`Repayment failed: ${error.message || 'Unknown error'}`);
      setResult({
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`,
        error
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch active loans for the connected wallet
  const fetchUserLoans = async () => {
    if (!wallet.connected || !isUserInitialized) return;
    
    try {
      console.log('Fetching user loans for active display...');
      const program = getProgram();
      
      // Find all loans first for debugging
      const allLoans = await program.account.loan.all();
      console.log('Total loans in system:', allLoans.length);
      
      // Find loans where the user is the borrower
      const userLoans = allLoans.filter(loan => 
        loan.account.borrower.toString() === wallet.publicKey.toString()
      );
      
      console.log('User loans found:', userLoans.length);
      
      // Find active loans for the primary activeLoan state
      const activeLoanAccount = userLoans.find(loan => 
        loan.account.isActive && !loan.account.isCompleted
      );
      
      if (activeLoanAccount) {
        console.log('Found active loan for activeLoan state:', activeLoanAccount.publicKey.toString());
        setActiveLoan({
          publicKey: activeLoanAccount.publicKey,
          id: activeLoanAccount.account.id,
          data: activeLoanAccount.account
        });
      } else if (userLoans.length > 0) {
        // If no active loan, but user has loans, use the most recent one
        console.log('No active loans found, using most recent loan');
        const mostRecentLoan = userLoans[0]; // Could sort by ID if needed
        setActiveLoan({
          publicKey: mostRecentLoan.publicKey,
          id: mostRecentLoan.account.id,
          data: mostRecentLoan.account
        });
      }
    } catch (error) {
      console.error('Error fetching user loans for active display:', error);
    }
  };

  // Fetch all available loans
  const fetchAvailableLoans = async () => {
    if (!connection) return;
    
    try {
      setIsLoadingLoans(true);
      
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
            isCompleted: data.isCompleted
          };
        });
      
      setAvailableLoans(loans);
    } catch (error) {
      console.error('Error fetching available loans:', error);
      toast.error('Failed to fetch available loans');
    } finally {
      setIsLoadingLoans(false);
    }
  };

  // Handle funding a loan from the available loans list
  const handleFundAvailableLoan = async (loan) => {
    if (!wallet.connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Funding loan...');

    try {
      const program = getProgram();
      
      // Get borrower from the loan data
      const borrowerPubkey = new PublicKey(loan.borrower);
      const loanPubkey = new PublicKey(loan.publicKey);
      
      // Convert amount to lamports
      const amount = new BN(loan.amount * LAMPORTS_PER_SOL);
      
      const tx = await program.methods
        .fundLoan(amount)
        .accounts({
          lender: wallet.publicKey,
          borrower: borrowerPubkey,
          loan: loanPubkey,
          systemProgram: web3.SystemProgram.programId,
          clock: web3.SYSVAR_CLOCK_PUBKEY
        })
        .rpc();
      
      toast.dismiss(loadingToast);
      toast.success('Loan funded successfully!');
      
      setResult({
        success: true,
        message: 'Loan funded successfully',
        signature: tx
      });
      
      // Refresh loans list
      fetchAvailableLoans();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error funding loan:', error);
      
      toast.error(`Funding failed: ${error.message || 'Unknown error'}`);
      setResult({
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`,
        error
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate monthly installment for a loan
  const calculateMonthlyInstallment = (loan) => {
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

  // Fetch active loans where the user is the borrower
  const fetchUserActiveLoans = async () => {
    if (!wallet.connected || !isUserInitialized) return;
    
    try {
      setIsLoadingUserLoans(true);
      
      const program = getProgram();
      
      // Log to check program account access
      console.log('Fetching user active loans...');
      
      // Find all loans to debug
      const allLoans = await program.account.loan.all();
      console.log('All loans found:', allLoans.length);
      
      // Debug: log each loan to see its structure and borrower field
      allLoans.forEach((loan, index) => {
        console.log(`Loan ${index}:`, {
          publicKey: loan.publicKey.toString(),
          borrower: loan.account.borrower.toString(),
          isActive: loan.account.isActive,
          isCompleted: loan.account.isCompleted,
          amount: loan.account.amount.toString()
        });
      });
      
      // Find loans where the user is the borrower (using a more lenient approach)
      const loans = allLoans.filter(loan => 
        loan.account.borrower.toString() === wallet.publicKey.toString()
      );
      
      console.log('Loans where user is borrower:', loans.length);
      
      // Filter for active and not completed loans, but make this more lenient for debugging
      const activeLoans = loans.map(loan => {
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
        
        // Get payment details using our helper function
        const paymentDetails = calculateMonthlyInstallment({
          amount: principal,
          interestRate: interestRatePercent,
          duration: durationMonths
        });
        
        // Calculate progress
        const totalRepaid = parseFloat(data.totalRepaid.toString()) / LAMPORTS_PER_SOL;
        const percentageRepaid = (totalRepaid / parseFloat(paymentDetails.totalToRepay)) * 100;
        
        // Calculate remaining payments
        const totalPayments = Math.ceil(durationMonths);
        const paymentsMade = Math.floor(totalRepaid / parseFloat(paymentDetails.monthlyPayment));
        const remainingPayments = Math.max(0, totalPayments - paymentsMade);
        
        return {
          id: data.id.toString(),
          publicKey: loan.publicKey.toString(),
          borrower: data.borrower.toString(),
          lender: data.lender.toString(),
          amount: principal,
          interestRate: interestRatePercent,
          duration: durationMonths, // Duration in months
          startDate: new Date(startTimestamp > 0 ? startTimestamp : Date.now()).toLocaleDateString(),
          daysSinceStart,
          totalRepaid,
          isActive: data.isActive,
          isCompleted: data.isCompleted,
          monthlyPayment: parseFloat(paymentDetails.monthlyPayment),
          totalAmountDue: parseFloat(paymentDetails.totalToRepay),
          totalInterest: parseFloat(paymentDetails.totalInterest),
          percentageRepaid: Math.min(percentageRepaid, 100).toFixed(1),
          progress: Math.min(percentageRepaid, 100),
          paymentsMade,
          remainingPayments,
          totalPayments
        };
      });
      
      console.log('Processed loans:', activeLoans);
      
      // For now, show all loans by the user, including inactive ones, for debugging
      setActiveUserLoans(activeLoans);
      
      // Set active loan for the existing UI if there's at least one
      if (activeLoans.length > 0 && !activeLoan) {
        setActiveLoan({
          publicKey: new PublicKey(activeLoans[0].publicKey),
          id: activeLoans[0].id,
          data: {
            amount: new BN(activeLoans[0].amount * LAMPORTS_PER_SOL),
            interestRate: activeLoans[0].interestRate * 100,
            isActive: activeLoans[0].isActive
          }
        });
        
        // Set repayment amount to monthly payment
        setRepaymentAmount(activeLoans[0].monthlyPayment);
      }
    } catch (error) {
      console.error('Error fetching user loans:', error);
      toast.error('Failed to load your active loans');
    } finally {
      setIsLoadingUserLoans(false);
    }
  };

  // Repay a specific loan's monthly installment
  const handleRepayMonthlyInstallment = async (loan) => {
    if (!wallet.connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Processing monthly repayment...');

    try {
      const program = getProgram();
      const userPDA = await findUserPDA();
      
      // Get loan details
      const lenderPubkey = new PublicKey(loan.lender);
      const loanPubkey = new PublicKey(loan.publicKey);
      
      // Platform account - in a real app, this would be the platform's wallet
      const [platformPDA] = await web3.PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        programID
      );
      
      // Convert monthly payment to lamports - make sure we don't overpay
      // For the last payment, calculate the remaining amount needed
      const amountNeeded = loan.totalAmountDue - loan.totalRepaid;
      const paymentAmount = loan.remainingPayments <= 1 ? 
        amountNeeded : 
        loan.monthlyPayment;
        
      console.log('Payment calculation:', {
        totalAmountDue: loan.totalAmountDue,
        totalRepaid: loan.totalRepaid,
        remainingPayments: loan.remainingPayments,
        paymentAmount: paymentAmount
      });
      
      const amountLamports = new BN(paymentAmount * LAMPORTS_PER_SOL);
      
      // First pay the lender
      const txLender = await program.methods
        .repayLoan(amountLamports, false) // isPlatformFee = false for lender payment
        .accounts({
          loan: loanPubkey,
          borrower: wallet.publicKey,
          lender: lenderPubkey,
          platformAccount: platformPDA,
          user: userPDA,
          systemProgram: web3.SystemProgram.programId,
          clock: web3.SYSVAR_CLOCK_PUBKEY
        })
        .rpc();
      
      toast.dismiss(loadingToast);
      toast.success('Monthly repayment successful!');
      
      setResult({
        success: true,
        message: 'Monthly repayment successful',
        signature: txLender,
        amount: paymentAmount,
        remainingPayments: loan.remainingPayments - 1
      });
      
      // Refresh user loans data
      await fetchUserActiveLoans();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error making repayment:', error);
      
      toast.error(`Repayment failed: ${error.message || 'Unknown error'}`);
      setResult({
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`,
        error
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract amount from logs
  const extractAmount = (logs) => {
    try {
      for (const log of logs) {
        // Look for amount mentions in the logs
        if (log.includes('amount') && log.includes('SOL')) {
          const matches = log.match(/(\d+(\.\d+)?)\s*SOL/);
          if (matches && matches[1]) {
            return parseFloat(matches[1]);
          }
        }
      }
    } catch (err) {
      console.warn('Error extracting amount:', err);
    }
    
    return null;
  };

  // Extract additional transaction details from logs
  const extractTransactionDetails = (logs) => {
    const details = {};
    const logString = logs.join(' ');
    
    // Try to extract loan ID
    const loanIdMatch = logString.match(/loan(?:\s+|_)id(?:\s*|:)(\d+)/i);
    if (loanIdMatch && loanIdMatch[1]) {
      details.loanId = loanIdMatch[1];
    }
    
    // Try to extract interest rate
    const interestMatch = logString.match(/interest(?:\s+|_)rate(?:\s*|:)(\d+(?:\.\d+)?)/i);
    if (interestMatch && interestMatch[1]) {
      details.interestRate = interestMatch[1] + '%';
    }
    
    // Try to extract duration
    const durationMatch = logString.match(/duration(?:\s*|:)(\d+)/i);
    if (durationMatch && durationMatch[1]) {
      details.duration = durationMatch[1] + ' seconds';
      
      // Convert seconds to months for better readability
      const seconds = parseInt(durationMatch[1]);
      if (seconds > 0) {
        const months = Math.round(seconds / (30 * 24 * 60 * 60) * 10) / 10;
        details.duration = months + ' months';
      }
    }
    
    // Check if it's a platform fee payment
    if (logString.includes('platform fee') || logString.includes('isPlatformFee: true')) {
      details.isPlatformFee = true;
    }
    
    return details;
  };

  // Fetch transaction history with rate limiting
  const fetchTransactionHistory = async () => {
    if (!wallet.connected || !wallet.publicKey || !connection) return;
    
    // Rate limiting - only fetch once every 30 seconds
    const now = Date.now();
    if (now - lastFetchTime < 30000) {
      console.log('Rate limiting transaction fetch to prevent too many requests');
      toast.info('Please wait a moment before refreshing transaction history');
      return;
    }
    
    setIsLoadingTransactions(true);
    setLastFetchTime(now);
    
    try {
      // Get program ID
      const programId = new PublicKey('9euLSxzKoMvpQb5N7GjjvLrb6XurpuiJsk7jZ4mHUvhb');
      
      // Limit the number of signatures we fetch to avoid rate limiting
      const signatures = await connection.getSignaturesForAddress(
        programId, 
        { limit: 10 } // Keep the limit small to avoid rate limiting
      );
      
      if (signatures.length === 0) {
        setTransactions([]);
        return;
      }
      
      // Create Anchor coder for event parsing
      const coder = new Program(idl, programID, getProvider()).coder;
      
      // Create Event Parser
      const eventParser = new anchor.EventParser(programID, coder);
      
      // Process in smaller batches to avoid too many concurrent requests
      const processedTxs = [];
      const batchSize = 3;
      
      for (let i = 0; i < signatures.length; i += batchSize) {
        const batch = signatures.slice(i, i + batchSize);
        
        // Use allSettled to prevent one failure from blocking others
        const txResponses = await Promise.allSettled(
          batch.map(sig => connection.getParsedTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          }))
        );
        
        // Small delay between batches to avoid rate limits
        if (i + batchSize < signatures.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Process successful fetches
        for (let j = 0; j < txResponses.length; j++) {
          const result = txResponses[j];
          
          if (result.status === 'fulfilled' && result.value) {
            const tx = result.value;
            const signature = batch[j].signature;
            
            if (!tx?.meta?.logMessages) continue;
            
            // Check if instruction includes the user's public key
            const isUserInvolved = tx.transaction.message.accountKeys.some(
              key => key.toString() === wallet.publicKey.toString()
            );
            
            if (!isUserInvolved) continue;
            
            try {
              // Extract transaction event data using Anchor event parser
              const events = [];
              eventParser.parseLogs(tx.meta.logMessages, (event) => {
                if (event.name === 'TransactionEvent') {
                  events.push({
                    ...event.data,
                    eventName: event.name,
                  });
                }
              });
              
              // If we have TransactionEvent events
              if (events.length > 0) {
                for (const event of events) {
                  // Check if this event involves the current user
                  const isUserEvent = event.user && event.user.toString() === wallet.publicKey.toString();
                  
                  if (isUserEvent) {
                    // Format the event data for display
                    processedTxs.push({
                      signature,
                      timestamp: event.timestamp ? new Date(event.timestamp.toNumber() * 1000).toLocaleString() : 
                                                  (tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown'),
                      type: event.txType || determineTransactionType(tx.meta.logMessages || []),
                      amount: event.amount ? (event.amount.toNumber() / LAMPORTS_PER_SOL).toFixed(4) : 
                             extractAmount(tx.meta.logMessages || []),
                      sender: event.sender ? event.sender.toString() : tx.transaction.message.accountKeys[0].toString(),
                      receiver: event.receiver ? event.receiver.toString() : null,
                      loanId: event.loanId ? event.loanId.toString() : null,
                      details: {
                        ...(event.interestRate && { interestRate: (event.interestRate.toNumber() / 100) + '%' }),
                        ...(event.duration && { duration: (event.duration.toNumber() / (30 * 24 * 60 * 60)).toFixed(1) + ' months' }),
                        ...(event.isPlatformFee && { isPlatformFee: event.isPlatformFee }),
                        ...(event.txType && { transactionType: event.txType })
                      },
                      slot: tx.slot,
                      isFromEvent: true
                    });
                  }
                }
              } else {
                // Fallback to legacy parsing if no TransactionEvents found
                // This ensures backward compatibility with older transactions
                // Get account keys involved in the transaction
                const accounts = tx.transaction.message.accountKeys.map(key => key.toString());
                
                // Extract sender (fee payer is always first account)
                const sender = accounts[0];
                
                // Try to extract receiver from logs
                let receiver = null;
                if (tx.meta.logMessages) {
                  // Try to find transfer recipient or loan participant
                  for (const log of tx.meta.logMessages) {
                    if (log.includes('to:') || log.includes('receiver:') || log.includes('borrower:') || log.includes('lender:')) {
                      const matches = log.match(/(?:to|receiver|borrower|lender):\s*([1-9A-HJ-NP-Za-km-z]{32,44})/i);
                      if (matches && matches[1]) {
                        receiver = matches[1];
                        break;
                      }
                    }
                  }
                }
                
                // If no receiver found and transaction has instructions with accounts
                if (!receiver && tx.transaction.message.instructions.length > 0) {
                  // Get accounts referenced in first instruction (excluding the sender)
                  const accountIndices = tx.transaction.message.instructions[0].accounts || [];
                  if (accountIndices.length > 1) {
                    // Use the second account as the receiver (common pattern)
                    const secondAccountIndex = accountIndices[1];
                    receiver = accounts[secondAccountIndex];
                  }
                }
                
                // Get transaction participants (excluding system program, clock, etc.)
                const systemProgramId = '11111111111111111111111111111111';
                const participants = accounts.filter(account => 
                  account !== systemProgramId && 
                  !account.includes('SysvarC1ock11111') &&
                  !account.includes('SysvarRent111111') &&
                  account !== programID.toString()
                );
                
                // Extract additional details from the transaction
                const details = extractTransactionDetails(tx.meta.logMessages || []);
                
                processedTxs.push({
                  signature,
                  timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown',
                  type: determineTransactionType(tx.meta.logMessages || []),
                  amount: extractAmount(tx.meta.logMessages || []),
                  sender: sender,
                  receiver: receiver,
                  participants: participants,
                  details: details,
                  slot: tx.slot,
                  isFromEvent: false
                });
              }
            } catch (err) {
              console.warn('Error processing transaction events:', err);
              
              // Fallback to basic transaction info if event parsing fails
              processedTxs.push({
                signature,
                timestamp: tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown',
                type: 'Transaction',
                sender: tx.transaction.message.accountKeys[0].toString(),
                details: { error: 'Could not parse event data' },
                slot: tx.slot,
                isFromEvent: false
              });
            }
          }
        }
      }
      
      setTransactions(processedTxs);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  // Helper to determine transaction type from logs
  const determineTransactionType = (logs) => {
    const logString = logs.join(' ');
    
    if (logString.includes('initialize')) return 'Initialize User';
    if (logString.includes('createLoan')) return 'Create Loan';
    if (logString.includes('fundLoan')) return 'Fund Loan';
    if (logString.includes('repayLoan')) return 'Repay Loan';
    
    return 'Transaction';
  };

  // Fetch transaction history when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      fetchTransactionHistory();
    }
  }, [wallet.connected, wallet.publicKey]);

  // Check user initialization and fetch loans when wallet changes
  useEffect(() => {
    if (wallet.connected) {
      checkUserInitialized().then(() => {
        if (isUserInitialized) {
          console.log('User is initialized, fetching loans...');
          fetchUserLoans();
          fetchUserActiveLoans();
        }
      });
    } else {
      setUserAccount(null);
      setIsUserInitialized(false);
      setActiveLoan(null);
      setActiveUserLoans([]);
    }
    
    // Always fetch available loans regardless of wallet connection
    fetchAvailableLoans();
  }, [wallet.connected, wallet.publicKey, isUserInitialized]);
  
  // Effect to fetch loans when user account changes
  useEffect(() => {
    if (wallet.connected && isUserInitialized && userAccount) {
      console.log('User account updated, fetching loans...', userAccount);
      fetchUserLoans();
      fetchUserActiveLoans();
    }
  }, [userAccount]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 mb-2">
            MicroLoan Platform
          </h1>
          <p className="text-lg text-gray-600">
            Create, fund, and manage blockchain microloans
          </p>
        </header>
        
        {/* Wallet Connection Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Wallet Connection</h2>
              {wallet.connected ? (
                <div className="flex items-center text-gray-600">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 mr-2"></div>
                  <p>Connected: <span className="font-mono">{wallet.publicKey.toString().slice(0, 6)}...{wallet.publicKey.toString().slice(-4)}</span></p>
                </div>
              ) : (
                <div className="flex items-center text-gray-600">
                  <div className="h-3 w-3 rounded-full bg-amber-500 mr-2"></div>
                  <p>Please connect your wallet to continue</p>
                </div>
              )}
            </div>
            <div className="wallet-adapter-button-wrapper">
              <WalletMultiButton className="wallet-adapter-button wallet-adapter-button-trigger !bg-indigo-600 hover:!bg-indigo-700 transition-colors rounded-lg" />
            </div>
          </div>
        </div>
        
        {/* User Account Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 transition-all hover:shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">User Account</h2>
          
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Loading user data...</span>
            </div>
          )}
          
          {!isLoading && wallet.connected && (
            <div>
              <div className="flex items-center mb-4">
                <div className={`h-2.5 w-2.5 rounded-full ${isUserInitialized ? 'bg-emerald-500' : 'bg-amber-500'} mr-2`}></div>
                <p className="text-gray-700">Account Status: 
                  <span className={`ml-1 font-medium ${isUserInitialized ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isUserInitialized ? 'Initialized' : 'Not Initialized'}
                  </span>
                </p>
              </div>
              
              {isUserInitialized && userAccount && (
                <div className="bg-indigo-50 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-indigo-100">
                    <p className="text-sm text-indigo-600 font-medium">Credit Score</p>
                    <p className="text-2xl font-bold">{userAccount.creditScore.toString()}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-indigo-100">
                    <p className="text-sm text-indigo-600 font-medium">Loans Taken</p>
                    <p className="text-2xl font-bold">{userAccount.loansTaken.toString()}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-indigo-100">
                    <p className="text-sm text-indigo-600 font-medium">Loans Repaid</p>
                    <p className="text-2xl font-bold">{userAccount.loansRepaid.toString()}</p>
                  </div>
                </div>
              )}
              
              {!isUserInitialized && (
          <button
                  onClick={handleInitializeUser}
                  disabled={isLoading}
                  className={`
                    w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium text-center 
                    ${isLoading 
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-sm hover:shadow transition-all'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Initializing...
                    </span>
                  ) : 'Initialize User Account'}
                </button>
              )}
            </div>
          )}
        </div>
        
        {isUserInitialized && (
          <>
            {/* Dashboard Tabs */}
            <div className="mb-8">
              <div className="border-b border-gray-200 mb-6">
                <ul className="flex flex-wrap -mb-px">
                  <li className="mr-2">
                    <button 
                      onClick={() => setActiveTab('active-loans')}
                      className={`inline-block py-3 px-4 font-medium border-b-2 rounded-t-lg ${
                        activeTab === 'active-loans' 
                          ? 'text-indigo-600 border-indigo-600' 
                          : 'text-gray-500 hover:text-gray-600 border-transparent hover:border-gray-300'
                      }`}
                    >
                      Your Loans
                    </button>
                  </li>
                  <li className="mr-2">
                    <button 
                      onClick={() => setActiveTab('create-loan')}
                      className={`inline-block py-3 px-4 font-medium border-b-2 rounded-t-lg ${
                        activeTab === 'create-loan' 
                          ? 'text-indigo-600 border-indigo-600' 
                          : 'text-gray-500 hover:text-gray-600 border-transparent hover:border-gray-300'
                      }`}
                    >
                      Create Loan
                    </button>
                  </li>
                  <li className="mr-2">
                    <button 
                      onClick={() => setActiveTab('available-loans')}
                      className={`inline-block py-3 px-4 font-medium border-b-2 rounded-t-lg ${
                        activeTab === 'available-loans' 
                          ? 'text-indigo-600 border-indigo-600' 
                          : 'text-gray-500 hover:text-gray-600 border-transparent hover:border-gray-300'
                      }`}
                    >
                      Market
                    </button>
                  </li>
                </ul>
              </div>

              {/* Your Loans Section */}
              <div id="active-loans" className={activeTab === 'active-loans' ? '' : 'hidden'}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">Your Loans</h2>
                  <button 
                    onClick={fetchUserActiveLoans}
                    className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Loans
                  </button>
                </div>
                
                {isLoadingUserLoans ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600">Loading your loans...</span>
                  </div>
                ) : activeUserLoans.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {activeUserLoans.map((loan) => (
                      <div key={loan.publicKey} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <div className="p-5 border-b border-gray-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-gray-800">Loan #{loan.id}</h3>
                              <p className="text-sm text-gray-500">Started: {loan.startDate}</p>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-bold text-gray-800">{loan.amount} SOL</div>
                              <div className="text-sm text-gray-600">{loan.interestRate}% interest</div>
                              <span className={`inline-block px-2.5 py-0.5 text-xs rounded-full mt-1 font-medium
                                ${loan.isCompleted 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : loan.isActive 
                                    ? 'bg-indigo-100 text-indigo-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }
                              `}>
                                {loan.isCompleted ? 'Completed' : loan.isActive ? 'Active' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-5">
                          {/* Loan stats */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Lender</p>
                              <p className="font-mono text-sm truncate">
                                {loan.lender === "11111111111111111111111111111111" 
                                  ? <span className="text-amber-600">Not funded yet</span>
                                  : `${loan.lender.slice(0, 4)}...${loan.lender.slice(-4)}`
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Duration</p>
                              <p className="text-sm">{Math.round(loan.duration)} months</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Monthly Payment</p>
                              <p className="text-sm font-semibold">{loan.monthlyPayment} SOL</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Payments</p>
                              <p className="text-sm">{loan.paymentsMade} of {loan.totalPayments}</p>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{loan.percentageRepaid}% repaid</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="h-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600" 
                                style={{ width: `${loan.progress}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>{loan.totalRepaid.toFixed(4)} SOL paid</span>
                              <span>{loan.remainingPayments} payments left</span>
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          {loan.isActive && !loan.isCompleted && (
                            <button
                              onClick={() => handleRepayMonthlyInstallment(loan)}
                              disabled={isLoading}
                              className={`
                                w-full py-2.5 px-5 rounded-lg font-medium transition-all
                                ${isLoading 
                                  ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow hover:shadow-md'
                                }
                              `}
                            >
                              {isLoading ? (
                                <span className="flex items-center justify-center">
                                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                  Processing...
                                </span>
                              ) : `Pay Monthly Installment (${loan.monthlyPayment} SOL)`}
                            </button>
                          )}
                          
                          {!loan.isActive && !loan.isCompleted && (
                            <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-lg">
                              <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span>This loan is waiting for a lender to fund it before you can make repayments.</span>
                              </div>
                            </div>
                          )}
                          
                          {loan.isCompleted && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-lg">
                              <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>This loan has been fully repaid. Your credit score has improved!</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-1">No Loans Found</h3>
                    <p className="text-gray-500 mb-4">You don't have any loans yet. Create your first loan to get started!</p>
                    <button 
                      onClick={() => setActiveTab('create-loan')}
                      className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-800"
                    >
                      Create your first loan
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Create Loan Section */}
            <div id="create-loan" className={activeTab === 'create-loan' ? '' : 'hidden'}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Create New Loan</h2>
                <p className="text-gray-500">Set up your loan parameters and submit for funding</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loan Amount (SOL)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">◎</span>
                      </div>
                      <input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(parseFloat(e.target.value))}
                        min="0.01"
                        step="0.01"
                        className="pl-8 block w-full py-2.5 px-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0.1"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Min: 0.01 SOL</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interest Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={interestRate}
                        onChange={(e) => setInterestRate(parseInt(e.target.value))}
                        min="1"
                        className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="10"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Annual interest rate</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (months)
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="1">1 month</option>
                      <option value="3">3 months</option>
                      <option value="6">6 months</option>
                      <option value="12">12 months</option>
                      <option value="24">24 months</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Repayment period</p>
                  </div>
                </div>
                
                {/* Loan Preview */}
                {loanAmount > 0 && interestRate > 0 && duration > 0 && (
                  <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-indigo-800 mb-3">Loan Preview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-indigo-600 font-medium">Principal</p>
                        <p className="text-lg font-semibold">{loanAmount} SOL</p>
                      </div>
                      <div>
                        <p className="text-xs text-indigo-600 font-medium">Interest</p>
                        <p className="text-lg font-semibold">
                          {(loanAmount * (interestRate / 100) * (duration / 12)).toFixed(4)} SOL
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-indigo-600 font-medium">Total Repayment</p>
                        <p className="text-lg font-semibold">
                          {(loanAmount + (loanAmount * (interestRate / 100) * (duration / 12))).toFixed(4)} SOL
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-indigo-600 font-medium">Monthly Payment</p>
                        <p className="text-lg font-semibold">
                          {((loanAmount + (loanAmount * (interestRate / 100) * (duration / 12))) / duration).toFixed(4)} SOL
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleCreateLoan}
                  disabled={isLoading || loanAmount <= 0 || interestRate <= 0 || duration <= 0}
                  className={`
                    w-full py-2.5 px-5 rounded-lg font-medium transition-all
                    ${isLoading || loanAmount <= 0 || interestRate <= 0 || duration <= 0
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow hover:shadow-md'
                    }
                  `}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Creating Loan...
                    </span>
                  ) : 'Create Loan'}
                </button>
              </div>
            </div>
          </>
        )}
        
        {/* Available Loans Market Section */}
        <div id="available-loans" className={activeTab === 'available-loans' ? '' : 'hidden'}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Loan Marketplace</h2>
              <p className="text-gray-500">Find loans to fund and earn interest</p>
            </div>
            <button 
              onClick={fetchAvailableLoans}
              className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Market
            </button>
          </div>
          
          {isLoadingLoans ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Loading available loans...</span>
            </div>
          ) : availableLoans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableLoans.map((loan) => (
                <div key={loan.publicKey} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full inline-block mb-1">Loan #{loan.id}</div>
                        <h3 className="font-semibold text-gray-800">{loan.amount} SOL</h3>
                      </div>
                      <div className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {loan.interestRate}% APR
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium text-gray-800">{Math.round(loan.duration)} months</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monthly return:</span>
                        <span className="font-medium text-gray-800">
                          {((loan.amount * (1 + (loan.interestRate/100) * (loan.duration/12))) / loan.duration).toFixed(4)} SOL
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Borrower:</span>
                        <span className="font-mono text-gray-800">{loan.borrower.slice(0, 4)}...{loan.borrower.slice(-4)}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleFundAvailableLoan(loan)}
            disabled={isLoading || !wallet.connected}
                      className={`
                        w-full py-2.5 px-5 rounded-lg font-medium transition-all
                        ${isLoading || !wallet.connected
                          ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow hover:shadow-md'
                        }
                      `}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Processing...
                        </span>
                      ) : 'Fund This Loan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">No Available Loans</h3>
              <p className="text-gray-500 mb-4">There are no loans available for funding at the moment.</p>
              <button 
                onClick={fetchAvailableLoans}
                className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-800"
              >
                Refresh marketplace
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {activeLoan && (
          <>
            <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Active Loan</h2>
              
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <p>Loan ID: {activeLoan.id?.toString()}</p>
                <p className="text-xs font-mono break-all mt-1">
                  Loan Address: {activeLoan.publicKey?.toString()}
                </p>
                
                {activeLoan.data && (
                  <div className="mt-2">
                    <p>Amount: {activeLoan.data.amount.toString() / LAMPORTS_PER_SOL} SOL</p>
                    <p>Interest Rate: {activeLoan.data.interestRate / 100}%</p>
                    <p>Status: {activeLoan.data.isActive ? 'Active' : 'Pending'}</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleFundLoan}
                  disabled={isLoading || (activeLoan.data && activeLoan.data.isActive)}
                  className={`py-2 px-4 rounded-lg font-medium ${
                    isLoading || (activeLoan.data && activeLoan.data.isActive)
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isLoading ? 'Processing...' : 'Fund Loan (as Lender)'}
                </button>
                
                <button
                  onClick={handleRepayLoan}
                  disabled={isLoading || (activeLoan.data && !activeLoan.data.isActive)}
                  className={`py-2 px-4 rounded-lg font-medium ${
                    isLoading || (activeLoan.data && !activeLoan.data.isActive)
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isLoading ? 'Processing...' : 'Repay Loan'}
                </button>
              </div>
            </div>
            
            <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Repayment Options</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount to Repay (SOL)
                  </label>
                  <input
                    type="number"
                    value={repaymentAmount}
                    onChange={(e) => setRepaymentAmount(parseFloat(e.target.value))}
                    min="0.001"
                    step="0.001"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPlatformFee"
                    checked={isPlatformFee}
                    onChange={(e) => setIsPlatformFee(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="isPlatformFee" className="text-sm text-gray-700">
                    Pay as platform fee
                  </label>
                </div>
                
                <button
                  onClick={handleRepayLoan}
                  disabled={isLoading || (activeLoan.data && !activeLoan.data.isActive)}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
                    isLoading || (activeLoan.data && !activeLoan.data.isActive)
                ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
                  {isLoading ? 'Processing...' : 'Make Repayment'}
          </button>
              </div>
            </div>
          </>
        )}
          
        {/* Transaction History Section */}
        {wallet.connected && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Transaction History</h2>
              <button 
                onClick={fetchTransactionHistory}
                disabled={isLoadingTransactions}
                className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh History
              </button>
            </div>
            
            {isLoadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">Loading transaction history...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 text-gray-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-600">No transactions found for your account.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((tx, index) => (
                  <div key={index} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-4 
                          ${tx.type === 'Initialize User' ? 'bg-blue-100 text-blue-600' : 
                            tx.type === 'Create Loan' ? 'bg-indigo-100 text-indigo-600' : 
                            tx.type === 'Fund Loan' ? 'bg-green-100 text-green-600' : 
                            tx.type === 'Repay Loan' ? 'bg-purple-100 text-purple-600' : 
                            'bg-gray-100 text-gray-600'}`}
                        >
                          {tx.type === 'Initialize User' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          ) : tx.type === 'Create Loan' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
                            </svg>
                          ) : tx.type === 'Fund Loan' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                            </svg>
                          ) : tx.type === 'Repay Loan' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 4a1 1 0 00-1 1v10a1 1 0 102 0V5a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v10a1 1 0 102 0V5a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{tx.type}</div>
                          <div className="text-xs text-gray-500">
                            {tx.timestamp || 'Unknown time'}
                          </div>
                          
                          {/* Transaction amount */}
                          {tx.amount && (
                            <div className="mt-1 font-medium text-gray-800">
                              <span className="text-sm">Amount: </span>
                              <span className="font-semibold">◎ {tx.amount}</span>
            </div>
          )}
                        </div>
        </div>
        
                      <div className="flex flex-col space-y-1">
                        {/* Transaction details section */}
                        <div className="p-3 bg-gray-50 rounded-md text-sm space-y-1">
                          {/* Sender */}
                          {tx.sender && (
                            <div className="grid grid-cols-3 gap-1">
                              <span className="text-gray-500 font-medium">Sender:</span>
                              <span className="col-span-2 font-mono text-xs truncate">
                                {tx.sender === wallet.publicKey.toString() ? 
                                  <span className="text-indigo-600">You</span> : 
                                  <>{tx.sender.slice(0, 4)}...{tx.sender.slice(-4)}</>
                                }
                              </span>
                            </div>
                          )}
                          
                          {/* Receiver */}
                          {tx.receiver && (
                            <div className="grid grid-cols-3 gap-1">
                              <span className="text-gray-500 font-medium">Receiver:</span>
                              <span className="col-span-2 font-mono text-xs truncate">
                                {tx.receiver === wallet.publicKey.toString() ? 
                                  <span className="text-indigo-600">You</span> : 
                                  <>{tx.receiver.slice(0, 4)}...{tx.receiver.slice(-4)}</>
                                }
                              </span>
                            </div>
                          )}
                          
                          {/* Additional Details */}
                          {tx.details && Object.keys(tx.details).length > 0 && Object.entries(tx.details).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-3 gap-1">
                              <span className="text-gray-500 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span className="col-span-2 text-xs">{value.toString()}</span>
                            </div>
                          ))}
                          
                          {/* Explorer Link */}
                          <a
                            href={`https://explorer.solana.com/tx/${tx.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center"
                          >
                            View on Explorer
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M11 3a1 1 0 000 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                          </a>
                        </div>
                        
                        {/* Collapse/expand for more participants */}
                        {tx.participants && tx.participants.length > 2 && (
                          <button 
                            onClick={() => {
                              // Implement toggle for showing all participants
                              // This would require additional state management
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 text-left"
                          >
                            {`+${tx.participants.length - 2} more accounts involved`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Result Notification */}
        {result && (
          <div className={`fixed bottom-4 right-4 max-w-md p-4 rounded-xl shadow-lg border ${
            result.success 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {result.success ? (
                  <svg className="h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>
                  {result.success ? 'Success' : 'Error'}
                </h3>
                <div className={`mt-1 text-sm ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
                  <p>{result.message}</p>
                </div>
                {result.signature && (
                  <div className="mt-2 text-xs font-mono break-all text-gray-600">
                    Transaction: {result.signature.slice(0, 16)}...{result.signature.slice(-8)}
                  </div>
                )}
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button 
                    onClick={() => setResult(null)}
                    className={`inline-flex rounded-md p-1.5 ${
                      result.success 
                        ? 'text-emerald-500 hover:bg-emerald-100' 
                        : 'text-red-500 hover:bg-red-100'
                    }`}
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolanaTestPage; 