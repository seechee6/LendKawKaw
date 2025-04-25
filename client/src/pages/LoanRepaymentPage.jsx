import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HalfCircleBackground } from '../components';
import { getLoanById, getUserPhoneNumber } from '../services/databaseService';
import { setupLoanReminders } from '../services/reminderService';
import { toast } from 'react-hot-toast';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { fetchUserActiveLoans, repayLoan } from '../utils/solanaLoanUtils';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const LoanRepaymentPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [loanDetails, setLoanDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSmsEnabled, setIsSmsEnabled] = useState(false);
  const [isUpdatingSms, setIsUpdatingSms] = useState(false);
  const [isBlockchainLoan, setIsBlockchainLoan] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);

  useEffect(() => {
    // First check if loan data was passed through location state
    if (location.state && location.state.loan) {
      const loan = location.state.loan;
      setLoanDetails({
        id: loan.id,
        amount: loan.monthlyPayment || loan.paymentAmount, 
        repaymentDate: loan.nextPaymentDate || new Date().toLocaleDateString('en-US', {
          month: 'short', 
          day: 'numeric', 
          year: 'numeric'
        }),
        loanId: loan.id || loan.loanId,
        period: loan.remainingPayments || loan.period,
        totalAmount: loan.monthlyPayment || loan.paymentAmount,
        principal: loan.amount || loan.principal,
        interest: (loan.amount * loan.interestRate / 100) || loan.interestAmount,
        borrowerId: loan.borrower || loan.borrowerId,
        smsRemindersEnabled: loan.smsRemindersEnabled || false,
        publicKey: loan.publicKey, // Blockchain loan information
        lender: loan.lender,
        isBlockchainLoan: !!loan.publicKey
      });
      
      setIsBlockchainLoan(!!loan.publicKey);
      setIsLoading(false);
      return;
    }
    
    // If no state was passed, try to fetch from blockchain or database
    const fetchLoanDetails = async () => {
      setIsLoading(true);
      try {
        // First try to get from blockchain if wallet is connected
        if (wallet.connected && connection) {
          try {
            const blockchainLoans = await fetchUserActiveLoans(connection, wallet);
            
            // Find the loan with matching ID
            const blockchainLoan = blockchainLoans.find(loan => loan.id === loanId || loan.publicKey === loanId);
            
            if (blockchainLoan) {
              setLoanDetails({
                id: blockchainLoan.id,
                amount: blockchainLoan.monthlyPayment,
                repaymentDate: blockchainLoan.startDate ? new Date(blockchainLoan.startDate.getTime() + 30*24*60*60*1000).toLocaleDateString('en-US', {
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric'
                }) : new Date().toLocaleDateString('en-US', {
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric'
                }),
                loanId: blockchainLoan.id,
                period: blockchainLoan.remainingPayments,
                totalAmount: blockchainLoan.monthlyPayment,
                principal: blockchainLoan.amount,
                interest: (blockchainLoan.amount * blockchainLoan.interestRate / 100),
                borrowerId: blockchainLoan.borrower,
                publicKey: blockchainLoan.publicKey,
                lender: blockchainLoan.lender,
                isBlockchainLoan: true
              });
              
              setIsBlockchainLoan(true);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching blockchain loans:", error);
          }
        }
        
        // Fallback to traditional database fetch
        const loanIdToFetch = loanId === 'all' ? '1' : loanId;
        const loan = await getLoanById(loanIdToFetch);
        
        if (loan) {
          setLoanDetails({
            id: loan.id,
            amount: loan.paymentAmount,
            repaymentDate: new Date(loan.nextPaymentDate).toLocaleDateString('en-US', {
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            }),
            loanId: loan.loanId,
            period: loan.period,
            totalAmount: loan.paymentAmount,
            principal: loan.principal,
            interest: loan.interestAmount,
            borrowerId: loan.borrowerId,
            smsRemindersEnabled: loan.smsRemindersEnabled || false,
            isBlockchainLoan: false
          });
          
          setIsSmsEnabled(loan.smsRemindersEnabled || false);
          
          // Fetch the user's phone number
          if (loan.borrowerId) {
            const phone = await getUserPhoneNumber(loan.borrowerId);
            setPhoneNumber(phone);
          }
        }
      } catch (error) {
        console.error("Error fetching loan details:", error);
        toast.error("Failed to load loan details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId, connection, wallet.connected, location.state, wallet]);

  const handlePayBills = async () => {
    if (isBlockchainLoan) {
      if (!wallet.connected) {
        toast.error("Please connect your wallet to pay this loan");
        return;
      }
      
      handleBlockchainRepayment();
    } else {
      // Navigate to the review summary page with the loan ID for traditional loans
      navigate(`/review-summary/${loanId}`);
    }
  };
  
  const handleBlockchainRepayment = async () => {
    if (!loanDetails || !loanDetails.publicKey) {
      toast.error("Loan details not available");
      return;
    }
    
    setIsRepaying(true);
    
    try {
      // Convert the amount from RM to SOL (661.62 RM = 1 SOL)
      const solAmount = loanDetails.amount / 661.62;
      console.log(`Converting ${loanDetails.amount} RM to ${solAmount.toFixed(4)} SOL for repayment`);
      
      // Use our utility to repay the loan
      const result = await repayLoan(
        connection,
        wallet,
        loanDetails.publicKey,
        solAmount, // Convert RM to SOL based on current exchange rate
        false // Not a platform fee
      );
      
      if (result.success) {
        toast.success("Payment sent successfully!");
        // Navigate to loan success page
        navigate('/loan-success', {
          state: {
            loanDetails: {
              ...loanDetails,
              title: loanDetails.loanTitle || "Loan Repayment",
              amount: loanDetails.amount || "0.00",
              totalAmount: loanDetails.totalAmount || loanDetails.amount,
              term: `${loanDetails.duration || "N/A"} months`,
              paymentAmount: loanDetails.amount,
              transactionSignature: result.signature,
              paymentSuccessful: true,
              solAmount: solAmount // Include the SOL amount for reference
            }
          }
        });
      } else {
        toast.error(result.message || "Payment failed");
      }
    } catch (error) {
      console.error("Error making blockchain payment:", error);
      toast.error("Payment transaction failed");
    } finally {
      setIsRepaying(false);
    }
  };

  const handleToggleSmsReminders = async () => {
    try {
      setIsUpdatingSms(true);
      const newSmsStatus = !isSmsEnabled;
      
      // Update the reminder settings
      const result = await setupLoanReminders(loanDetails.id, newSmsStatus);
      
      if (result.success) {
        setIsSmsEnabled(newSmsStatus);
        toast.success(result.message);
      } else {
        toast.error('Failed to update SMS reminder settings');
      }
    } catch (error) {
      console.error("Error toggling SMS reminders:", error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsUpdatingSms(false);
    }
  };

  if (isLoading || !loanDetails) {
    return (
      <HalfCircleBackground title="Loan Repayment">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      </HalfCircleBackground>
    );
  }

  return (
    <HalfCircleBackground title="Loan Repayment">
      <div className="max-w-lg mx-auto pt-1 w-full pb-8">
        {/* Blockchain indicator if applicable */}
        {isBlockchainLoan && (
          <div className="mb-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>This payment will be processed on the Solana blockchain</span>
          </div>
        )}
        
        {/* Wallet connection button for blockchain loans */}
        {isBlockchainLoan && !wallet.connected && (
          <div className="mb-4 flex justify-center">
            <WalletMultiButton />
          </div>
        )}
        
        {/* Loan Amount Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">RM {loanDetails.amount}</h2>
              <p className="text-gray-500 text-sm">Repayment Due Date: {loanDetails.repaymentDate}</p>
              <div className="flex items-center justify-center mt-2">
                <p className="text-gray-500 text-sm">Loan ID: {loanDetails.loanId}</p>
                <button className="ml-2 text-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-3">
                <p className="font-medium text-gray-800">Period {loanDetails.period}</p>
                <div className="flex items-center text-green-500 font-semibold">
                  RM {loanDetails.totalAmount}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <p className="text-gray-600">Principal Loan</p>
                  <p className="font-medium">RM {loanDetails.principal}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-600">Loan Interest</p>
                  <p className="font-medium">RM {loanDetails.interest}</p>
                </div>
              </div>

              <button 
                onClick={handlePayBills}
                disabled={isRepaying || (isBlockchainLoan && !wallet.connected)}
                className={`w-full ${isRepaying || (isBlockchainLoan && !wallet.connected) ? 'bg-gray-400 cursor-not-allowed' : 'bg-secondary hover:bg-green-600'} text-white py-3 rounded-lg font-medium transition-colors`}
              >
                {isRepaying ? 'Processing Payment...' : 'Pay Bills'}
              </button>
            </div>
          </div>
        </div>

        {/* SMS Reminder Toggle Section - Only show for non-blockchain loans */}
        {!isBlockchainLoan && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Reminders</h3>
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">
                  Receive SMS payment reminders
                </span>
                <div className="relative flex items-center">
                  <div 
                    onClick={!isUpdatingSms ? handleToggleSmsReminders : undefined}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ease-in-out duration-200 ${isSmsEnabled ? "bg-secondary" : "bg-gray-300"} ${isUpdatingSms ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isSmsEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 mt-2">
                {phoneNumber ? (
                  <p>We'll send reminders to <span className="font-medium">{phoneNumber}</span></p>
                ) : (
                  <p>Please add a phone number to receive SMS reminders</p>
                )}
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                {isSmsEnabled ? (
                  <ul className="list-disc list-inside">
                    <li>3 days before payment is due</li>
                    <li>1 day before payment is due</li>
                    <li>On the day payment is due</li>
                  </ul>
                ) : (
                  <p>Enable SMS reminders to receive notifications about upcoming payments.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-blue-700 font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
      </div>
    </HalfCircleBackground>
  );
};

export default LoanRepaymentPage;