import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HalfCircleBackground } from '../components';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { fetchLoanFromChain } from '../services/solanaService';
import { toast } from 'react-hot-toast';

const LoanFundingPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const [loan, setLoan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlockchainLoan, setIsBlockchainLoan] = useState(false);
  const [loanPublicKey, setLoanPublicKey] = useState(null);
  const [borrowerPublicKey, setBorrowerPublicKey] = useState(null);

  useEffect(() => {
    const fetchLoanDetails = async () => {
      setIsLoading(true);
      try {
        // Check if loan data was passed via location state
        if (location.state && location.state.loan) {
          setLoan(location.state.loan);
          
          // Check if this is a blockchain loan
          if (location.state.isBlockchainLoan) {
            setIsBlockchainLoan(true);
            setLoanPublicKey(location.state.loanPublicKey);
            setBorrowerPublicKey(location.state.borrowerPublicKey);
            
            // If we have a connection, fetch the latest loan data from the blockchain
            if (connection && location.state.loanPublicKey) {
              try {
                const blockchainLoan = await fetchLoanFromChain(connection, location.state.loanPublicKey);
                console.log("Blockchain loan details:", blockchainLoan);
                // Merge the fetched data with the existing data to get the best of both
                setLoan(prev => ({
                  ...prev,
                  ...blockchainLoan,
                  // Keep UI-friendly properties from the previous data
                  requestedAmount: blockchainLoan.amount,
                  proposedInterest: `${blockchainLoan.interestRate}%`,
                  term: `${blockchainLoan.duration} months`,
                  title: prev.title || 'Loan Application'
                }));
              } catch (error) {
                console.error("Error fetching blockchain loan details:", error);
                toast.error("Could not fetch the latest blockchain data for this loan");
              }
            }
          }
        } else {
          // Fallback to mock data if no loan was passed
          setTimeout(() => {
            const mockLoan = {
              id: loanId,
              title: 'Small Business Loan',
              borrower: '0x7e...1A3b',
              requestDate: 'Mar 19, 2024',
              requestedAmount: '45,000',
              monthlyPayment: '5,000',
              purpose: 'Business Expansion',
              proposedInterest: '8.5%',
              term: '12 months',
              risk: 'low',
              collateralOffered: 'Business Equipment',
              creditScore: '720',
              status: 'pending',
              loanId: `LOAN-${loanId}`,
            };
            setLoan(mockLoan);
          }, 1000);
        }
      } catch (error) {
        console.error("Error fetching loan details:", error);
        toast.error("Failed to load loan details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId, location, connection]);

  const handleFund = () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    // Pass blockchain information if this is a blockchain loan
    if (isBlockchainLoan) {
      navigate(`/funding-review/${loanId}`, { 
        state: { 
          loan,
          isBlockchainLoan,
          loanPublicKey,
          borrowerPublicKey
        }
      });
    } else {
      navigate(`/funding-review/${loanId}`, { state: { loan }});
    }
  };

  const getRiskColor = (risk) => {
    if (!risk) return 'bg-blue-500';
    if (risk === 'low') return 'bg-green-500';
    if (risk === 'medium') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading || !loan) {
    return (
      <HalfCircleBackground title="Loan Funding">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
        </div>
      </HalfCircleBackground>
    );
  }

  return (
    <HalfCircleBackground title="Loan Funding">
      <div className="max-w-lg mx-auto pt-1 w-full pb-8">
        {/* Blockchain indicator for blockchain loans */}
        {isBlockchainLoan && (
          <div className="mb-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>This loan is stored on the Solana blockchain</span>
          </div>
        )}
        
        {/* Wallet connection reminder */}
        {!connected && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <p className="text-yellow-800 mb-3">Connect your wallet to fund this loan</p>
            <WalletMultiButton className="w-full flex justify-center" />
          </div>
        )}
      
        {/* Loan Amount Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">RM {loan.requestedAmount || loan.amount}</h2>
              <p className="text-gray-500 text-sm mt-2">
                Loan Request from {loan.borrower}
              </p>
              <div className="flex items-center justify-center mt-2">
                <p className="text-gray-500 text-sm">
                  {isBlockchainLoan ? 'Blockchain ID:' : 'Loan ID:'} {isBlockchainLoan ? loanPublicKey.substring(0, 8) + '...' : loan.id}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              {loan.risk && (
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${getRiskColor(loan.risk)}`} />
                    <p className="font-medium text-gray-800">
                      {loan.risk.charAt(0).toUpperCase() + loan.risk.slice(1)} Risk
                    </p>
                  </div>
                  <div className="flex items-center text-green-500 font-semibold">
                    {loan.proposedInterest}
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <p className="text-gray-600">Payment Term</p>
                  <p className="font-medium">{loan.term}</p>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <p className="text-gray-600">Monthly Payment</p>
                  <p className="font-medium">
                    RM {loan.monthlyPayment || Math.round(parseFloat(loan.amount) / parseInt(loan.duration))}
                  </p>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <p className="text-gray-600">Purpose</p>
                  <p className="font-medium">{loan.purpose || loan.description || 'Not specified'}</p>
                </div>
                {loan.creditScore && (
                  <div className="flex justify-between">
                    <p className="text-gray-600">Credit Score</p>
                    <p className="font-medium">{loan.creditScore}</p>
                  </div>
                )}
              </div>

              <button 
                onClick={handleFund}
                disabled={!connected}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  connected 
                    ? 'bg-secondary hover:bg-secondaryLight text-white' 
                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                }`}
              >
                {connected ? 'Fund This Loan' : 'Connect Wallet to Fund'}
              </button>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button 
          onClick={() => navigate('/lend')}
          className="flex items-center text-blue-700 font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Loan Applications
        </button>
      </div>
    </HalfCircleBackground>
  );
};

export default LoanFundingPage;