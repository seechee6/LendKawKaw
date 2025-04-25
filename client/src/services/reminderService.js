// Reminder Service for LendKawKaw application
// Handles scheduling and sending reminders for loan repayments

import { 
  getLoansWithUpcomingPayments,
  getOverdueLoans,
  getUserPhoneNumber,
  updateLoanSmsReminders
} from './databaseService';

import {
  sendRepaymentReminder,
  sendOverdueNotice,
  scheduleRepaymentReminders
} from './smsService';

/**
 * Send reminders for upcoming loan payments
 * @param {number} daysInAdvance - Number of days before payment to send reminders
 * @returns {Promise<object>} - Status of the reminder operation
 */
export const sendUpcomingPaymentReminders = async (daysInAdvance = 3) => {
  try {
    // Get all loans with payments due in the next X days
    const upcomingLoans = await getLoansWithUpcomingPayments(daysInAdvance);
    
    if (!upcomingLoans || upcomingLoans.length === 0) {
      return { success: true, message: 'No upcoming payments found', count: 0 };
    }

    const reminderResults = await Promise.all(
      upcomingLoans.map(async (loan) => {
        try {
          // Only send reminders for loans with SMS reminders enabled
          if (loan.smsRemindersEnabled === false) {
            return { loanId: loan.id, sent: false, reason: 'SMS reminders disabled' };
          }

          // Get borrower's phone number
          const borrowerId = loan.borrowerId;
          const phoneNumber = await getUserPhoneNumber(borrowerId);
          
          if (!phoneNumber) {
            return { loanId: loan.id, sent: false, reason: 'No phone number found' };
          }

          // Calculate days until payment is due
          const paymentDate = new Date(loan.nextPaymentDate);
          const today = new Date();
          const timeDiff = paymentDate.getTime() - today.getTime();
          const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));

          // Prepare loan details for the SMS
          const loanDetails = {
            id: loan.id,
            paymentAmount: loan.paymentAmount || loan.monthlyPayment,
            dueDate: new Date(loan.nextPaymentDate).toLocaleDateString('en-MY', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          };

          // Send the reminder SMS
          const smsResult = await sendRepaymentReminder(phoneNumber, loanDetails, daysUntilDue);
          
          return { 
            loanId: loan.id, 
            sent: smsResult.success, 
            messageId: smsResult.sid,
            daysUntilDue
          };
        } catch (error) {
          console.error(`Error sending reminder for loan ${loan.id}:`, error);
          return { loanId: loan.id, sent: false, error: error.message };
        }
      })
    );

    const sentCount = reminderResults.filter(result => result.sent).length;
    
    return {
      success: true,
      message: `Successfully sent ${sentCount} of ${upcomingLoans.length} reminders`,
      count: sentCount,
      results: reminderResults
    };
  } catch (error) {
    console.error('Error sending upcoming payment reminders:', error);
    return {
      success: false,
      message: error.message || 'Failed to send reminders',
      error
    };
  }
};

/**
 * Send notices for overdue loan payments
 * @returns {Promise<object>} - Status of the reminder operation
 */
export const sendOverduePaymentReminders = async () => {
  try {
    // Get all overdue loan payments
    const overdueLoans = await getOverdueLoans();
    
    if (!overdueLoans || overdueLoans.length === 0) {
      return { success: true, message: 'No overdue payments found', count: 0 };
    }

    const reminderResults = await Promise.all(
      overdueLoans.map(async (loan) => {
        try {
          // Only send reminders for loans with SMS reminders enabled
          if (loan.smsRemindersEnabled === false) {
            return { loanId: loan.id, sent: false, reason: 'SMS reminders disabled' };
          }

          // Get borrower's phone number
          const borrowerId = loan.borrowerId;
          const phoneNumber = await getUserPhoneNumber(borrowerId);
          
          if (!phoneNumber) {
            return { loanId: loan.id, sent: false, reason: 'No phone number found' };
          }

          // Prepare loan details for the SMS
          const loanDetails = {
            id: loan.id,
            paymentAmount: loan.paymentAmount || loan.monthlyPayment,
            dueDate: new Date(loan.nextPaymentDate).toLocaleDateString('en-MY', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          };

          // Send the overdue notice SMS
          const smsResult = await sendOverdueNotice(phoneNumber, loanDetails, loan.daysOverdue);
          
          return { 
            loanId: loan.id, 
            sent: smsResult.success, 
            messageId: smsResult.sid,
            daysOverdue: loan.daysOverdue
          };
        } catch (error) {
          console.error(`Error sending overdue notice for loan ${loan.id}:`, error);
          return { loanId: loan.id, sent: false, error: error.message };
        }
      })
    );

    const sentCount = reminderResults.filter(result => result.sent).length;
    
    return {
      success: true,
      message: `Successfully sent ${sentCount} of ${overdueLoans.length} overdue notices`,
      count: sentCount,
      results: reminderResults
    };
  } catch (error) {
    console.error('Error sending overdue payment notices:', error);
    return {
      success: false,
      message: error.message || 'Failed to send overdue notices',
      error
    };
  }
};

/**
 * Set up recurring SMS reminders for a loan
 * @param {string} loanId - Loan ID
 * @param {boolean} enable - Whether to enable or disable reminders
 * @returns {Promise<object>} - Status of the setup operation
 */
export const setupLoanReminders = async (loanId, enable = true) => {
  try {
    // Update the loan record to enable/disable reminders
    await updateLoanSmsReminders(loanId, enable);
    
    if (!enable) {
      return { success: true, message: 'SMS reminders disabled for this loan' };
    }
    
    // In a real implementation, you would set up scheduled reminders in a backend job processor
    // For this demo, we'll just simulate it with a success message
    return { 
      success: true, 
      message: 'SMS reminders enabled for this loan',
      details: 'Reminders will be sent 3 days before due date, 1 day before due date, and on the due date'
    };
  } catch (error) {
    console.error('Error setting up loan reminders:', error);
    return {
      success: false,
      message: error.message || 'Failed to set up reminders',
      error
    };
  }
};