import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { HalfCircleBackground } from '../components';
import { TransactionContext } from '../context/TransactionContext';
import { shortenAddress } from '../utils/shortenAddress';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

// Helper function to add delay between API calls for rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff implementation for retries
const backoffRetry = async (fn, maxRetries = 3, initialDelay = 500) => {
  let retries = 0;
  
  const execute = async () => {
    try {
      return await fn();
    } catch (error) {
      if (error.message && error.message.includes('429') && retries < maxRetries) {
        const delayTime = initialDelay * Math.pow(2, retries);
        retries++;
        console.log(`Rate limit hit (${retries}/${maxRetries}). Retrying after ${delayTime}ms...`);
        await delay(delayTime);
        return execute();
      }
      
      throw error;
    }
  };
  
  return execute();
};

const TransactionsPage = () => {
  const navigate = useNavigate();
  const { transactions, isLoading, currentAccount } = useContext(TransactionContext);
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState({
    totalLoaned: 0,
    totalRepaid: 0,
    outstanding: 0,
    nextPayment: 0,
    loansCount: 0,
    paymentsCount: 0,
    paymentsLeft: 0
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [fetchProgress, setFetchProgress] = useState(0);
  
  // Use a ref to track if component is mounted to prevent state updates after unmount
  const isMounted = React.useRef(true);
  
  // Clear the ref when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (publicKey) {
      fetchWalletTransactions();
    }
  }, [publicKey]);

  const fetchWalletTransactions = async () => {
    if (!publicKey || !connection || isLoadingHistory) return;
    
    try {
      setIsLoadingHistory(true);
      setFetchError(null);
      setFetchProgress(0);
      
      // Get maximum limit of transactions we can fetch (10 is a safe value)
      const limit = 10; 
      const loadingToast = toast.loading(`Loading your transactions...`);
      
      // Fetch signatures for the wallet's transactions
      setFetchProgress(5);
      console.log(`Fetching signatures for ${publicKey.toString()} (limit: ${limit})...`);
      
      const signatures = await connection.getSignaturesForAddress(
        publicKey, 
        { limit }, 
        'confirmed'
      );
      
      console.log(`Found ${signatures.length} transaction signatures`);
      setFetchProgress(25);
      
      if (signatures.length === 0) {
        toast.dismiss(loadingToast);
        toast.success('No transactions found');
        setWalletTransactions([]);
        setIsLoadingHistory(false);
        return;
      }
      
      // Process all transactions at once without batching
      setFetchProgress(30);
      
      // Fetch all transactions in parallel with a small concurrency limit
      // We'll use Promise.all but with a limited concurrency pool
      const fetchTransactionWithRetry = async (signature) => {
        try {
          return await backoffRetry(() => 
            connection.getTransaction(signature, {
              maxSupportedTransactionVersion: 0
            })
          );
        } catch (error) {
          console.error(`Error fetching transaction ${signature}:`, error);
          return null;
        }
      };
      
      // Helper for limiting concurrency
      const limitConcurrency = async (items, concurrencyLimit, processFn) => {
        const results = [];
        const running = new Set();
        
        // Create a Promise that resolves after processing each item
        for (const [index, item] of items.entries()) {
          // If we've reached the concurrency limit, wait for one task to complete
          if (running.size >= concurrencyLimit) {
            await Promise.race(running);
          }
          
          // Create a promise for processing this item
          const promise = (async () => {
            try {
              setFetchProgress(30 + Math.floor((index / items.length) * 40));
              return await processFn(item);
            } finally {
              running.delete(promise);
            }
          })();
          
          running.add(promise);
          results.push(promise);
        }
        
        // Wait for all remaining tasks to complete
        return Promise.all(results);
      };
      
      // Fetch transactions with limited concurrency (3 at a time)
      const transactions = await limitConcurrency(
        signatures.map(sig => sig.signature),
        3,  // Process 3 transactions concurrently
        fetchTransactionWithRetry
      );
      
      setFetchProgress(70);
      
      // Format the transactions
      console.log(`Formatting ${transactions.filter(tx => tx !== null).length} transactions...`);
      
      const formattedTransactions = transactions
        .map((tx, index) => {
          if (!tx) return null;
          
          const signature = signatures[index].signature;
          setFetchProgress(70 + Math.floor((index / transactions.length) * 25));
          
          try {
            // Check if transaction has necessary data
            if (!tx || !tx.transaction || !tx.transaction.message || 
                !tx.transaction.message.accountKeys || !tx.meta || 
                !tx.meta.postBalances || !tx.meta.preBalances || 
                tx.blockTime === undefined) {
              console.log(`Skipping transaction ${signature} - missing data`);
              return null;
            }
            
            // Determine if this is an incoming or outgoing transaction
            const isOutgoing = tx.transaction.message.accountKeys[0].toString() === publicKey.toString();
            const otherParty = isOutgoing 
              ? tx.transaction.message.accountKeys.length > 1 ? tx.transaction.message.accountKeys[1].toString() : 'Unknown'
              : tx.transaction.message.accountKeys[0].toString();
            
            // Calculate amount (in SOL)
            let amount = 0;
            
            // Find the index of the user's account in the transaction
            const userAccountIndex = tx.transaction.message.accountKeys.findIndex(
              key => key && typeof key.toString === 'function' && key.toString() === publicKey.toString()
            );
            
            if (userAccountIndex !== -1) {
              // Calculate the difference in balance for the user's account
              const preBalance = tx.meta.preBalances[userAccountIndex];
              const postBalance = tx.meta.postBalances[userAccountIndex];
              
              // For outgoing transactions, we need to consider the transaction fee as well
              if (isOutgoing) {
                amount = (preBalance - postBalance) / LAMPORTS_PER_SOL;
              } else {
                // For incoming transactions, simply use the difference in balance
                amount = (postBalance - preBalance) / LAMPORTS_PER_SOL;
              }
            }
            
            // Determine type and status
            const type = isOutgoing ? 'repayment' : 'loan';
            const status = 'completed';
            
            // Format date and time
            const txDate = new Date(tx.blockTime * 1000);
            const formattedDate = txDate.toLocaleDateString();
            const formattedTime = txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return {
              id: signature,
              type,
              status,
              amount: Math.abs(amount).toFixed(4), // Use 4 decimal places for SOL
              date: formattedDate,
              time: formattedTime,
              timestamp: txDate,
              recipient: shortenAddress(otherParty),
              fullRecipient: otherParty
            };
          } catch (error) {
            console.error(`Error processing transaction ${signature}:`, error);
            return null;
          }
        })
        .filter(tx => tx !== null && parseFloat(tx.amount) > 0.0001); // Filter out null and zero-amount transactions
      
      // Sort by timestamp (most recent first)
      formattedTransactions.sort((a, b) => b.timestamp - a.timestamp);
      
      if (isMounted.current) {
        setWalletTransactions(formattedTransactions);
        setFetchProgress(100);
        setIsLoadingHistory(false);
        
        // Calculate transaction summary after setting wallet transactions
        calculateTransactionSummary(formattedTransactions);
        
        toast.dismiss(loadingToast);
        toast.success(`Loaded ${formattedTransactions.length} transactions`);
      }
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
      
      if (isMounted.current) {
        setIsLoadingHistory(false);
        
        // Set user-friendly error message
        if (error.message && error.message.includes('429')) {
          setFetchError("Rate limit exceeded. Please try again in a moment.");
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else {
          setFetchError("Failed to load transactions. Please try again later.");
          toast.error("Failed to load transactions");
        }
      }
    }
  };

  const calculateTransactionSummary = (txs = null) => {
    const transactions = txs || walletTransactions;
    
    if (!transactions || transactions.length === 0) {
      setTransactionSummary({
        totalLoaned: "0.0000",
        totalRepaid: "0.0000",
        outstanding: "0.0000",
        nextPayment: "0.0000",
        loansCount: 0,
        paymentsCount: 0,
        paymentsLeft: 0
      });
      return;
    }
    
    const loaned = transactions
      .filter(tx => tx.type === 'loan')
      .reduce((acc, tx) => acc + parseFloat(tx.amount), 0);
      
    const repaid = transactions
      .filter(tx => tx.type === 'repayment')
      .reduce((acc, tx) => acc + parseFloat(tx.amount), 0);
    
    const loansCount = transactions.filter(tx => tx.type === 'loan').length;
    const paymentsCount = transactions.filter(tx => tx.type === 'repayment').length;
    
    // This is a placeholder calculation - in a real app you'd need to get this from your loan tracking system
    const outstanding = Math.max(0, loaned - repaid);
    const paymentsLeft = Math.ceil(outstanding / (repaid / paymentsCount || 1));
    const nextPayment = paymentsLeft > 0 ? (outstanding / paymentsLeft).toFixed(4) : "0.0000";
    
    setTransactionSummary({
      totalLoaned: loaned.toFixed(4),
      totalRepaid: repaid.toFixed(4),
      outstanding: outstanding.toFixed(4),
      nextPayment,
      loansCount,
      paymentsCount,
      paymentsLeft: isNaN(paymentsLeft) ? 0 : paymentsLeft
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'loan') {
      return (
        <div className="bg-blue-100 rounded-full p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="bg-green-100 rounded-full p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
  };

  // Handle retry when rate limited
  const handleRetry = () => {
    fetchWalletTransactions();
  };

  return (
    <HalfCircleBackground title="Transactions">
      <div className="pt-4">
        {/* Header Section */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-700">Recent Transactions</span>
            </div>
            <button 
              className={`${isLoadingHistory ? 'text-gray-400 cursor-not-allowed' : 'text-blue-700 hover:text-blue-800'}`}
              onClick={fetchWalletTransactions}
              disabled={isLoadingHistory}
            >
              {isLoadingHistory ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Transaction List */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold mb-4">Recent Transactions</h2>
          
          {isLoadingHistory ? (
            <div className="flex flex-col justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div>
              <p className="text-gray-600 mb-2">Loading transactions... {fetchProgress}%</p>
              <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-700 rounded-full transition-all duration-300" 
                  style={{ width: `${fetchProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {fetchProgress < 50 ? 
                  "Fetching from blockchain..." : 
                  "Processing transaction data..."}
              </p>
            </div>
          ) : fetchError ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{fetchError}</p>
              <button 
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-700 text-white rounded-full hover:bg-blue-800"
              >
                Try Again
              </button>
            </div>
          ) : walletTransactions.length > 0 ? (
            <div className="space-y-4">
              {walletTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between py-2 border-b border-gray-100 hover:bg-gray-50 rounded px-2"
                >
                  <div className="flex items-center">
                    {getTypeIcon(transaction.type)}
                    <div className="ml-3">
                      <p className="font-medium">{transaction.recipient}</p>
                      <p className="text-xs text-gray-500">
                        {transaction.date} at {transaction.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="font-medium">SOL {transaction.amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full mt-1 ${getStatusColor(transaction.status)}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {publicKey ? "No transactions found for this wallet" : "Connect your wallet to view transactions"}
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-bold mb-4">Transaction Summary</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-gray-500 mb-1">Total Loaned</p>
              <p className="text-xl font-bold mb-1">SOL {transactionSummary.totalLoaned}</p>
              <p className="text-green-500 text-sm">{transactionSummary.loansCount} loans</p>
            </div>
            
            <div className="text-center">
              <p className="text-gray-500 mb-1">Total Repaid</p>
              <p className="text-xl font-bold mb-1">SOL {transactionSummary.totalRepaid}</p>
              <p className="text-blue-700 text-sm">{transactionSummary.paymentsCount} payments</p>
            </div>
            
            <div className="text-center">
              <p className="text-gray-500 mb-1">Outstanding</p>
              <p className="text-xl font-bold mb-1">SOL {transactionSummary.outstanding}</p>
              <p className="text-yellow-500 text-sm">{transactionSummary.paymentsLeft} payments left</p>
            </div>
            
            <div className="text-center">
              <p className="text-gray-500 mb-1">Next Payment</p>
              <p className="text-xl font-bold mb-1">SOL {transactionSummary.nextPayment}</p>
              <p className="text-red-500 text-sm">Due soon</p>
            </div>
          </div>
        </div>

        {/* View All Button */}
        <button 
          onClick={fetchWalletTransactions}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 px-4 rounded-full font-medium flex items-center justify-center mb-6"
          disabled={isLoadingHistory}
        >
          {isLoadingHistory ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Loading...
            </>
          ) : (
            <>
              Refresh Transactions
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </>
          )}
        </button>
      </div>
    </HalfCircleBackground>
  );
};

export default TransactionsPage; 