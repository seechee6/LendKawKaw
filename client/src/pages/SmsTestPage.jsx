import React, { useState, useEffect } from 'react';
import { HalfCircleBackground } from '../components';
import { toast } from 'react-hot-toast';
import { getUserPhoneNumber, updateUserPhoneNumber } from '../services/databaseService';
import { sendSMS, sendRepaymentReminder, sendPaymentConfirmation, sendOverdueNotice, TWILIO_PHONE_NUMBER } from '../services/smsService';
import { sendUpcomingPaymentReminders, sendOverduePaymentReminders, setupLoanReminders } from '../services/reminderService';

const SmsTestPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [userId, setUserId] = useState('1'); // Default user ID
  const [loanId, setLoanId] = useState('1'); // Default loan ID
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [activeTab, setActiveTab] = useState('single'); // 'single', 'templates', 'batch'
  
  useEffect(() => {
    // Try to fetch user's phone number
    const fetchPhoneNumber = async () => {
      try {
        const phone = await getUserPhoneNumber(userId);
        if (phone) {
          setPhoneNumber(phone);
        }
      } catch (error) {
        console.error("Error fetching phone number:", error);
      }
    };
    
    fetchPhoneNumber();
  }, [userId]);
  
  // Function to send a single test SMS
  const handleSendTestSMS = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    
    if (!testMessage) {
      toast.error('Please enter a message to send');
      return;
    }
    
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const result = await sendSMS(phoneNumber, testMessage);
      setTestResult(result);
      
      if (result.success) {
        toast.success('Test SMS sent successfully');
      } else {
        toast.error('Failed to send test SMS');
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast.error('Error: ' + (error.message || 'Unknown error'));
      setTestResult({ success: false, error: error.message || 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to send a template SMS
  const handleSendTemplateSMS = async (template) => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    
    setIsLoading(true);
    setTestResult(null);
    
    try {
      let result;
      
      // Sample loan data for testing
      const loanDetails = {
        id: loanId,
        paymentAmount: 2500,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-MY', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      };
      
      // Sample payment data for testing
      const paymentDetails = {
        amount: 2500,
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-MY', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      };
      
      switch (template) {
        case 'reminder':
          result = await sendRepaymentReminder(phoneNumber, loanDetails, 3);
          break;
        case 'tomorrow':
          result = await sendRepaymentReminder(phoneNumber, loanDetails, 1);
          break;
        case 'today':
          result = await sendRepaymentReminder(phoneNumber, loanDetails, 0);
          break;
        case 'confirmation':
          result = await sendPaymentConfirmation(phoneNumber, paymentDetails);
          break;
        case 'overdue':
          result = await sendOverdueNotice(phoneNumber, loanDetails, 5);
          break;
        default:
          throw new Error('Unknown template');
      }
      
      setTestResult(result);
      
      if (result.success) {
        toast.success(`Template SMS (${template}) sent successfully`);
      } else {
        toast.error(`Failed to send template SMS (${template})`);
      }
    } catch (error) {
      console.error(`Error sending template SMS (${template}):`, error);
      toast.error('Error: ' + (error.message || 'Unknown error'));
      setTestResult({ success: false, error: error.message || 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to test batch SMS features
  const handleTestBatchFunction = async (functionName) => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      let result;
      
      switch (functionName) {
        case 'upcoming':
          result = await sendUpcomingPaymentReminders(3);
          break;
        case 'overdue':
          result = await sendOverduePaymentReminders();
          break;
        case 'setup':
          result = await setupLoanReminders(loanId, true);
          break;
        case 'disable':
          result = await setupLoanReminders(loanId, false);
          break;
        default:
          throw new Error('Unknown batch function');
      }
      
      setTestResult(result);
      
      if (result.success) {
        toast.success(`Batch function (${functionName}) executed successfully`);
      } else {
        toast.error(`Failed to execute batch function (${functionName})`);
      }
    } catch (error) {
      console.error(`Error executing batch function (${functionName}):`, error);
      toast.error('Error: ' + (error.message || 'Unknown error'));
      setTestResult({ success: false, error: error.message || 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to update phone number
  const handleUpdatePhoneNumber = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    
    if (!phoneNumber.startsWith('+')) {
      toast.error('Please enter a phone number with country code (e.g., +60)');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await updateUserPhoneNumber(userId, phoneNumber);
      
      if (result.success) {
        toast.success('Phone number updated successfully');
      } else {
        toast.error('Failed to update phone number');
      }
    } catch (error) {
      console.error('Error updating phone number:', error);
      toast.error('Error: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <HalfCircleBackground title="SMS Test Console">
      <div className="max-w-lg mx-auto pt-1 w-full pb-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">SMS Testing</h2>
            
            {/* Settings Section */}
            <div className="mb-6 border-b pb-6">
              <h3 className="text-lg font-medium mb-3">Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number (with country code)
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+601234567890"
                      className="flex-1 rounded-md border-gray-300 shadow-sm px-4 py-2 focus:ring-secondary focus:border-secondary"
                    />
                    <button
                      onClick={handleUpdatePhoneNumber}
                      disabled={isLoading}
                      className="ml-2 px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondaryLight transition-colors disabled:bg-gray-300"
                    >
                      Save
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm px-4 py-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loan ID
                    </label>
                    <input
                      type="text"
                      value={loanId}
                      onChange={(e) => setLoanId(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm px-4 py-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex border-b mb-6">
              <button
                className={`py-2 px-4 font-medium ${activeTab === 'single' ? 'text-secondary border-b-2 border-secondary' : 'text-gray-500'}`}
                onClick={() => setActiveTab('single')}
              >
                Single SMS
              </button>
              <button
                className={`py-2 px-4 font-medium ${activeTab === 'templates' ? 'text-secondary border-b-2 border-secondary' : 'text-gray-500'}`}
                onClick={() => setActiveTab('templates')}
              >
                Templates
              </button>
              <button
                className={`py-2 px-4 font-medium ${activeTab === 'batch' ? 'text-secondary border-b-2 border-secondary' : 'text-gray-500'}`}
                onClick={() => setActiveTab('batch')}
              >
                Batch Functions
              </button>
            </div>
            
            {/* Single SMS Tab */}
            {activeTab === 'single' && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Message
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter your test message here..."
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:ring-secondary focus:border-secondary"
                  />
                </div>
                
                <button
                  onClick={handleSendTestSMS}
                  disabled={isLoading}
                  className="w-full bg-secondary hover:bg-secondaryLight text-white py-3 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                >
                  {isLoading ? 'Sending...' : 'Send Test SMS'}
                </button>
              </div>
            )}
            
            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleSendTemplateSMS('reminder')}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    3-Day Payment Reminder
                  </button>
                  
                  <button
                    onClick={() => handleSendTemplateSMS('tomorrow')}
                    disabled={isLoading}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    1-Day Payment Reminder
                  </button>
                  
                  <button
                    onClick={() => handleSendTemplateSMS('today')}
                    disabled={isLoading}
                    className="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    Due Today Reminder
                  </button>
                  
                  <button
                    onClick={() => handleSendTemplateSMS('confirmation')}
                    disabled={isLoading}
                    className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    Payment Confirmation
                  </button>
                  
                  <button
                    onClick={() => handleSendTemplateSMS('overdue')}
                    disabled={isLoading}
                    className="bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    Overdue Payment Notice
                  </button>
                </div>
              </div>
            )}
            
            {/* Batch Functions Tab */}
            {activeTab === 'batch' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleTestBatchFunction('upcoming')}
                    disabled={isLoading}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    Send All Upcoming Reminders
                  </button>
                  
                  <button
                    onClick={() => handleTestBatchFunction('overdue')}
                    disabled={isLoading}
                    className="bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    Send All Overdue Notices
                  </button>
                  
                  <button
                    onClick={() => handleTestBatchFunction('setup')}
                    disabled={isLoading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    Enable Reminders for Loan
                  </button>
                  
                  <button
                    onClick={() => handleTestBatchFunction('disable')}
                    disabled={isLoading}
                    className="bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    Disable Reminders for Loan
                  </button>
                </div>
              </div>
            )}
            
            {/* Results Area */}
            {testResult && (
              <div className="mt-6 p-4 rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium mb-2">
                  {testResult.success ? (
                    <span className="text-green-600">Success</span>
                  ) : (
                    <span className="text-red-600">Error</span>
                  )}
                </h3>
                {testResult.twilioResponse && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-700 font-medium">Real SMS sent via Twilio!</p>
                    <p className="text-green-600">SID: {testResult.sid}</p>
                  </div>
                )}
                {testResult.twilioError && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700 font-medium">Twilio Error (Simulation Used)</p>
                    <p className="text-yellow-600">{testResult.twilioError}</p>
                  </div>
                )}
                <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-100 p-3 rounded overflow-auto max-h-60">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Info Box */}
            <div className="mt-8 p-4 rounded-lg bg-blue-50 text-sm text-blue-700">
              <h4 className="font-medium mb-2">SMS Testing With Twilio:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Your Twilio account is configured and ready to use</li>
                <li>Phone number: {TWILIO_PHONE_NUMBER}</li>
                <li>When sending SMS, ensure the recipient's number has the country code</li>
                <li>If Twilio fails, the system will fall back to simulation mode</li>
                <li>Check your browser console for detailed logs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </HalfCircleBackground>
  );
};

export default SmsTestPage;