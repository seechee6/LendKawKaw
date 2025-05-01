import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HiCheckCircle } from 'react-icons/hi';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { createLoan, checkUserInitialized, initializeUser } from '../utils/solanaLoanUtils';

// Add a separate component for program initialization
const InitializeButton = ({ onInitialize, isLoading }) => {
  return (
    <button 
      onClick={onInitialize} 
      disabled={isLoading}
      className={`mt-2 w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center ${
        isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {isLoading ? 'Initializing...' : 'Initialize Blockchain Program'}
    </button>
  );
};

const LoanApplicationForm = () => {
  const navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();
  
  // Base limits
  const BASE_MIN_LOAN = 500;
  const BASE_MAX_LOAN = 5000;
  
  const [loanAmount, setLoanAmount] = useState(2500);
  const [repaymentPeriod, setRepaymentPeriod] = useState(6); // Default to 6 months
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [loanType, setLoanType] = useState('personal'); // Default to personal loan
  const [isGuarantorEnabled, setIsGuarantorEnabled] = useState(false); // Default to no guarantor
  const [guarantorId, setGuarantorId] = useState(''); // Store guarantor ID
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // For loan type dropdown
  const [isGuarantorDropdownOpen, setIsGuarantorDropdownOpen] = useState(false); // For guarantor dropdown
  const [showCustomGuarantorInput, setShowCustomGuarantorInput] = useState(false); // To toggle between dropdown and custom input
  const [isSubmitting, setIsSubmitting] = useState(false); // For handling submission state
  const [purpose, setPurpose] = useState(''); // To store the loan purpose
  const [isInitializing, setIsInitializing] = useState(false); // For initialization state
  const [programInitialized, setProgramInitialized] = useState(null); // null = unknown, true = initialized, false = not initialized
  
  // Mock saved guarantors
  const [savedGuarantors] = useState([
    { id: 'gRT45xB7', name: 'John Doe', walletId: '0x7e...1A3b' },
    { id: 'h7Uk9pL3', name: 'Jane Smith', walletId: '0x3D...F28c' },
    { id: 'mN3qZ1P9', name: 'Alex Johnson', walletId: '0x9A...B45d' },
  ]);
  
  const cardRef = useRef(null);
  
  // Calculate loan limits based on guarantor and loan type
  const { minLoanAmount, maxLoanAmount, limitIncreasePercentage } = useMemo(() => {
    let percentage = 0;
    
    // Guarantor Only: 50% increase
    if (isGuarantorEnabled && loanType === 'personal') {
      percentage = 50;
    }
    // Business Loan Only: 100% increase
    else if (!isGuarantorEnabled && loanType === 'business') {
      percentage = 100;
    }
    // Both Guarantor + Business Loan: 150% increase
    else if (isGuarantorEnabled && loanType === 'business') {
      percentage = 150;
    }
    
    const maxIncrease = BASE_MAX_LOAN * (percentage / 100);
    
    return {
      minLoanAmount: BASE_MIN_LOAN,
      maxLoanAmount: BASE_MAX_LOAN + maxIncrease,
      limitIncreasePercentage: percentage
    };
  }, [loanType, isGuarantorEnabled]);
  
  // Adjust loan amount if it exceeds the new limits when limits change
  useEffect(() => {
    // If current loan amount is higher than the new max, set it to the new max
    if (loanAmount > maxLoanAmount) {
      setLoanAmount(Math.round(maxLoanAmount));
    }
  }, [maxLoanAmount]);
  
  // Calculate installment amount
  const installmentAmount = Math.round((loanAmount / repaymentPeriod));
  
  // Calculate interest and fees (example calculation: 1.8% of loan amount)
  const fees = Math.round(loanAmount * 0.06);
  
  // Calculate lender protection fee (8% of loan amount)
  const protectionFee = Math.round(loanAmount * 0.10);
  
  // Calculate total amount including protection fee
  const totalLoanAmount = loanAmount + protectionFee + fees;
  
  // Mock business verification status
  const isBusinessVerified = true;
  
  // Calculate repayment date
  const calculateRepaymentDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + repaymentPeriod);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Handle drag events for the card
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartY(e.clientY);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaY = startY - e.clientY;
    
    if (deltaY > 50 && !cardExpanded) {
      setCardExpanded(true);
    } else if (deltaY < -50 && cardExpanded) {
      setCardExpanded(false);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaY = startY - e.touches[0].clientY;
    
    if (deltaY > 50 && !cardExpanded) {
      setCardExpanded(true);
    } else if (deltaY < -50 && cardExpanded) {
      setCardExpanded(false);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // Format currency to display with spaces between thousands
  const formatCurrency = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const handleCardClick = (e) => {
    // Only toggle if it's a direct click on the card or drag handle, not on buttons or other interactive elements
    if (e.target.closest('button') === null) {
      setCardExpanded(!cardExpanded);
    }
  };

  // Toggle loan type dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Handle loan type selection
  const handleLoanTypeChange = (type) => {
    setLoanType(type);
    setIsDropdownOpen(false);
  };
  
  // Toggle guarantor dropdown
  const toggleGuarantorDropdown = () => {
    setIsGuarantorDropdownOpen(!isGuarantorDropdownOpen);
  };
  
  // Handle guarantor selection
  const handleGuarantorSelect = (guarantor) => {
    setGuarantorId(guarantor.id);
    setIsGuarantorDropdownOpen(false);
    setShowCustomGuarantorInput(false);
  };
  
  // Handle using a new guarantor
  const handleUseNewGuarantor = () => {
    setGuarantorId('');
    setShowCustomGuarantorInput(true);
    setIsGuarantorDropdownOpen(false);
  };

  // Check if the user's blockchain account is initialized
  useEffect(() => {
    const checkProgramInitialized = async () => {
      if (!wallet.connected || !connection) return;
      
      try {
        setIsInitializing(true);
        const { isInitialized } = await checkUserInitialized(connection, wallet);
        setProgramInitialized(isInitialized);
      } catch (error) {
        console.error("Error checking initialization:", error);
        setProgramInitialized(false);
      } finally {
        setIsInitializing(false);
      }
    };
    
    if (wallet.connected) {
      checkProgramInitialized();
    } else {
      setProgramInitialized(null);
    }
  }, [wallet.connected, connection, wallet.publicKey]);

  // Initialize the user's blockchain account
  const handleInitializeProgram = async () => {
    if (!wallet.connected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    setIsInitializing(true);
    
    try {
      const result = await initializeUser(connection, wallet);
      
      if (result.success) {
        setProgramInitialized(true);
        toast.success("Your account has been initialized on the blockchain!");
      } else {
        toast.error(result.message || "Failed to initialize. Please try again.");
      }
    } catch (error) {
      console.error("Error initializing:", error);
      toast.error("Failed to initialize. Please try again.");
    } finally {
      setIsInitializing(false);
    }
  };

  // Submit the loan application
  const handleApply = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    if (!purpose.trim()) {
      toast.error("Please provide a purpose for the loan");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // If wallet is connected, try to use blockchain
      if (wallet.connected && connection) {
        // Display a loading toast
        const loadingToast = toast.loading("Creating loan on blockchain...");
        
        try {
          // Calculate the SOL equivalent of the loan amount (1 SOL = 661.62 RM)
          const solAmount = loanAmount / 661.62;
          console.log(`Converting ${loanAmount} RM to ${solAmount.toFixed(4)} SOL`);
          
          // Create loan on blockchain with actual values
          const result = await createLoan(
            connection,
            wallet,
            solAmount, // Convert RM to SOL based on current exchange rate (661.62 RM = 1 SOL)
            8, // 8% interest rate
            repaymentPeriod // Duration in months
          );
          
          toast.dismiss(loadingToast);
          
          if (result.success) {
            toast.success("Loan created successfully on the blockchain!");
            
            // Navigate to success screen with blockchain details
            navigate('/loan-success', {
              state: {
                loanDetails: {
                  amount: loanAmount,
                  term: repaymentPeriod,
                  installment: installmentAmount,
                  protectionFee: protectionFee,
                  totalAmount: totalLoanAmount,
                  repaymentDate: calculateRepaymentDate(),
                  loanId: result.loanId,
                  loanAddress: result.loanAddress,
                  transactionSignature: result.signature,
                  isBlockchainLoan: true,
                  purpose: purpose, // Still include purpose in the state for UI display
                  solAmount: solAmount // Add the SOL amount for reference
                }
              }
            });
            return;
          } else {
            toast.error(result.message || "Failed to create loan on blockchain");
          }
        } catch (error) {
          toast.dismiss(loadingToast);
          console.error("Blockchain error:", error);
          toast.error("Blockchain transaction failed. Falling back to simulated loan.");
        }
      }
      
      // For non-connected wallets or fallback, use the existing logic
      // Simulate API call to the backend (replace with actual API call)
      setTimeout(() => {
        // Show an "approval" message
        const loadingToast = toast.loading("Processing loan application...");
        
        setTimeout(() => {
          toast.dismiss(loadingToast);
          toast.success("Loan application approved!");
          
          // Navigate to success screen
          navigate('/loan-success', {
            state: {
              loanDetails: {
                amount: loanAmount,
                term: repaymentPeriod,
                installment: installmentAmount,
                protectionFee: protectionFee,
                totalAmount: totalLoanAmount,
                repaymentDate: calculateRepaymentDate(),
                isBlockchainLoan: false
              }
            }
          });
        }, 2000); // 2-second fake "processing" time
      }, 1000);
    } catch (error) {
      console.error("Application error:", error);
      toast.error("Failed to submit loan application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get guarantor display name (for UI display)
  const getGuarantorDisplayName = () => {
    const guarantor = savedGuarantors.find(g => g.id === guarantorId);
    if (guarantor) {
      return guarantor.name;
    }
    return guarantorId.length > 8 ? `${guarantorId.substring(0, 8)}...` : guarantorId;
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-white p-6 overflow-x-hidden rounded-2xl">
      {/* Heading */}
      <h1 className="text-3xl font-bold mb-1">Apply for a</h1>
      <h1 className="text-3xl font-bold mb-8">Microloan Today.</h1>

      {/* Connect wallet message */}
      {!wallet.connected && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-blue-800 mb-3">Connect your wallet to apply for a loan</p>
          <WalletMultiButton className="w-full flex justify-center" />
        </div>
      )}

      {/* Program initialization message */}
      {wallet.connected && programInitialized === false && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <p className="text-yellow-800 mb-3">The loan program needs to be initialized before you can apply</p>
          <InitializeButton onInitialize={handleInitializeProgram} isLoading={isInitializing} />
        </div>
      )}

      {/* Loan type selection */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Loan Type</label>
        <div className="relative">
          <div 
            className="flex items-center justify-between w-full p-3 border border-gray-300 rounded-lg cursor-pointer"
            onClick={toggleDropdown}
          >
            <div className="flex items-center">
              <span className="text-gray-800">
                {loanType === 'personal' ? 'Personal Loan' : 'Business Loan'}
              </span>
              
              {/* Show verified badge for business loan */}
              {loanType === 'business' && isBusinessVerified && (
                <div className="flex items-center ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                  <HiCheckCircle className="mr-1" />
                  Verified
                </div>
              )}
            </div>
            {isDropdownOpen ? <HiChevronUp /> : <HiChevronDown />}
          </div>
          
          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
              <div 
                className="p-3 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleLoanTypeChange('personal')}
              >
                Personal Loan
              </div>
              <div 
                className="p-3 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleLoanTypeChange('business')}
              >
                Business Loan
                {isBusinessVerified && (
                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full flex items-center inline-flex">
                    <HiCheckCircle className="mr-1" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guarantor option */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-gray-700">Add a Guarantor (Optional)</label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input 
              type="checkbox" 
              id="guarantorToggle" 
              checked={isGuarantorEnabled}
              onChange={() => {
                setIsGuarantorEnabled(!isGuarantorEnabled);
                if (!isGuarantorEnabled) {
                  setShowCustomGuarantorInput(false);
                }
              }}
              className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer focus:outline-none transition-transform duration-200 ease-in"
              style={{
                borderColor: isGuarantorEnabled ? '#176B87' : '#D1D5DB',
                transform: isGuarantorEnabled ? 'translateX(100%)' : 'translateX(0)',
                boxShadow: '0 0 2px rgba(0, 0, 0, 0.2)'
              }}
            />
            <label 
              htmlFor="guarantorToggle" 
              className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
              style={{ backgroundColor: isGuarantorEnabled ? '#176B87' : '#D1D5DB' }}
            ></label>
          </div>
        </div>
        
        {isGuarantorEnabled && (
          <div className="mb-2">
            {!showCustomGuarantorInput ? (
              <div className="relative">
                <div 
                  className="flex items-center justify-between w-full p-3 border border-gray-300 rounded-lg cursor-pointer"
                  onClick={toggleGuarantorDropdown}
                >
                  <span className="text-gray-800 truncate">
                    {guarantorId ? getGuarantorDisplayName() : 'Select a guarantor'}
                  </span>
                  {isGuarantorDropdownOpen ? <HiChevronUp /> : <HiChevronDown />}
                </div>
                
                {isGuarantorDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    {savedGuarantors.map((guarantor) => (
                      <div 
                        key={guarantor.id}
                        className="p-3 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleGuarantorSelect(guarantor)}
                      >
                        <div className="font-medium">{guarantor.name}</div>
                        <div className="text-xs text-gray-500">{guarantor.walletId}</div>
                      </div>
                    ))}
                    <div 
                      className="p-3 border-t border-gray-200 hover:bg-gray-100 cursor-pointer text-secondary font-medium"
                      onClick={handleUseNewGuarantor}
                    >
                      + Add a new guarantor
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="text"
                    placeholder="Enter guarantor wallet ID"
                    value={guarantorId}
                    onChange={(e) => setGuarantorId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                  <button
                    onClick={() => setShowCustomGuarantorInput(false)}
                    className="ml-2 text-secondary hover:text-opacity-80"
                    aria-label="Go back to saved guarantors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              An invitation will be sent to the guarantor when you apply. They must accept before your loan is posted.
            </p>
          </div>
        )}
      </div>

      {/* Loan purpose field - NEW */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Loan Purpose</label>
        <input
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="What will you use this loan for?"
          className="w-full p-3 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Loan amount slider */}
      <div className="mb-8 overflow-x-hidden">
        <label className="block text-gray-700 mb-2">How much would you like to loan?</label>
        
        <div className="flex items-center mb-2 px-2">
          <span className="text-gray-500 shrink-0">RM</span>
          <div className="flex-1 mx-2 overflow-hidden">
            <input
              type="range"
              min={minLoanAmount}
              max={maxLoanAmount}
              step="100"
              value={loanAmount}
              onChange={(e) => setLoanAmount(parseInt(e.target.value))}
              className="w-full appearance-none h-1 bg-gray-200 rounded-full cursor-pointer touch-none"
              style={{
                backgroundImage: `linear-gradient(to right, #176B87 0%, #176B87 ${(loanAmount - minLoanAmount) / (maxLoanAmount - minLoanAmount) * 100}%, #E5E7EB ${(loanAmount - minLoanAmount) / (maxLoanAmount - minLoanAmount) * 100}%, #E5E7EB 100%)`,
              }}
            />
          </div>
          <span className="text-gray-500 shrink-0">RM {Math.round(maxLoanAmount / 1000)}k</span>
        </div>
      </div>

      {/* Repayment period selection */}
      <div className="mb-8 overflow-x-auto">
        <label className="block text-gray-700 mb-2">How long do you need to repay?</label>
        <div className="flex space-x-2 pb-2 overflow-x-auto scrollbar-hide">
          {[3, 6, 12, 18, 24, 36].map((months) => (
            <button 
              key={months}
              className={`px-4 py-2 rounded-full text-sm shrink-0 ${repaymentPeriod === months ? 'bg-secondary text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setRepaymentPeriod(months)}
            >
              {months} Months
            </button>
          ))}
        </div>
      </div>

            {/* Borrower Protection Fee Disclaimer */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-medium text-blue-700 text-sm">Important Notice</h4>
            <p className="text-blue-600 text-xs mt-1">A 5% protection fee will be automatically deducted from your loan amount before you receive the funds. This fee is held in reserve to protect lenders in case of default.</p>
          </div>
        </div>
      </div>

      {/* Draggable black loan summary card */}
      <div 
        ref={cardRef}
        className={`fixed left-0 right-0 bottom-0 bg-[#1E1E1E] text-white rounded-t-3xl shadow-lg transition-all duration-300 ease-in-out cursor-pointer`}
        style={{ 
          height: cardExpanded ? '54vh' : '200px',
          zIndex: 50
        }}
        onClick={handleCardClick}
      >
        {/* Drag handle */}
        <div 
          className="w-full flex justify-center py-2 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
        </div>
        
        <div className="px-6 pt-2 pb-6 flex flex-col items-center">
          {/* Loan amount */}
          <div className="text-4xl font-semibold mb-4">RM {formatCurrency(loanAmount)}</div>
          
          {cardExpanded ? (
            /* Expanded card details */
            <div className="space-y-4 w-full overflow-y-auto pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-gray-400">Loan Period:</span>
                </div>
                <span>{repaymentPeriod} Months</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8v8m-5-4h10" />
                  </svg>
                  <span className="text-gray-400">Installment:</span>
                </div>
                <span>RM {installmentAmount}/month</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8v8m-5-4h10" />
                  </svg>
                  <span className="text-gray-400">Repay Date:</span>
                </div>
                <span>{calculateRepaymentDate()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="8" />
                  </svg>
                  <span className="text-gray-400">Interest Rate (6%)</span>
                </div>
                <div className="flex items-center">
                  <span>RM {fees}</span>
                  <button className="ml-1 bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs">
                    i
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-gray-400">Protection Fee (10%):</span>
                </div>
                <span>RM {protectionFee}</span>
              </div>
              
              <div className="flex justify-between items-center font-medium border-t border-gray-700 pt-3 mt-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-white">Total with Fees:</span>
                </div>
                <span>RM {totalLoanAmount}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-gray-400">Loan Type:</span>
                </div>
                <div className="flex items-center">
                  <span>{loanType === 'personal' ? 'Personal Loan' : 'Business Loan'}</span>
                </div>
              </div>
              
              {isGuarantorEnabled && guarantorId && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-gray-400">Guarantor:</span>
                  </div>
                  <span>{getGuarantorDisplayName()}</span>
                </div>
              )}
              
              <button
                onClick={handleApply}
                disabled={isSubmitting || !wallet.connected}
                className={`mt-6 w-full py-3 px-4 rounded-full font-medium flex items-center justify-center ${
                  isSubmitting || !wallet.connected
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-secondary hover:bg-secondaryLight text-white'
                }`}
              >
                {isSubmitting ? 'Processing...' : 'Apply Now'}
                {!isSubmitting && (
                  <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          ) : (
            /* Collapsed card summary */
            <div className="w-full">
              <div className="flex justify-center items-center space-x-4">
                <span>{repaymentPeriod} Months</span>
                <span>RM {installmentAmount}/month</span>
              </div>
              
              <button
                onClick={handleApply}
                disabled={isSubmitting || !wallet.connected}
                className={`mt-6 w-full py-3 px-4 rounded-full font-medium flex items-center justify-center ${
                  isSubmitting || !wallet.connected
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-secondary hover:bg-secondaryLight text-white'
                }`}
              >
                {isSubmitting ? 'Processing...' : 'Apply Now'}
                {!isSubmitting && (
                  <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanApplicationForm; 