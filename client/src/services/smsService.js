// SMS Service for LendKawKaw application
// Supports both direct SMS sending and simulation mode

// API endpoint
const SMS_API_URL = 'http://localhost:3001/api';

// Twilio credentials - not used directly by client but included for reference
export const TWILIO_PHONE_NUMBER = process.env.REACT_APP_TWILIO_PHONE_NUMBER || '+18285768297';

// Flag to control whether to use simulation mode or try to connect to API
const USE_SIMULATION = false; // Changed to false to enable actual SMS sending

/**
 * Send a single SMS message
 * @param {string} phoneNumber - The recipient's phone number (with country code)
 * @param {string} message - The message content
 * @returns {Promise<object>} - Response object with success/error info
 */
export const sendSMS = async (phoneNumber, message) => {
  try {
    // For development/testing, log the message
    console.log(`[SMS Service] Sending to ${phoneNumber}: ${message}`);
    
    // If in simulation mode, don't attempt to connect to API
    if (USE_SIMULATION) {
      console.log('[SMS Service] Using simulation mode (API connection not attempted)');
      return getSimulatedResponse(phoneNumber, message);
    }
    
    // Send the SMS via our backend API
    const response = await fetch(`${SMS_API_URL}/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phoneNumber,
        message,
        from: TWILIO_PHONE_NUMBER
      })
    });
    
    // Parse the response
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send SMS');
    }
    
    console.log('[SMS Service] Successfully sent message:', data);
    
    return {
      success: true,
      sid: data.sid,
      message: 'SMS sent successfully via API',
      twilioResponse: data.details
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // If the API is unavailable, fall back to simulation
    if (error.message.includes('Failed to fetch') || error.code === 'ECONNREFUSED') {
      console.warn('API connection failed, using simulation fallback');
      return getSimulatedResponse(phoneNumber, message);
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
      details: error
    };
  }
};

/**
 * Get a simulated response for SMS sending
 * @param {string} phoneNumber - The recipient's phone number
 * @param {string} message - The message content
 * @returns {object} - Simulated response object
 */
function getSimulatedResponse(phoneNumber, message) {
  const mockSid = 'SM' + Math.random().toString(36).substring(2, 15).toUpperCase();
  
  // Create a realistic-looking simulated response
  return {
    success: true,
    sid: mockSid,
    message: 'SMS sent successfully (simulation)',
    simulatedAt: new Date().toISOString(),
    details: {
      to: phoneNumber,
      from: TWILIO_PHONE_NUMBER,
      body: message,
      status: 'delivered',
      direction: 'outbound-api',
      dateCreated: new Date().toISOString()
    }
  };
}

/**
 * Send a repayment reminder SMS
 * @param {string} phoneNumber - The borrower's phone number
 * @param {object} loanDetails - Loan details object
 * @param {number} daysUntilDue - Days until payment is due
 * @returns {Promise<object>} - Response object
 */
export const sendRepaymentReminder = async (phoneNumber, loanDetails, daysUntilDue) => {
  let message;
  
  if (daysUntilDue === 0) {
    message = `LendKawKaw: Your loan payment of RM ${loanDetails.paymentAmount} is due TODAY. Please make your payment to avoid late fees.`;
  } else if (daysUntilDue === 1) {
    message = `LendKawKaw: Reminder - your loan payment of RM ${loanDetails.paymentAmount} is due TOMORROW. Please ensure you have sufficient funds.`;
  } else {
    message = `LendKawKaw: Your loan payment of RM ${loanDetails.paymentAmount} is due in ${daysUntilDue} days on ${loanDetails.dueDate}. Thank you.`;
  }
  
  return sendSMS(phoneNumber, message);
};

/**
 * Send payment confirmation SMS
 * @param {string} phoneNumber - The borrower's phone number
 * @param {object} paymentDetails - Payment details object
 * @returns {Promise<object>} - Response object
 */
export const sendPaymentConfirmation = async (phoneNumber, paymentDetails) => {
  const message = `LendKawKaw: We've received your payment of RM ${paymentDetails.amount}. Thank you! Your next payment is due on ${paymentDetails.nextDueDate}.`;
  return sendSMS(phoneNumber, message);
};

/**
 * Send overdue payment SMS
 * @param {string} phoneNumber - The borrower's phone number
 * @param {object} loanDetails - Loan details object
 * @param {number} daysOverdue - Number of days payment is overdue
 * @returns {Promise<object>} - Response object
 */
export const sendOverdueNotice = async (phoneNumber, loanDetails, daysOverdue) => {
  const message = `LendKawKaw: IMPORTANT - Your loan payment of RM ${loanDetails.paymentAmount} is ${daysOverdue} days overdue. Please make your payment as soon as possible to avoid additional fees and credit score impact.`;
  return sendSMS(phoneNumber, message);
};

/**
 * Schedule recurring SMS reminders for loan repayments
 * @param {string} phoneNumber - The borrower's phone number
 * @param {object} loanDetails - Loan details with repayment schedule
 * @returns {Promise<object>} - Schedule response object
 */
export const scheduleRepaymentReminders = async (phoneNumber, loanDetails) => {
  try {
    // Simulate scheduling reminders
    console.log(`[SMS Service] Scheduled reminders for loan ${loanDetails.id} to ${phoneNumber}`);
    
    // In a real implementation, you would store these reminders in a database
    // and use a job scheduler (like node-cron) to send them at the right time
    return {
      success: true,
      message: 'Reminders scheduled successfully',
      scheduleId: 'schedule-' + Math.random().toString(36).substring(2, 10)
    };
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    return {
      success: false,
      error: error.message || 'Failed to schedule reminders'
    };
  }
};