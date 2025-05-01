import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HalfCircleBackground } from '../components';
import { FiChevronDown, FiChevronUp, FiLock, FiInfo } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { HiOutlineEye, HiOutlineUser, HiOutlineCash, HiOutlineCalendar, HiOutlineBadgeCheck, HiOutlineChartBar, HiOutlineLightningBolt, HiOutlineSparkles } from 'react-icons/hi';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { Program, AnchorProvider } from '@project-serum/anchor';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import idl from '../idl/idl.json';

// Use program ID from environment variable
const programID = new PublicKey(import.meta.env.VITE_PROGRAM_ID || "DAyqZYocAeQd8ApqkoyYQuLG8dcYv3JDwehxbaxmwZ1n");

const LendPage = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const navigate = useNavigate();
  const [loanApplications, setLoanApplications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'low-risk', 'low-amount'
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});
  const [showingInsights, setShowingInsights] = useState({});
  const [isPremium] = useState(true); // In a real app, this would come from a context or API
  
  // Fetch loans when component mounts or connection changes
  useEffect(() => {
    fetchLoanApplications();
    
    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchLoanApplications(false); // Pass false to not show loading indicator for auto-refresh
    }, 30000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [connection]);

  const fetchLoanApplications = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }
    
    try {
      // Only fetch blockchain loans if connection is available
      if (connection) {
        try {
          console.log('Fetching available loans from blockchain...');
          
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
          console.log('All loan accounts found:', allLoanAccounts.length);
          
          // Filter for available loans (not active and not completed)
          const blockchainLoans = allLoanAccounts
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
          
          console.log("Available blockchain loans:", blockchainLoans);
          
          // Transform blockchain loan data to match our UI format
          const loans = blockchainLoans.map(loan => ({
            id: loan.id,
            publicKey: loan.publicKey, // We'll need this to fund the loan
            title: loan.description || 'Loan Application',
            borrower: loan.borrower,
            requestDate: new Date().toLocaleDateString(),
            requestedAmount: parseFloat(loan.amount) * 661.62, // Convert SOL to RM (1 SOL = 661.62 RM)
            solAmount: parseFloat(loan.amount), // Keep the original SOL amount
            monthlyPayment: (parseFloat(loan.amount) * 661.62 / parseInt(loan.duration)).toFixed(2), // Calculate in RM
            purpose: loan.description,
            proposedInterest: `${loan.interestRate}%`,
            term: `${loan.duration} months`,
            risk: calculateRiskLevel(loan.interestRate),
            creditScore: '---', // Not available from blockchain
            status: 'pending',
            isBlockchainLoan: true, // Flag to indicate this is a blockchain loan
            // Simulated premium insights
            riskScore: calculateRiskScore(loan.interestRate),
            onTimePayment: 95,
            previousLoans: 1,
            estimatedROI: parseFloat(loan.interestRate),
          }));
          
          setLoanApplications(loans);
        } catch (error) {
          console.error("Error fetching blockchain loans:", error);
          if (showLoader) {
            toast.error("Failed to fetch blockchain loans");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching loan applications:", error);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };
  
  // Helper functions to calculate risk levels
  const calculateRiskLevel = (interestRate) => {
    const rate = parseFloat(interestRate);
    if (rate <= 5) return 'low';
    if (rate <= 8) return 'medium';
    return 'high';
  };
  
  const calculateRiskScore = (interestRate) => {
    const rate = parseFloat(interestRate);
    return Math.min(Math.round(rate * 10), 100);
  };

  const handleFund = (loan) => {
    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    // For blockchain loans, pass the loan public key
    if (loan.publicKey) {
      navigate(`/fund/${loan.id}`, { 
        state: { 
          loan,
          isBlockchainLoan: true,
          loanPublicKey: loan.publicKey,
          borrowerPublicKey: loan.borrower
        }
      });
    } else {
      // For non-blockchain loans, pass the loan data as before
      navigate(`/fund/${loan.id}`, { state: { loan } });
    }
  };

  const toggleCardExpand = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleInsights = (id) => {
    setShowingInsights(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredApplications = loanApplications.filter(loan => {
    if (filter === 'all') return true;
    if (filter === 'low-risk') return loan.risk === 'low';
    if (filter === 'low-amount') {
      // Sort by amount would happen in the sort function below
      return true;
    }
    return true;
  }).sort((a, b) => {
    if (filter === 'low-amount') {
      // Handle different formats for amount
      const getAmount = (loan) => {
        if (typeof loan.requestedAmount === 'string' && loan.requestedAmount.includes(',')) {
          return parseInt(loan.requestedAmount.replace(/,/g, ''));
        }
        return parseFloat(loan.requestedAmount || 0);
      };
      
      return getAmount(a) - getAmount(b);
    }
    return 0;
  });

  return (
    <HalfCircleBackground title="Loan Applications">
      <div className="pt-2 max-w-lg mx-auto w-full pb-20">
        <p className="text-white text-opacity-80 mb-6">Review and fund loan requests from borrowers.</p>

        {!publicKey ? (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 text-center">
            <p className="mb-4">Connect your wallet to start lending</p>
            <WalletMultiButton/>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
              <div className="flex space-x-2 overflow-x-auto py-2 scrollbar-hide w-full sm:w-auto">
                <button 
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shadow-sm ${filter === 'all' ? 'bg-secondary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setFilter('all')}
                >
                  All Applications
                </button>
                <button 
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shadow-sm ${filter === 'low-risk' ? 'bg-secondary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setFilter('low-risk')}
                >
                  Low Risk
                </button>
                <button 
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shadow-sm ${filter === 'low-amount' ? 'bg-secondary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setFilter('low-amount')}
                >
                  Low Amount
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-6 text-center">
                <p>No loan applications available at the moment.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {filteredApplications.map((loan, index) => (
                  <div key={loan.id} className="relative">
                    {/* Card container */}
                    <div className="bg-white rounded-xl shadow-sm mb-4 relative">
                      {!showingInsights[loan.id] ? (
                        // Front of card - Main loan details
                        <div className="p-4">
                          {/* Card Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-800">{loan.title}</h3>
                            </div>
                            <button 
                              onClick={() => handleFund(loan)}
                              className="bg-secondary hover:bg-secondaryLight text-white px-5 py-2 rounded-full text-sm font-medium transition-colors"
                            >
                              Fund
                            </button>
                          </div>

                          {/* Card Basic Info - Always Visible */}
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <p className="text-sm text-gray-500">Requested Amount</p>
                              <p className="text-xl font-semibold text-secondary">RM {typeof loan.requestedAmount === 'number' ? loan.requestedAmount.toFixed(2) : loan.requestedAmount}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Monthly Payment</p>
                              <p className="text-xl font-semibold text-secondary">RM {loan.monthlyPayment}</p>
                            </div>
                          </div>
                          
                          {/* Risk Indicator and Premium Insights Button */}
                          <div className="mt-3 flex items-center">
                            <div className="w-2 h-2 rounded-full mr-1" style={{ 
                              backgroundColor: loan.risk === 'low' ? '#10B981' : loan.risk === 'medium' ? '#F59E0B' : '#EF4444' 
                            }}></div>
                            <span className="text-xs text-gray-500">
                              {loan.risk === 'low' ? 'Low Risk' : loan.risk === 'medium' ? 'Medium Risk' : 'High Risk'}
                            </span>
                            
                            {/* Premium insights button */}
                            {isPremium && (
                              <button 
                                onClick={() => toggleInsights(loan.id)}
                                className="ml-auto flex items-center bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                              >
                                <HiOutlineSparkles className="mr-1" /> Insights
                              </button>
                            )}
                            
                            {/* Premium lock for non-premium users */}
                            {!isPremium && (
                              <Link 
                                to="/premium"
                                className="ml-auto flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium transition-colors"
                              >
                                <FiLock className="mr-1" />
                                Unlock Insights
                              </Link>
                            )}
                          </div>
                          
                          {/* Expand/Collapse Button */}
                          <button 
                            onClick={() => toggleCardExpand(loan.id)}
                            className="w-full flex items-center justify-center mt-3 pt-2 text-gray-500 hover:text-gray-700 focus:outline-none border-t border-gray-100"
                          >
                            {expandedCards[loan.id] ? (
                              <>
                                <span className="text-xs mr-1">Show less</span>
                                <FiChevronUp size={14} />
                              </>
                            ) : (
                              <>
                                <span className="text-xs mr-1">Show details</span>
                                <FiChevronDown size={14} />
                              </>
                            )}
                          </button>
                          
                          {/* Card Detailed Info - Only Visible When Expanded */}
                          {expandedCards[loan.id] && (
                            <div className="mt-3 pt-2 border-t border-gray-100 animate-fadeIn">
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <p className="text-sm text-gray-500">Proposed Interest</p>
                                  <p className="text-md font-medium text-gray-700">{loan.proposedInterest}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Term</p>
                                  <p className="text-md font-medium text-gray-700">{loan.term}</p>
                                </div>
                              </div>
                              
                              {/* Lender Protection Fee Disclaimer - Now positioned below the term section */}
                              <div className="mb-4 mt-1 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                                <div className="flex items-start">
                                  <FiInfo className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" size={16} />
                                  <div>
                                    <h4 className="font-medium text-blue-700 text-xs">Lender Protection Notice</h4>
                                    <p className="text-blue-600 text-xs mt-0.5">A 5% protection fee will be deducted from the loan amount before disbursement to protect you in case of default.</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-gray-500">Purpose</p>
                                  <p className="text-md font-medium text-gray-700">{loan.purpose}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Credit Score</p>
                                  <p className="text-md font-medium text-gray-700">{loan.creditScore || 'Not Available'}</p>
                                </div>
                              </div>
                              
                              <div className="mt-2 text-xs text-gray-500">
                                <p>Loan ID: {loan.id}</p>
                                <p className="truncate">Borrower: {loan.borrower}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Back of the card - Premium Insights
                        <div className="bg-gradient-to-br from-slate-50 to-purple-50 p-4 rounded-xl">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold flex items-center">
                              <HiOutlineBadgeCheck className="text-purple-600 mr-2" /> 
                              Premium Insights
                            </h3>
                            <button 
                              onClick={() => toggleInsights(loan.id)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-gray-700">
                                <HiOutlineChartBar className="mr-2 text-purple-600" /> Risk Score
                              </div>
                              <div className="flex items-center">
                                <div className="h-2 w-28 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${loan.riskScore < 30 ? 'bg-green-500' : loan.riskScore < 70 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                    style={{ width: `${loan.riskScore}%` }}
                                  ></div>
                                </div>
                                <span className="ml-2 text-sm font-medium">{loan.riskScore}%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-gray-700">
                                <HiOutlineLightningBolt className="mr-2 text-purple-600" /> On-time Payment
                              </div>
                              <span className="font-medium">{loan.onTimePayment || '96'}%</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-gray-700">
                                <HiOutlineEye className="mr-2 text-purple-600" /> Previous Loans
                              </div>
                              <span className="font-medium">{loan.previousLoans || '2'} loans</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-gray-700">
                                <HiOutlineCash className="mr-2 text-purple-600" /> Est. ROI
                              </div>
                              <span className="font-medium text-green-600">{loan.estimatedROI || (parseFloat(loan.proposedInterest) - 2)}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </HalfCircleBackground>
  );
};

export default LendPage;