import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HalfCircleBackground } from '../components';
import { getLoanById, getUserPhoneNumber } from '../services/databaseService';
import { setupLoanReminders } from '../services/reminderService';
import { toast } from 'react-hot-toast';

const LoanRepaymentPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const [loanDetails, setLoanDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSmsEnabled, setIsSmsEnabled] = useState(false);
  const [isUpdatingSms, setIsUpdatingSms] = useState(false);

  useEffect(() => {
    // Fetch loan details from our database service
    const fetchLoanDetails = async () => {
      setIsLoading(true);
      try {
        // In production, handle the "all" case separately for bulk payments
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
            smsRemindersEnabled: loan.smsRemindersEnabled || false
          });
          
          setIsSmsEnabled(loan.smsRemindersEnabled || false);
          
          // Fetch the user's phone number
          if (loan.borrowerId) {
            const phone = await getUserPhoneNumber(loan.borrowerId);
            setPhoneNumber(phone);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching loan details:", error);
        setIsLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId]);

  const handlePayBills = () => {
    // Navigate to the review summary page with the loan ID
    navigate(`/review-summary/${loanId}`);
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
                className="w-full bg-secondary hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Pay Bills
              </button>
            </div>
          </div>
        </div>

        {/* SMS Reminder Toggle Section */}
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