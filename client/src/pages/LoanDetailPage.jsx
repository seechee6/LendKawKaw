import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getLoanDetails } from '../services/databaseService';
import { Loader, HalfCircleBackground } from '../components';
import { 
  IoArrowBack, 
  IoCheckmarkCircle, 
  IoTimeOutline, 
  IoHourglassOutline, 
  IoAlertCircleOutline, 
  IoLinkOutline,
  IoWalletOutline,
  IoDocumentTextOutline,
  IoArrowForward,
  IoCalendarOutline,
  IoCardOutline
} from 'react-icons/io5';
import { BiCopy } from 'react-icons/bi';
import { FiExternalLink } from 'react-icons/fi';
import { MdPayments } from 'react-icons/md';

const LoanDetailPage = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loanDetails, setLoanDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedText, setCopiedText] = useState('');
  const [expandedMilestones, setExpandedMilestones] = useState({
    // Pre-expand the repayment period milestone
    4: true,
    // Also pre-expand the first payment for demonstration purposes
    'payment-1': true
  });

  useEffect(() => {
    const fetchLoanDetails = async () => {
      setIsLoading(true);
      try {
        // First check if loan data was passed via location state
        if (location.state && location.state.loan) {
          setLoanDetails(location.state.loan);
        } else {
          // Fall back to fetching from database if no state was passed
          const details = await getLoanDetails(loanId);
          setLoanDetails(details);
        }
      } catch (error) {
        console.error('Error fetching loan details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId, location.state]);

  const handleBack = () => {
    navigate(-1);
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedText(text);
        setTimeout(() => setCopiedText(''), 2000);
      })
      .catch(err => console.error('Could not copy text: ', err));
  };

  const toggleMilestoneExpand = (id) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // This would come from real data, but hardcoding for the example
  const loanMilestones = [
    {
      id: 1,
      status: 'completed',
      title: 'Loan Application Submitted',
      icon: <IoDocumentTextOutline className="text-primary w-5 h-5" />,
      date: '2023-08-01',
      time: '10:30 AM',
      description: 'You applied for a loan of RM45,000 with 10% interest rate for 12 months.',
      walletInfo: {
        from: '0x74c3F292dE2F41c6dBeaF8eF4BbCDEF123456789',
        to: 'Platform Smart Contract: 0xPLatF0rm5m4rtC0ntr4ctADDr3ss789012345',
      },
      txHash: '',
      blockchainDetails: 'Application data stored on-chain via the platform smart contract'
    },
    {
      id: 2,
      status: 'completed',
      title: 'Loan Approved by Platform',
      icon: <IoCheckmarkCircle className="text-primary w-5 h-5" />,
      date: '2023-08-02',
      time: '09:15 AM',
      description: 'Your loan application was reviewed and approved by the platform.',
      walletInfo: {
        from: 'Platform Contract: 0xPLatF0rm5m4rtC0ntr4ctADDr3ss789012345',
        to: 'Loan Pool: 0xL04nP00lC0ntr4ctADDr3ss1234567890abcdef',
      },
      txHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      blockchainDetails: 'Loan application added to available loans pool on blockchain'
    },
    {
      id: 3,
      status: 'completed',
      title: 'Loan Funded by Lender',
      icon: <IoWalletOutline className="text-primary w-5 h-5" />,
      date: '2023-08-05',
      time: '11:45 AM',
      description: 'Emma Watson funded your loan request. Funds have been transferred directly to your wallet.',
      walletInfo: {
        from: 'Lender: 0x45D6a7b8c9E0F1d2A3b4C5d6E7f8A9b0C1d2E3f4',
        to: 'Your Wallet: 0x74c3F292dE2F41c6dBeaF8eF4BbCDEF123456789',
      },
      txHash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      blockchainDetails: 'Principal loan amount of RM45,000 transferred directly to your wallet'
    },
    {
      id: 4,
      status: 'in-progress',
      title: 'Repayment Period',
      icon: <IoCalendarOutline className="text-primary w-5 h-5" />,
      date: '2023-08-05 - 2024-08-05',
      time: '',
      description: 'Monthly payment of RM5,000 due on the 5th of each month for 12 months.',
      walletInfo: {},
      txHash: '',
      blockchainDetails: 'The smart contract automatically splits each payment: 95% to lender and 5% to platform',
      children: [
        {
          id: 'payment-1',
          status: 'completed',
          title: 'Payment 1 of 12',
          icon: <IoCardOutline className="text-primary w-4 h-4" />,
          date: '2023-09-05',
          time: '09:30 AM',
          description: 'Payment of RM5,000 completed',
          walletInfo: {
            from: 'Your Wallet: 0x74c3F292dE2F41c6dBeaF8eF4BbCDEF123456789',
            to: 'Payment Distributor: 0xP4ym3ntD15tr1but0rC0ntr4ct6789012345',
            splits: [
              { to: 'Lender: 0x45D6a7b8c9E0F1d2A3b4C5d6E7f8A9b0C1d2E3f4', amount: 'RM4,750 (principal + 5% interest)' },
              { to: 'Platform: 0xPLatF0rm5m4rtC0ntr4ctADDr3ss789012345', amount: 'RM250 (5% interest)' }
            ]
          },
          txHash: '0xd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2',
          blockchainDetails: 'Payment transaction automatically split between lender and platform'
        },
        {
          id: 'payment-2',
          status: 'upcoming',
          title: 'Payment 2 of 12',
          icon: <IoCardOutline className="text-primary w-4 h-4" />,
          date: '2023-10-05',
          time: '',
          description: 'Payment of RM5,000 due',
          walletInfo: {
            from: 'Your Wallet: 0x74c3F292dE2F41c6dBeaF8eF4BbCDEF123456789',
            to: 'Payment Distributor: 0xP4ym3ntD15tr1but0rC0ntr4ct6789012345',
          },
          txHash: '',
          blockchainDetails: 'Ensure your wallet has sufficient funds before the due date'
        },
        {
          id: 'payment-3',
          status: 'upcoming',
          title: 'Payment 3 of 12',
          icon: <IoCardOutline className="text-primary w-4 h-4" />,
          date: '2023-11-05',
          time: '',
          description: 'Payment of RM5,000 due',
          walletInfo: {
            from: 'Your Wallet: 0x74c3F292dE2F41c6dBeaF8eF4BbCDEF123456789',
            to: 'Payment Distributor: 0xP4ym3ntD15tr1but0rC0ntr4ct6789012345',
          },
          txHash: '',
          blockchainDetails: ''
        },
        {
          id: 'remaining-payments',
          status: 'upcoming',
          title: 'Payments 4-12',
          icon: <IoCardOutline className="text-primary w-4 h-4" />,
          date: '2023-12-05 - 2024-08-05',
          time: '',
          description: 'Future monthly payments of RM5,000 each',
          walletInfo: {},
          txHash: '',
          blockchainDetails: ''
        }
      ]
    },
    {
      id: 5,
      status: 'upcoming',
      title: 'Loan Completion',
      icon: <IoCheckmarkCircle className="text-primary w-5 h-5" />,
      date: '2024-08-05',
      time: '',
      description: 'Expected loan completion date. Your credit score will increase upon successful repayment.',
      walletInfo: {
        completionAction: 'Smart contract will automatically mark your loan as complete and update your credit score on-chain'
      },
      txHash: '',
      blockchainDetails: 'Your credit score will be updated on the blockchain after your final payment'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <IoCheckmarkCircle className="text-green-500 w-6 h-6" />;
      case 'in-progress':
        return <IoHourglassOutline className="text-blue-500 w-6 h-6" />;
      case 'upcoming':
        return <IoTimeOutline className="text-gray-400 w-6 h-6" />;
      case 'overdue':
        return <IoAlertCircleOutline className="text-red-500 w-6 h-6" />;
      default:
        return <IoTimeOutline className="text-gray-400 w-6 h-6" />;
    }
  };

  // Function to truncate blockchain addresses and transaction hashes
  const truncateAddress = (address) => {
    if (!address) return '';
    // Extract actual address if it contains a label like "Platform: address"
    const addressParts = address.split(': ');
    const actualAddress = addressParts.length > 1 ? addressParts[1] : address;
    
    if (actualAddress.length <= 20) return actualAddress;
    return `${actualAddress.substring(0, 6)}...${actualAddress.substring(actualAddress.length - 4)}`;
  };

  // Function to get explorer URL (would be different based on blockchain)
  const getExplorerUrl = (hash) => {
    // In a real app, this would point to the actual explorer URL
    return `https://explorer.solana.com/tx/${hash}`;
  };

  // Generate blockchain loan milestones based on loan data
  const generateBlockchainLoanMilestones = (loan) => {
    if (!loan || !loan.isBlockchainLoan) return loanMilestones;
    
    const milestones = [];
    
    // Application milestone
    milestones.push({
      id: 1,
      status: 'completed',
      title: 'Loan Application Submitted',
      icon: <IoDocumentTextOutline className="text-primary w-5 h-5" />,
      date: new Date(loan.startDate || Date.now() - 86400000).toLocaleDateString(),
      time: new Date(loan.startDate || Date.now() - 86400000).toLocaleTimeString(),
      description: `You applied for a loan of RM ${loan.amount} with ${loan.interestRate}% interest rate for ${loan.duration} months.`,
      walletInfo: {
        from: loan.borrower,
        to: 'Platform Smart Contract',
      },
      txHash: '',
      blockchainDetails: 'Application data stored on Solana blockchain'
    });
    
    // Loan status based milestones
    if (loan.isActive) {
      // Funding milestone
      milestones.push({
        id: 2,
        status: 'completed',
        title: 'Loan Funded by Lender',
        icon: <IoWalletOutline className="text-primary w-5 h-5" />,
        date: new Date(loan.startDate || Date.now() - 86400000).toLocaleDateString(),
        time: new Date(loan.startDate || Date.now() - 86400000).toLocaleTimeString(),
        description: `Your loan request was funded by a lender. Funds of RM ${loan.amount} have been transferred to your wallet.`,
        walletInfo: {
          from: loan.lender || 'Lender Address',
          to: loan.borrower,
        },
        txHash: loan.transactionSignature || '',
        blockchainDetails: `Principal loan amount of RM ${loan.amount} transferred directly to your wallet`
      });
      
      // Repayment Period milestone
      const repaymentMilestone = {
        id: 3,
        status: 'in-progress',
        title: 'Repayment Period',
        icon: <IoCalendarOutline className="text-primary w-5 h-5" />,
        date: `${new Date(loan.startDate || Date.now()).toLocaleDateString()} - Future`,
        time: '',
        description: `Monthly payment of RM ${loan.paymentAmount} due each month for ${loan.duration} months.`,
        walletInfo: {},
        txHash: '',
        blockchainDetails: 'The smart contract automatically splits each payment between lender and platform',
        children: []
      };
      
      // Add repayment children
      for (let i = 0; i < Math.min(loan.duration, 12); i++) {
        const paymentDate = new Date(loan.startDate || Date.now());
        paymentDate.setMonth(paymentDate.getMonth() + i + 1);
        
        const isPast = paymentDate < new Date();
        const status = isPast ? 'completed' : 'upcoming';
        
        repaymentMilestone.children.push({
          id: `payment-${i+1}`,
          status: status,
          title: `Payment ${i+1} of ${Math.ceil(loan.duration)}`,
          icon: <IoCardOutline className="text-primary w-4 h-4" />,
          date: paymentDate.toLocaleDateString(),
          time: '',
          description: `Payment of RM ${loan.paymentAmount}`,
          walletInfo: {
            from: loan.borrower,
            to: 'Payment Distributor',
          },
          txHash: '',
          blockchainDetails: status === 'upcoming' ? 'Ensure your wallet has sufficient funds before the due date' : 'Payment completed'
        });
      }
      
      milestones.push(repaymentMilestone);
      
      // Loan Completion milestone
      const completionDate = new Date(loan.startDate || Date.now());
      completionDate.setMonth(completionDate.getMonth() + Math.ceil(loan.duration));
      
      milestones.push({
        id: 4,
        status: 'upcoming',
        title: 'Loan Completion',
        icon: <IoCheckmarkCircle className="text-primary w-5 h-5" />,
        date: completionDate.toLocaleDateString(),
        time: '',
        description: 'Expected loan completion date. Your credit score will increase upon successful repayment.',
        walletInfo: {
          completionAction: 'Smart contract will automatically mark your loan as complete and update your credit score on-chain'
        },
        txHash: '',
        blockchainDetails: 'Your credit score will be updated on the blockchain after your final payment'
      });
    } else {
      // Pending approval milestone
      milestones.push({
        id: 2,
        status: 'in-progress',
        title: 'Awaiting Funding',
        icon: <IoHourglassOutline className="text-primary w-5 h-5" />,
        date: new Date().toLocaleDateString(),
        time: '',
        description: 'Your loan is waiting to be funded by a lender.',
        walletInfo: {},
        txHash: '',
        blockchainDetails: 'Loan visible in the available loans pool on blockchain'
      });
    }
    
    return milestones;
  };

  // Use the loan details to render either hardcoded milestones or blockchain loan milestones
  const displayMilestones = loanDetails?.isBlockchainLoan 
    ? generateBlockchainLoanMilestones(loanDetails) 
    : loanMilestones;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral">
        <Loader />
      </div>
    );
  }

  return (
    <HalfCircleBackground title="Loan Timeline">
      <div className="max-w-lg mx-auto pt-1 w-full pb-8">
        <button 
          onClick={handleBack}
          className="flex items-center text-white mb-6 hover:opacity-80 transition-opacity"
        >
          <IoArrowBack className="mr-2" />
          <span>Back</span>
        </button>

        {/* Loan Info Card */}
        <div className="bg-white rounded-lg shadow-md p-5 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">
                {loanDetails?.title || loanDetails?.description || 'Loan Details'}
              </h2>
              <p className="text-gray-600 text-sm">
                {loanDetails?.isBlockchainLoan 
                  ? `ID: ${loanDetails?.publicKey?.substring(0, 10)}...` 
                  : `ID: ${loanId || loanDetails?.id || 'Unknown'}`}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium 
              ${loanDetails?.isActive ? 'bg-blue-100 text-blue-800' : 
                loanDetails?.isCompleted ? 'bg-green-100 text-green-800' : 
                'bg-yellow-100 text-yellow-800'}`}
            >
              {loanDetails?.isActive ? 'Active' : 
               loanDetails?.isCompleted ? 'Completed' : 'Pending'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <p className="text-gray-600 text-sm">Amount</p>
              <p className="font-semibold">RM {loanDetails?.amount || '0'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Interest Rate</p>
              <p className="font-semibold">{loanDetails?.interestRate || '0'}%</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Duration</p>
              <p className="font-semibold">{loanDetails?.duration || '0'} months</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Monthly Payment</p>
              <p className="font-semibold">RM {loanDetails?.paymentAmount || '0'}</p>
            </div>
          </div>
          
          {/* Blockchain link for blockchain loans */}
          {loanDetails?.isBlockchainLoan && loanDetails?.publicKey && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <a 
                href={`https://explorer.solana.com/address/${loanDetails.publicKey}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <IoLinkOutline className="mr-1" />
                View on Solana Explorer
                <FiExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Blockchain Visualization Timeline */}
        <div className="bg-white rounded-lg shadow-md p-5 mb-6">
          <h3 className="text-lg font-semibold mb-4">Blockchain Visualizer</h3>
          
          <div className="relative">
            {/* Timeline visualization */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>
            
            {/* Timeline milestones */}
            <div className="space-y-8 relative z-10">
              {displayMilestones.map((milestone) => (
                <div key={milestone.id} className="relative">
                  {/* Milestone header */}
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white flex items-center justify-center border-2 border-gray-200">
                      {getStatusIcon(milestone.status)}
                    </div>
                    <div className="ml-4 flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-md font-medium">{milestone.title}</h4>
                          <p className="text-sm text-gray-500">{milestone.date} {milestone.time ? `• ${milestone.time}` : ''}</p>
                        </div>
                        {milestone.children && (
                          <button 
                            onClick={() => toggleMilestoneExpand(milestone.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedMilestones[milestone.id] ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Milestone details */}
                  {(!milestone.children || expandedMilestones[milestone.id]) && (
                    <div className="ml-16 mt-2">
                      <p className="text-gray-700 mb-2">{milestone.description}</p>
                      
                      {/* Wallet info */}
                      {milestone.walletInfo && Object.keys(milestone.walletInfo).length > 0 && (
                        <div className="bg-gray-50 rounded-md p-3 mb-2">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Transaction Details</h5>
                          {milestone.walletInfo.from && (
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">From:</span>
                              <div className="flex items-center">
                                <span className="text-xs font-medium">{truncateAddress(milestone.walletInfo.from)}</span>
                                <button 
                                  onClick={() => handleCopyToClipboard(milestone.walletInfo.from)}
                                  className="ml-1 text-gray-400 hover:text-gray-600"
                                >
                                  <BiCopy size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                          {milestone.walletInfo.to && (
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">To:</span>
                              <div className="flex items-center">
                                <span className="text-xs font-medium">{truncateAddress(milestone.walletInfo.to)}</span>
                                <button 
                                  onClick={() => handleCopyToClipboard(milestone.walletInfo.to)}
                                  className="ml-1 text-gray-400 hover:text-gray-600"
                                >
                                  <BiCopy size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                          {milestone.walletInfo.splits && (
                            <div className="mt-1 pt-1 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Payment Split:</p>
                              {milestone.walletInfo.splits.map((split, idx) => (
                                <div key={idx} className="flex justify-between items-center pl-2 mb-1">
                                  <span className="text-xs text-gray-500">• {truncateAddress(split.to)}</span>
                                  <span className="text-xs font-medium">{split.amount}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {milestone.walletInfo.completionAction && (
                            <p className="text-xs text-gray-700 mt-1">{milestone.walletInfo.completionAction}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Transaction info */}
                      {milestone.txHash && (
                        <div className="flex items-center mb-2">
                          <span className="text-xs text-gray-500 mr-2">Transaction:</span>
                          <span className="text-xs font-mono">{truncateAddress(milestone.txHash)}</span>
                          <button 
                            onClick={() => handleCopyToClipboard(milestone.txHash)}
                            className="ml-1 text-gray-400 hover:text-gray-600"
                          >
                            <BiCopy size={14} />
                          </button>
                          <a 
                            href={getExplorerUrl(milestone.txHash)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-500 hover:text-blue-700"
                          >
                            <FiExternalLink size={14} />
                          </a>
                        </div>
                      )}
                      
                      {/* Blockchain info */}
                      {milestone.blockchainDetails && (
                        <p className="text-xs text-gray-600 italic">{milestone.blockchainDetails}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Child milestones */}
                  {milestone.children && expandedMilestones[milestone.id] && (
                    <div className="ml-16 mt-4 space-y-6">
                      {milestone.children.map(child => (
                        <div key={child.id} className="relative">
                          {/* Child milestone header */}
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white flex items-center justify-center border-2 border-gray-200">
                              {getStatusIcon(child.status)}
                            </div>
                            <div className="ml-4 flex-grow">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="text-sm font-medium">{child.title}</h5>
                                  <p className="text-xs text-gray-500">{child.date}</p>
                                </div>
                                <button 
                                  onClick={() => toggleMilestoneExpand(child.id)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  {expandedMilestones[child.id] ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Child milestone details */}
                          {expandedMilestones[child.id] && (
                            <div className="ml-12 mt-2">
                              <p className="text-xs text-gray-700 mb-2">{child.description}</p>
                              
                              {/* Wallet info for child */}
                              {child.walletInfo && Object.keys(child.walletInfo).length > 0 && (
                                <div className="bg-gray-50 rounded-md p-2 mb-2">
                                  <h5 className="text-xs font-medium text-gray-700 mb-1">Transaction Details</h5>
                                  {child.walletInfo.from && (
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs text-gray-500">From:</span>
                                      <div className="flex items-center">
                                        <span className="text-xs font-medium">{truncateAddress(child.walletInfo.from)}</span>
                                        <button 
                                          onClick={() => handleCopyToClipboard(child.walletInfo.from)}
                                          className="ml-1 text-gray-400 hover:text-gray-600"
                                        >
                                          <BiCopy size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {child.walletInfo.to && (
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs text-gray-500">To:</span>
                                      <div className="flex items-center">
                                        <span className="text-xs font-medium">{truncateAddress(child.walletInfo.to)}</span>
                                        <button 
                                          onClick={() => handleCopyToClipboard(child.walletInfo.to)}
                                          className="ml-1 text-gray-400 hover:text-gray-600"
                                        >
                                          <BiCopy size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Transaction info for child */}
                              {child.txHash && (
                                <div className="flex items-center mb-2">
                                  <span className="text-xs text-gray-500 mr-2">Transaction:</span>
                                  <span className="text-xs font-mono">{truncateAddress(child.txHash)}</span>
                                  <button 
                                    onClick={() => handleCopyToClipboard(child.txHash)}
                                    className="ml-1 text-gray-400 hover:text-gray-600"
                                  >
                                    <BiCopy size={12} />
                                  </button>
                                  <a 
                                    href={getExplorerUrl(child.txHash)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-500 hover:text-blue-700"
                                  >
                                    <FiExternalLink size={12} />
                                  </a>
                                </div>
                              )}
                              
                              {/* Blockchain info for child */}
                              {child.blockchainDetails && (
                                <p className="text-xs text-gray-600 italic">{child.blockchainDetails}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Bottom action buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {loanDetails?.isActive && !loanDetails?.isCompleted && (
            <button 
              onClick={() => navigate(`/repay/${loanDetails.publicKey || loanId}`, { state: { loan: loanDetails } })}
              className="flex-1 bg-primary text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center hover:bg-primaryHover transition-colors"
            >
              <MdPayments className="mr-2" />
              Make Payment
            </button>
          )}
          <button 
            onClick={handleBack}
            className="flex-1 bg-gray-100 text-gray-800 py-3 px-6 rounded-lg font-semibold flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <IoArrowBack className="mr-2" />
            Back to Dashboard
          </button>
        </div>
        
        {/* Show copied notification */}
        {copiedText && (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg text-sm">
            Copied to clipboard!
          </div>
        )}
      </div>
    </HalfCircleBackground>
  );
};

export default LoanDetailPage; 