import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HalfCircleBackground } from '../components';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TransactionContext } from '../context/TransactionContext';

// Define translations directly
const translations = {
  sepoliaEth: 'SOL',
  wrongNetwork: 'Wrong Network',
  connecting: 'Connecting...',
  connectWallet: 'Connect Wallet',
  loadingBalance: 'Loading...',
  refresh: 'Refresh',
  howToWithdraw: 'How to withdraw',
  points: 'points',
  good: 'Good',
  updatedAfterRepayment: 'Updated after each repayment',
  makePayment: 'Make Payment',
  loanHistory: 'Loan History',
  more: 'More',
  loanSummary: 'Loan Summary',
  repaymentHistory: 'Repayment History',
  activeLoans: 'Active Loans',
  excellent: 'Excellent',
  currentBalance: 'Current Balance',
  nextPayment: 'Next Payment',
  maxLoanAmount: 'Max Loan Amount',
  seeFullHistory: 'See Full History',
  initialize: 'Initialize Storage'
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { connection } = useConnection();
  const { publicKey, connected, disconnect } = useWallet();
  const { initializeTransactionStorage, isLoading } = useContext(TransactionContext);
  
  const [isPremium] = useState(true); // In a real app, this would come from context/API
  const [walletBalance, setWalletBalance] = useState(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [storageInitialized, setStorageInitialized] = useState(false);

  useEffect(() => {
    // Check if transaction storage is already initialized
    const checkStorageInitialized = () => {
      const storageInitialized = localStorage.getItem('transactionStorageInitialized');
      setStorageInitialized(!!storageInitialized);
    };
    
    checkStorageInitialized();
    
    if (publicKey) {
      getWalletBalance(publicKey);
    }
  }, [publicKey, connection]);

  const handleInitializeStorage = async () => {
    try {
      await initializeTransactionStorage();
      setStorageInitialized(true);
    } catch (error) {
      console.error("Failed to initialize storage:", error);
    }
  };

  const getWalletBalance = async (address) => {
    try {
      if (!address) return;
      
      setIsBalanceLoading(true);
      
      try {
        const balance = await connection.getBalance(address);
        const formattedBalance = (balance / LAMPORTS_PER_SOL).toFixed(4);
        setWalletBalance(formattedBalance);
        setNetworkError(false);
      } catch (error) {
        console.error("Error fetching Solana balance:", error);
        setWalletBalance("Error");
        setNetworkError(true);
      }
      
      setIsBalanceLoading(false);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setWalletBalance("Error");
      setIsBalanceLoading(false);
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    const addressStr = address.toString();
    return addressStr.slice(0, 6) + '...' + addressStr.slice(-4);
  };

  return (
    <HalfCircleBackground title="Profile">
      <div className="pt-2">
      
        {/* Wallet Balance Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 mb-6 shadow-md text-white mt-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M19 7h-1V6a3 3 0 00-3-3H5a3 3 0 00-3 3v12a3 3 0 003 3h14a3 3 0 003-3v-8a3 3 0 00-3-3zm-8 3a2 2 0 100 4 2 2 0 000-4z" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm font-medium">{translations.sepoliaEth}</span>
              </div>
              {networkError && (
                <span className="text-xs bg-red-500 bg-opacity-20 px-2 py-0.5 rounded-full">
                  {translations.wrongNetwork}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {connected && (
                <button 
                  onClick={() => navigate('/withdraw-tutorial')}
                  className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 transition-all rounded-full py-1 px-2 flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {translations.howToWithdraw}
                </button>
              )}
              
              {connected ? (
                <button 
                  onClick={() => publicKey && getWalletBalance(publicKey)}
                  className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 transition-all rounded-full py-1 px-2 flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {translations.refresh}
                </button>
              ) : null}
            </div>
          </div>

          {connected && publicKey && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <div className="text-2xl font-bold">
                    {networkError ? translations.wrongNetwork : (
                      isBalanceLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-lg">{translations.loadingBalance}</span>
                        </div>
                      ) : (
                        `${walletBalance} SOL`
                      )
                    )}
                  </div>
                  <div className="text-xs opacity-80 mt-0.5 font-mono">
                    {formatAddress(publicKey)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Credit Score Section */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              {/* Circular progress bar */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#E5E7EB" 
                  strokeWidth="6"
                />
                {/* Progress circle - green */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#00A86B" 
                  strokeWidth="6"
                  strokeDasharray="280"
                  strokeDashoffset="85" 
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Score and triangle in center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="flex items-center text-sm font-medium text-green-600 mb-1">
                  <svg className="w-3 h-3 mr-1 fill-current" viewBox="0 0 24 24">
                    <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                  </svg>
                  +5 {translations.points}
                </div>
                <div className="text-5xl font-bold mb-1">725</div>
                <div className="text-gray-600 text-sm flex items-center">
                  {translations.good}
                  <svg className="w-4 h-4 ml-1 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4M12 8h.01" />
                  </svg>
                </div>
                
                <div className="absolute bottom-4 w-full flex justify-between px-4 text-xs text-gray-500">
                  <span>0</span>
                  <span>850</span>
                </div>
              </div>
            </div>
            
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {translations.updatedAfterRepayment}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mb-6">
          <div 
            className="flex flex-col items-center w-1/3 cursor-pointer"
            onClick={() => navigate('/make-payment')}
          >
            <div className="bg-white rounded-full p-4 shadow-sm mb-2 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v8m-4-4h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">{translations.makePayment}</span>
          </div>

          <div 
            className="flex flex-col items-center w-1/3 cursor-pointer"
            onClick={() => navigate('/loan-history')}
          >
            <div className="bg-white rounded-full p-4 shadow-sm mb-2 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">{translations.loanHistory}</span>
          </div>

          <div className="flex flex-col items-center w-1/3">
            {!storageInitialized && connected ? (
              <div 
                className="flex flex-col items-center cursor-pointer"
                onClick={handleInitializeStorage}
              >
                <div className="bg-white rounded-full p-4 shadow-sm mb-2 flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-xs text-gray-500">
                  {isLoading ? 'Initializing...' : translations.initialize}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="bg-white rounded-full p-4 shadow-sm mb-2 flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="5" cy="12" r="1" fill="currentColor" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                    <circle cx="19" cy="12" r="1" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-xs text-gray-500">{translations.more}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <svg className="w-5 h-5 mr-2 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-base font-bold">{translations.loanSummary}</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">{translations.repaymentHistory}</p>
              <p className="text-2xl font-bold mb-1">100%</p>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                <p className="text-sm text-gray-500">{translations.excellent}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">{translations.activeLoans}</p>
              <p className="text-2xl font-bold mb-1">1</p>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                <p className="text-sm text-gray-500">{translations.good}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">{translations.currentBalance}</p>
              <p className="text-2xl font-bold mb-1">RM 1,875</p>
              <div className="flex items-center justify-center">
                <span className="text-gray-500 text-xs">{translations.nextPayment}</span>
                <span className="text-xs ml-1">15 Apr</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">{translations.maxLoanAmount}</p>
              <p className="text-2xl font-bold mb-1">RM 5,000</p>
              <div>
                <span className="text-xs text-secondary">{translations.excellent}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/loan-history')}
            className="mt-6 w-full text-blue-500 text-center flex items-center justify-center"
          >
            {translations.seeFullHistory} →
          </button>
        </div>
      </div>
    </HalfCircleBackground>
  );
};

export default ProfilePage;