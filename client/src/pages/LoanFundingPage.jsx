import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HalfCircleBackground } from '../components';
import { TransactionContext } from '../context/TransactionContext';

// UserCircleIcon component
const UserCircleIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// CalendarIcon component
const CalendarIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const LoanFundingPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAccount } = useContext(TransactionContext);
  const [loan, setLoan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch loan details or use passed loan data from location state
    const fetchLoanDetails = async () => {
      setIsLoading(true);
      try {
        if (location.state && location.state.loan) {
          // Use the loan data passed via navigation
          setLoan(location.state.loan);
        } else {
          // In a real app, this would fetch loan data from your API/blockchain
          // Simulate fetching data for the selected loan ID
          setTimeout(() => {
            // Mock loan details for demonstration
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
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching loan details:", error);
        setIsLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId, location]);

  const handleFund = () => {
    if (!currentAccount) {
      alert("Please connect your wallet first");
      return;
    }
    
    // Navigate to the review summary page with the loan ID
    navigate(`/funding-review/${loanId}`, { state: { loan }});
  };

  const getRiskColor = (risk) => {
    if (risk === 'low') return 'bg-green-500';
    if (risk === 'medium') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskText = (risk) => {
    if (risk === 'low') return 'Low';
    if (risk === 'medium') return 'Medium';
    return 'High';
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
        {/* Loan Amount Card */}
        <div className="bg-white p-5 rounded-lg shadow-sm mb-5">
          <div className="flex items-center mb-1">
            <UserCircleIcon className="text-gray-400 mr-1" />
            <span className="text-gray-600 text-sm">Loan request from {loan.borrowerName}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">RM {loan.requestedAmount}</h2>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center">
              <CalendarIcon className="text-gray-400 mr-1" />
              <span className="text-gray-500 text-sm">{loan.date}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${getRiskColor(loan.risk)}`}></div>
              <span className="text-gray-500 text-sm">{getRiskText(loan.risk)} Risk</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${getRiskColor(loan.risk)}`}></div>
              <p className="font-medium text-gray-800">
                {loan.risk === 'low' ? 'Low Risk' : loan.risk === 'medium' ? 'Medium Risk' : 'High Risk'}
              </p>
            </div>
            <div className="flex items-center text-secondary font-semibold">
              {loan.proposedInterest}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <p className="text-gray-600">Payment Term</p>
              <p className="font-medium">{loan.term}</p>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <p className="text-gray-600">Monthly Payment</p>
              <p className="font-medium">RM {loan.monthlyPayment}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-gray-600">Purpose</p>
              <p className="font-medium">{loan.purpose}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-gray-600">Credit Score</p>
              <p className="font-medium">{loan.creditScore}</p>
            </div>
          </div>

          <button 
            onClick={handleFund}
            className="w-full bg-secondary hover:bg-secondaryLight text-white py-3 rounded-lg font-medium transition-colors"
          >
            Fund This Loan
          </button>
        </div>

        {/* Back Button */}
        <button 
          onClick={() => navigate('/lend')}
          className="flex items-center text-secondary font-medium"
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