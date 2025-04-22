import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
        const details = await getLoanDetails(loanId);
        setLoanDetails(details);
      } catch (error) {
        console.error('Error fetching loan details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoanDetails();
  }, [loanId]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral">
        <Loader />
      </div>
    );
  }

  return (
    <HalfCircleBackground title="Loan Details">
      <div className="max-w-lg mx-auto pt-1 pb-10 w-full">
        <button 
          onClick={handleBack}
          className="flex items-center text-white mb-6"
          aria-label="Go back"
        >
          <IoArrowBack className="mr-2" />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Business Expansion Loan</h1>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Loan Amount</p>
              <p className="text-xl font-semibold">RM 45,000.00</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Loan ID</p>
              <p className="text-xl font-semibold">#28925</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Interest Rate</p>
              <p className="text-lg font-semibold">10%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Repayment Period</p>
              <p className="text-lg font-semibold">12 months</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-2">Blockchain Visualizer</h2>
          <p className="text-sm text-gray-500 mb-6">Track how your loan flows through the blockchain</p>
          
          <div className="relative">
            {/* Timeline track - moved slightly to the left */}
            <div className="absolute left-[13px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {/* Timeline events */}
            <div className="space-y-5">
              {loanMilestones.map((milestone, index) => (
                <div key={milestone.id} className="relative pl-10">
                  {/* Circle indicator */}
                  <div className="absolute left-0 top-1 z-10 flex items-center justify-center">
                    {getStatusIcon(milestone.status)}
                  </div>
                  
                  {/* Content */}
                  <div className="pb-4">
                    {/* Milestone header - always visible */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleMilestoneExpand(milestone.id)}
                    >
                      <div className="flex items-center">
                        <span className="mr-2">{milestone.icon}</span>
                        <h3 className="text-lg font-semibold">{milestone.title}</h3>
                      </div>
                      {/* Don't show expand arrow for repayment period as its children are always shown */}
                      {milestone.id !== 4 && (
                        <button 
                          className={`text-gray-500 transition-transform duration-200 ${expandedMilestones[milestone.id] ? 'transform rotate-90' : ''}`}
                          aria-label={expandedMilestones[milestone.id] ? "Collapse details" : "Expand details"}
                        >
                          <IoArrowForward />
                        </button>
                      )}
                    </div>
                    
                    {/* Date/time info - always visible */}
                    <div className="text-sm text-gray-500 mt-1 mb-1">
                      {milestone.date} {milestone.time && `• ${milestone.time}`}
                    </div>
                    
                    {/* Brief description - always visible */}
                    <p className="text-gray-600 text-sm">{milestone.description}</p>
                    
                    {/* Expanded blockchain details */}
                    {expandedMilestones[milestone.id] && (
                      <>
                        {(milestone.walletInfo && Object.keys(milestone.walletInfo).length > 0 || milestone.txHash) && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-3 text-sm">
                            {milestone.walletInfo && Object.keys(milestone.walletInfo).length > 0 && (
                              <div className="mb-3">
                                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                  <IoLinkOutline className="mr-1" /> Blockchain Information
                                </h4>
                                
                                {milestone.walletInfo.from && (
                                  <div className="flex items-center mb-2">
                                    <span className="text-xs text-gray-500 w-10">From:</span>
                                    <div className="flex items-center flex-1 overflow-hidden">
                                      <span className="text-xs font-mono bg-gray-100 py-1 px-2 rounded truncate max-w-[200px]">
                                        {milestone.walletInfo.from.includes(': ') 
                                          ? milestone.walletInfo.from.split(': ')[0] + ': ' + truncateAddress(milestone.walletInfo.from.split(': ')[1])
                                          : truncateAddress(milestone.walletInfo.from)
                                        }
                                      </span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyToClipboard(milestone.walletInfo.from.split(': ')[1] || milestone.walletInfo.from);
                                        }}
                                        className="ml-1 text-gray-500 hover:text-gray-700"
                                        aria-label="Copy address"
                                      >
                                        <BiCopy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                {milestone.walletInfo.to && (
                                  <div className="flex items-center mb-2">
                                    <span className="text-xs text-gray-500 w-10">To:</span>
                                    <div className="flex items-center flex-1 overflow-hidden">
                                      <span className="text-xs font-mono bg-gray-100 py-1 px-2 rounded truncate max-w-[200px]">
                                        {milestone.walletInfo.to.includes(': ')
                                          ? milestone.walletInfo.to.split(': ')[0] + ': ' + truncateAddress(milestone.walletInfo.to.split(': ')[1])
                                          : truncateAddress(milestone.walletInfo.to)
                                        }
                                      </span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyToClipboard(milestone.walletInfo.to.split(': ')[1] || milestone.walletInfo.to);
                                        }}
                                        className="ml-1 text-gray-500 hover:text-gray-700"
                                        aria-label="Copy address"
                                      >
                                        <BiCopy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                {milestone.walletInfo.splits && (
                                  <div className="ml-3 mt-2 border-l-2 border-gray-200 pl-2">
                                    <span className="text-xs text-gray-500">Payment Split:</span>
                                    {milestone.walletInfo.splits.map((split, i) => (
                                      <div key={i} className="flex items-center mt-2">
                                        <div className="flex-1 overflow-hidden">
                                          <div className="flex items-center">
                                            <span className="text-xs font-mono bg-gray-100 py-1 px-2 rounded truncate max-w-[200px]">
                                              {split.to.includes(': ')
                                                ? split.to.split(': ')[0] + ': ' + truncateAddress(split.to.split(': ')[1])
                                                : truncateAddress(split.to)
                                              }
                                            </span>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyToClipboard(split.to.split(': ')[1] || split.to);
                                              }}
                                              className="ml-1 text-gray-500 hover:text-gray-700"
                                              aria-label="Copy address"
                                            >
                                              <BiCopy className="w-3 h-3" />
                                            </button>
                                          </div>
                                          <span className="text-xs text-gray-500 mt-1 block">{split.amount}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {milestone.walletInfo.completionAction && (
                                  <div className="text-xs text-gray-600 bg-gray-100 py-1 px-2 rounded mt-2">
                                    {milestone.walletInfo.completionAction}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {milestone.txHash && (
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Transaction Hash:</span>
                                  {copiedText === milestone.txHash && (
                                    <span className="text-xs text-green-500">Copied!</span>
                                  )}
                                </div>
                                <div className="flex items-center mt-1">
                                  <span className="text-xs font-mono bg-gray-100 py-1 px-2 rounded truncate max-w-[180px]">{truncateAddress(milestone.txHash)}</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyToClipboard(milestone.txHash);
                                    }}
                                    className="ml-1 text-gray-500 hover:text-gray-700"
                                    aria-label="Copy transaction hash"
                                  >
                                    <BiCopy className="w-3 h-3" />
                                  </button>
                                  <a 
                                    href={getExplorerUrl(milestone.txHash)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-1 text-blue-500 hover:text-blue-700"
                                    aria-label="View transaction on explorer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FiExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            )}
                            
                            {milestone.blockchainDetails && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-500">Details:</span>
                                <p className="text-xs text-gray-600 mt-1">{milestone.blockchainDetails}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Child items for repayment milestones - ALWAYS SHOWN for Repayment Period */}
                        {milestone.children && (
                          <div className="ml-4 mt-4 border-l-2 border-gray-200 pl-5 space-y-4">
                            {milestone.children.map((child) => (
                              <div key={child.id} className="relative">
                                {/* Child milestone header */}
                                <div 
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => toggleMilestoneExpand(child.id)}
                                >
                                  <div className="flex items-center">
                                    <span className="mr-2">{child.icon}</span>
                                    <h3 className="text-md font-medium">{child.title}</h3>
                                    <span className={`ml-2 flex-shrink-0 h-2 w-2 rounded-full ${
                                      child.status === 'completed' ? 'bg-green-500' : 
                                      child.status === 'in-progress' ? 'bg-blue-500' : 
                                      'bg-gray-300'
                                    }`}></span>
                                  </div>
                                  {(child.walletInfo && Object.keys(child.walletInfo).length > 0 || child.txHash) && (
                                    <button 
                                      className={`text-gray-500 transition-transform duration-200 ${expandedMilestones[child.id] ? 'transform rotate-90' : ''}`}
                                      aria-label={expandedMilestones[child.id] ? "Collapse details" : "Expand details"}
                                    >
                                      <IoArrowForward className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                
                                {/* Child date/time info */}
                                <div className="text-xs text-gray-500 mt-1 mb-1">
                                  {child.date} {child.time && `• ${child.time}`}
                                </div>
                                
                                {/* Child description */}
                                <p className="text-gray-600 text-xs">{child.description}</p>
                                
                                {/* Child blockchain details (expandable) */}
                                {expandedMilestones[child.id] && (child.walletInfo && Object.keys(child.walletInfo).length > 0 || child.txHash) && (
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2 text-sm">
                                    {child.walletInfo && Object.keys(child.walletInfo).length > 0 && (
                                      <div className="mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                          <IoLinkOutline className="mr-1" /> Blockchain Information
                                        </h4>
                                        
                                        {child.walletInfo.from && (
                                          <div className="flex items-center mb-2">
                                            <span className="text-xs text-gray-500 w-10">From:</span>
                                            <div className="flex items-center flex-1 overflow-hidden">
                                              <span className="text-xs font-mono bg-gray-100 py-1 px-2 rounded truncate max-w-[200px]">
                                                {child.walletInfo.from.includes(': ') 
                                                  ? child.walletInfo.from.split(': ')[0] + ': ' + truncateAddress(child.walletInfo.from.split(': ')[1])
                                                  : truncateAddress(child.walletInfo.from)
                                                }
                                              </span>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCopyToClipboard(child.walletInfo.from.split(': ')[1] || child.walletInfo.from);
                                                }}
                                                className="ml-1 text-gray-500 hover:text-gray-700"
                                                aria-label="Copy address"
                                              >
                                                <BiCopy className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {child.walletInfo.to && (
                                          <div className="flex items-center mb-2">
                                            <span className="text-xs text-gray-500 w-10">To:</span>
                                            <div className="flex items-center flex-1 overflow-hidden">
                                              <span className="text-xs font-mono bg-gray-100 py-1 px-2 rounded truncate max-w-[200px]">
                                                {child.walletInfo.to.includes(': ')
                                                  ? child.walletInfo.to.split(': ')[0] + ': ' + truncateAddress(child.walletInfo.to.split(': ')[1])
                                                  : truncateAddress(child.walletInfo.to)
                                                }
                                              </span>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCopyToClipboard(child.walletInfo.to.split(': ')[1] || child.walletInfo.to);
                                                }}
                                                className="ml-1 text-gray-500 hover:text-gray-700"
                                                aria-label="Copy address"
                                              >
                                                <BiCopy className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {child.walletInfo.splits && (
                                          <div className="ml-3 mt-2 border-l-2 border-gray-200 pl-2">
                                            <span className="text-xs text-gray-500">Payment Split:</span>
                                            {child.walletInfo.splits.map((split, i) => (
                                              <div key={i} className="flex items-center mt-2">
                                                <div className="flex-1 overflow-hidden">
                                                  <div className="flex items-center">
                                                    <span className="text-xs font-mono bg-gray-100 py-1 px-2 rounded truncate max-w-[200px]">
                                                      {split.to.includes(': ')
                                                        ? split.to.split(': ')[0] + ': ' + truncateAddress(split.to.split(': ')[1])
                                                        : truncateAddress(split.to)
                                                      }
                                                    </span>
                                                    <button 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyToClipboard(split.to.split(': ')[1] || split.to);
                                                      }}
                                                      className="ml-1 text-gray-500 hover:text-gray-700"
                                                      aria-label="Copy address"
                                                    >
                                                      <BiCopy className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                  <span className="text-xs text-gray-500 mt-1 block">{split.amount}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {child.txHash && (
                                      <div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-500">Transaction Hash:</span>
                                          {copiedText === child.txHash && (
                                            <span className="text-xs text-green-500">Copied!</span>
                                          )}
                                        </div>
                                        <div className="flex items-center mt-1">
                                          <span className="text-xs font-mono bg-gray-100 py-1 px-2 rounded truncate max-w-[180px]">{truncateAddress(child.txHash)}</span>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCopyToClipboard(child.txHash);
                                            }}
                                            className="ml-1 text-gray-500 hover:text-gray-700"
                                            aria-label="Copy transaction hash"
                                          >
                                            <BiCopy className="w-3 h-3" />
                                          </button>
                                          <a 
                                            href={getExplorerUrl(child.txHash)} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="ml-1 text-blue-500 hover:text-blue-700"
                                            aria-label="View transaction on explorer"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <FiExternalLink className="w-3 h-3" />
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {child.blockchainDetails && (
                                      <div className="mt-2">
                                        <span className="text-xs text-gray-500">Details:</span>
                                        <p className="text-xs text-gray-600 mt-1">{child.blockchainDetails}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Separator line if not last item */}
                    {index !== loanMilestones.length - 1 && (
                      <div className="border-b border-gray-100 mt-4"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HalfCircleBackground>
  );
};

export default LoanDetailPage; 