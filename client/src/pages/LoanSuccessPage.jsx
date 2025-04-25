import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiCheckCircle, HiUserGroup, HiClock } from 'react-icons/hi';

const LoanSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check for both loan and loanDetails in location.state
  const loan = location.state?.loan || location.state?.loanDetails || null;
  
  // If no loan data is found, create default data to prevent blank screen
  const defaultLoan = {
    title: "Loan Transaction",
    amount: "0.00",
    term: "N/A",
    monthlyPayment: "0.00",
    dueDate: "N/A",
    protectionFee: "0.00",
    loanAmount: "0.00",
    totalWithFees: "0.00",
    transactionSignature: "",
    paymentSuccessful: true
  };

  // Use provided loan data or fallback to default
  const loanData = loan || defaultLoan;
  const isPayment = loanData.paymentSuccessful || false;

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleViewLoan = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col items-center mt-10 min-h-screen bg-[#f8f7f3] p-4">
      <div className="max-w-md w-full relative">
        {/* Receipt Card */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden mt-6">
          {/* Status Icon */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-full p-4 bg-green-100">
              <div className="rounded-full p-3 bg-green-500">
                <HiCheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="pt-14 px-8 pb-6">
            <div className="text-center mb-6">
              <p className="font-medium mb-1 text-green-500">
                Success!
              </p>
              <h1 className="text-2xl font-bold text-gray-800">
                {isPayment ? 'Payment Completed' : 'Loan Application Submitted'}
              </h1>
              <p className="text-gray-500 text-sm mt-2">
                {isPayment 
                  ? 'Your payment has been processed successfully' 
                  : 'Your loan is now available for lenders'}
              </p>
            </div>

            {loanData.transactionSignature && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-start">
                <HiCheckCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700 mb-1">
                    Transaction confirmed on blockchain
                  </p>
                  <p className="text-xs text-gray-500 break-all">
                    Signature: {loanData.transactionSignature.substring(0, 16)}...
                  </p>
                  {loanData.solAmount && (
                    <p className="text-xs text-gray-500 mt-1">
                      Amount: {loanData.solAmount.toFixed(6)} SOL
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <p className="text-gray-500">Loan Type</p>
                <p className="text-gray-800 font-medium">{loanData.title}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-500">Term</p>
                <p className="text-gray-800 font-medium">{loanData.term}</p>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <p className="text-gray-500">Monthly Payment</p>
                <p className="text-gray-800 font-medium">RM {loanData.monthlyPayment || loanData.paymentAmount || "0.00"}/month</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-500">{isPayment ? 'Payment Date' : 'Final Payment'}</p>
                <p className="text-gray-800 font-medium">{loanData.dueDate || new Date().toLocaleDateString()}</p>
              </div>
              {loanData.protectionFee && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <p className="text-gray-500">Protection Fee</p>
                  <p className="text-gray-800 font-medium">RM {loanData.protectionFee}</p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <p className="text-gray-500">Status</p>
                <p className="font-medium text-green-500">
                  {isPayment ? 'Payment Confirmed' : 'Listed for Funding'}
                </p>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 py-4 mb-6">
              <div className="flex items-center justify-between py-3">
                <p className="text-gray-500">{isPayment ? 'Payment Amount' : 'Loan Amount'}</p>
                <p className="text-gray-800 font-medium">RM {loanData.amount || loanData.loanAmount || "0.00"}</p>
              </div>
              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm mb-1">Total {isPayment ? 'paid' : 'including fees'}</p>
                <p className="text-secondary text-2xl font-bold">RM {loanData.totalAmount || loanData.totalWithFees || loanData.amount || "0.00"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleViewLoan}
                className="w-full bg-secondary hover:bg-secondaryLight text-white py-3 rounded-full font-medium transition-colors"
              >
                View My Loans
              </button>
              <button
                onClick={handleBackToHome}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanSuccessPage; 