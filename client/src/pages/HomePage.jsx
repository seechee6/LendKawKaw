import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader,
    HalfCircleBackground,
    WalletCard,
    ActionButtons
} from '../components';
import { IoIosNotificationsOutline } from 'react-icons/io';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@project-serum/anchor';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import idl from '../idl/idl.json';
import { toast } from 'react-hot-toast';

// Use program ID from environment variable
const programID = new PublicKey(import.meta.env.VITE_PROGRAM_ID || "DAyqZYocAeQd8ApqkoyYQuLG8dcYv3JDwehxbaxmwZ1n");
const SOL_TO_RM_RATE = 661.62;

const HomePage = () => {
    const { publicKey, wallet } = useWallet();
    const { connection } = useConnection();
    const navigate = useNavigate();
    
    const [userLoans, setUserLoans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalBalance, setTotalBalance] = useState('0');
    const [nextPaymentDate, setNextPaymentDate] = useState('');
    const [userName, setUserName] = useState('');
    const [notificationsCount, setNotificationsCount] = useState(0);
    const [isLoadingLoans, setIsLoadingLoans] = useState(false);
    const [error, setError] = useState(null);

    // Set user name when wallet connects/disconnects
    useEffect(() => {
                if (!publicKey) {
                    setIsLoading(false);
                    // Reset user data if wallet disconnects
                    setUserName('');
                    setTotalBalance('0');
                    setNextPaymentDate('');
                    setUserLoans([]);
                    setNotificationsCount(0);
                    return;
                }

        // Set basic user data when wallet connects
        setUserName(wallet?.adapter?.name || 'User');
        setIsLoading(false);
    }, [publicKey, wallet]);

    // Fetch blockchain loans directly from the program
    useEffect(() => {
        const fetchBlockchainLoans = async () => {
            if (!publicKey || !connection) {
                console.log('Cannot fetch loans - missing publicKey or connection');
                return;
            }
            
            setIsLoadingLoans(true);
            setError(null);
            
            try {
                // Create a read-only provider for fetching data
                const provider = new AnchorProvider(
                    connection, 
                    {
                        publicKey: publicKey,
                        signTransaction: () => Promise.reject(new Error("Read-only")),
                        signAllTransactions: () => Promise.reject(new Error("Read-only")),
                    },
                    { preflightCommitment: 'confirmed' }
                );
                
                const program = new Program(idl, programID, provider);
                
                // Fetch all loans
                console.log('Fetching all loans from program:', programID.toString());
                const allLoans = await program.account.loan.all();
                console.log('Total loans found in program:', allLoans.length);
                
                // Find loans where the user is the borrower
                const userPublicKeyStr = publicKey.toString();
                const userLoans = allLoans.filter(loan => 
                    loan.account.borrower.toString() === userPublicKeyStr
                );
                
                console.log('User loans found:', userLoans.length);
                
                // Format all user loans (both pending and active)
                const formattedLoans = userLoans.map(loan => {
                    const data = loan.account;
                    
                    // Calculate loan details
                    const principal = parseFloat(data.amount.toString()) / LAMPORTS_PER_SOL;
                    const interestRatePercent = data.interestRate / 100; // Convert basis points to percentage
                    const durationMonths = parseFloat(data.duration.toString()) / (30 * 24 * 60 * 60);
                    
                    // Convert SOL to RM
                    const principalRM = principal * SOL_TO_RM_RATE;
                    
                    // Calculate time since loan started (if active)
                    const startTimestamp = parseInt(data.startDate) * 1000; // Convert to milliseconds
                    
                    // Calculate due date - for active loans, it's 30 days from start date
                    // For pending loans, it's not applicable
                    let dueDate = '';
                    if (data.isActive && startTimestamp > 0) {
                        const nextPaymentDate = new Date(startTimestamp);
                        nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
                        dueDate = nextPaymentDate.toLocaleDateString('en-US', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                        });
                } else {
                        dueDate = 'Pending Approval';
                    }
                    
                    // Calculate total repayment amount
                    const totalInterest = principalRM * (interestRatePercent / 100) * (durationMonths / 12);
                    const totalAmountRM = principalRM + totalInterest;
                    
                    // Calculate monthly payment
                    const monthlyPaymentRM = totalAmountRM / durationMonths;
                    
                    // For active loans, calculate repayment progress
                    const totalRepaidRM = parseFloat(data.totalRepaid.toString()) / LAMPORTS_PER_SOL * SOL_TO_RM_RATE;
                    const balanceRM = Math.max(0, totalAmountRM - totalRepaidRM);
                    
                    return {
                        id: data.id.toString(),
                        publicKey: loan.publicKey.toString(),
                        title: data.description || (data.isActive ? 'Active Loan' : 'Pending Loan'),
                        borrower: data.borrower.toString(),
                        lender: data.lender ? data.lender.toString() : 'Pending',
                        amount: principalRM.toFixed(2),
                        interestRate: interestRatePercent,
                        duration: durationMonths,
                        dueDate: dueDate,
                        balance: balanceRM.toFixed(2),
                        paymentAmount: monthlyPaymentRM.toFixed(2),
                        isActive: data.isActive,
                        isPending: !data.isActive && !data.isCompleted,
                        isCompleted: data.isCompleted,
                        isOverdue: data.isActive && startTimestamp > 0 && 
                                  (new Date(startTimestamp + (30 * 24 * 60 * 60 * 1000)) < new Date()),
                        startDate: startTimestamp > 0 ? new Date(startTimestamp) : null,
                        solAmount: principal,
                        isBlockchainLoan: true
                    };
                });
                
                console.log('Formatted loans:', formattedLoans);
                setUserLoans(formattedLoans);
                
                // Calculate total balance and next payment date
                if (formattedLoans.length > 0) {
                    // Calculate total balance for active loans
                    const totalBalance = formattedLoans.reduce((total, loan) => {
                        if (loan.isActive) {
                            return total + parseFloat(loan.balance);
                        }
                        return total;
                    }, 0);
                    
                    setTotalBalance(totalBalance.toFixed(2));
                    
                    // Find the earliest due date
                    const activeLoans = formattedLoans.filter(loan => loan.isActive);
                    if (activeLoans.length > 0) {
                        const sortedLoans = [...activeLoans].sort((a, b) => {
                            if (a.dueDate === 'Pending Approval') return 1;
                            if (b.dueDate === 'Pending Approval') return -1;
                            return new Date(a.dueDate) - new Date(b.dueDate);
                        });
                        
                        if (sortedLoans[0].dueDate !== 'Pending Approval') {
                            setNextPaymentDate(sortedLoans[0].dueDate);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching blockchain loans:', error);
                setError('Failed to load your loans. Please try again.');
            } finally {
                setIsLoadingLoans(false);
            }
        };
        
        if (publicKey && connection) {
            fetchBlockchainLoans();
        }
    }, [publicKey, connection]);

    const handleRequestLoan = () => {
        navigate('/loan');
    };

    const handleRepayLoan = (loan) => {
        if (loan && loan.publicKey) {
            navigate(`/repay/${loan.publicKey}`, {
                state: { loan }
            });
        } else {
            navigate(`/repay/all`);
        }
    };

    const handleViewLoanDetail = (loan) => {
        if (loan && loan.publicKey) {
            navigate(`/loan-detail/${loan.publicKey}`, {
                state: { loan }
            });
        }
    };

    const handleNotificationsClick = () => {
        // Navigate to notifications page in a real app
        alert('Notifications feature will open here');
    };

    const handleRefreshLoans = async () => {
        if (!publicKey || !connection) return;
        
        setIsLoadingLoans(true);
        setError(null);
        
        try {
            // Create a read-only provider for fetching data
            const provider = new AnchorProvider(
                connection, 
                {
                    publicKey: publicKey,
                    signTransaction: () => Promise.reject(new Error("Read-only")),
                    signAllTransactions: () => Promise.reject(new Error("Read-only")),
                },
                { preflightCommitment: 'confirmed' }
            );
            
            const program = new Program(idl, programID, provider);
            
            // Fetch all loans
            const allLoans = await program.account.loan.all();
            
            // Find loans where the user is the borrower
            const userPublicKeyStr = publicKey.toString();
            const userLoans = allLoans.filter(loan => 
                loan.account.borrower.toString() === userPublicKeyStr
            );
            
            // Format all user loans (both pending and active)
            const formattedLoans = userLoans.map(loan => {
                const data = loan.account;
                
                // Calculate loan details
                const principal = parseFloat(data.amount.toString()) / LAMPORTS_PER_SOL;
                const interestRatePercent = data.interestRate / 100; // Convert basis points to percentage
                const durationMonths = parseFloat(data.duration.toString()) / (30 * 24 * 60 * 60);
                
                // Convert SOL to RM
                const principalRM = principal * SOL_TO_RM_RATE;
                
                // Calculate time since loan started (if active)
                const startTimestamp = parseInt(data.startDate) * 1000; // Convert to milliseconds
                
                // Calculate due date
                let dueDate = '';
                if (data.isActive && startTimestamp > 0) {
                    const nextPaymentDate = new Date(startTimestamp);
                    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
                    dueDate = nextPaymentDate.toLocaleDateString('en-US', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                    });
                } else {
                    dueDate = 'Pending Approval';
                }
                
                // Calculate total repayment amount
                const totalInterest = principalRM * (interestRatePercent / 100) * (durationMonths / 12);
                const totalAmountRM = principalRM + totalInterest;
                
                // Calculate monthly payment
                const monthlyPaymentRM = totalAmountRM / durationMonths;
                
                // For active loans, calculate repayment progress
                const totalRepaidRM = parseFloat(data.totalRepaid.toString()) / LAMPORTS_PER_SOL * SOL_TO_RM_RATE;
                const balanceRM = Math.max(0, totalAmountRM - totalRepaidRM);
                
                return {
                    id: data.id.toString(),
                    publicKey: loan.publicKey.toString(),
                    title: data.description || (data.isActive ? 'Active Loan' : 'Pending Loan'),
                    borrower: data.borrower.toString(),
                    lender: data.lender ? data.lender.toString() : 'Pending',
                    amount: principalRM.toFixed(2),
                    interestRate: interestRatePercent,
                    duration: durationMonths,
                    dueDate: dueDate,
                    balance: balanceRM.toFixed(2),
                    paymentAmount: monthlyPaymentRM.toFixed(2),
                    isActive: data.isActive,
                    isPending: !data.isActive && !data.isCompleted,
                    isCompleted: data.isCompleted,
                    isOverdue: data.isActive && startTimestamp > 0 && 
                              (new Date(startTimestamp + (30 * 24 * 60 * 60 * 1000)) < new Date()),
                    startDate: startTimestamp > 0 ? new Date(startTimestamp) : null,
                    solAmount: principal,
                    isBlockchainLoan: true
                };
            });
            
            setUserLoans(formattedLoans);
            toast.success('Loans refreshed successfully');
            
            // Calculate total balance
            if (formattedLoans.length > 0) {
                const totalBalance = formattedLoans.reduce((total, loan) => {
                    if (loan.isActive) {
                        return total + parseFloat(loan.balance);
                    }
                    return total;
                }, 0);
                
                setTotalBalance(totalBalance.toFixed(2));
            }
        } catch (error) {
            console.error('Error refreshing loans:', error);
            toast.error('Failed to refresh loans');
            setError('Failed to refresh your loans. Please try again.');
        } finally {
            setIsLoadingLoans(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-neutral">
                <Loader />
            </div>
        );
    }

    // Render connect screen if publicKey is null after loading
    if (!publicKey) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 bg-neutral">
                <h1 className="text-3xl font-bold mb-6">Welcome to LendKawKaw</h1>
                <p className="text-gray-600 mb-8 text-center">
                    Connect your wallet to see your loan details and manage your microloans.
                </p>
                <WalletMultiButton />
            </div>
        );
    }

    // Render dashboard if publicKey exists
    return (
        <HalfCircleBackground title="Dashboard">
            <div className="max-w-lg mx-auto pt-1 w-full">
                {/* Header with Welcome and Notification */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-white text-opacity-80 text-lg">Welcome,</p>
                        <h1 className="text-white text-3xl font-bold">Lai Ze Min</h1>
                    </div>
                    <div className="relative">
                        <button onClick={handleNotificationsClick} className="focus:outline-none">
                            <IoIosNotificationsOutline size={28} className="text-white" />
                            {notificationsCount > 0 && (
                                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500"></div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Wallet Card */}
                <div className="mb-6">
                    <WalletCard
                        userName={userName || 'User'}
                        balance={totalBalance}
                        walletAddress={publicKey ? publicKey.toBase58() : ''}
                        walletType={wallet ? wallet.adapter.name : 'Wallet'}
                        currencySymbol="RM"
                    />
                </div>

                {/* Action Buttons */}
                <ActionButtons
                    onRepay={() => handleRepayLoan({})}
                    onRequest={handleRequestLoan}
                />

                {/* User Loans Section */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Your Loans</h2>
                        <button 
                            onClick={handleRefreshLoans}
                            className="text-primary hover:text-primaryHover flex items-center text-sm" 
                            disabled={isLoadingLoans}
                        >
                            {isLoadingLoans ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-1"></div>
                                    <span>Loading...</span>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <IoIosNotificationsOutline size={16} className="mr-1" />
                                    <span>Refresh</span>
                                </div>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                            <p>{error}</p>
                        </div>
                    )}

                    {userLoans.length > 0 ? (
                        <div className="space-y-4">
                            {userLoans.map(loan => (
                                <div 
                                    key={`blockchain-${loan.publicKey}`}
                                    className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => handleViewLoanDetail(loan)}
                                    tabIndex="0"
                                    onKeyDown={(e) => e.key === 'Enter' && handleViewLoanDetail(loan)}
                                    aria-label={`View details for ${loan.title} loan`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center">
                                            <h3 className="text-lg font-semibold">{loan.title}</h3>
                                                <span className={`ml-2 ${loan.isActive ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'} text-xs px-2 py-0.5 rounded-full`}>
                                                    {loan.isActive ? 'Active' : 'Pending'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                Due Date: <span className={loan.isOverdue ? "text-red-500 font-medium" : ""}>{loan.dueDate}</span>
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">
                                                ID: {loan.publicKey.substring(0, 12)}...
                                            </p>
                                        </div>
                                        {loan.isActive && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent triggering card click
                                                    handleRepayLoan(loan);
                                            }}
                                            className="bg-primary hover:bg-primaryHover text-white px-5 py-2 rounded-full text-sm font-medium"
                                        >
                                            Repay
                                        </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <p className="text-sm text-gray-500">Loan Balance</p>
                                            <p className="text-lg font-semibold text-secondary">RM {loan.balance || '0.00'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Payment Amount</p>
                                            <p className="text-lg font-semibold text-secondary">RM {loan.paymentAmount || '0.00'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                            {isLoadingLoans ? (
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                    <p className="text-gray-500">Loading your blockchain loans...</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-gray-500">You don't have any loans yet.</p>
                            <button
                                onClick={handleRequestLoan}
                                        className="mt-4 bg-primary hover:bg-primaryHover text-white px-6 py-2 rounded-full text-sm font-medium"
                            >
                                Apply for a Loan
                            </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Debug Section - Hidden in production */}
                <div className="mb-6 p-4 bg-gray-100 rounded-xl text-xs opacity-50">
                    <p>Connected to: {wallet?.adapter?.name || 'No wallet'}</p>
                    <p>Wallet address: {publicKey?.toString() || 'Not connected'}</p>
                    <p>Found {userLoans.length} blockchain loans</p>
                </div>
            </div>
        </HalfCircleBackground>
    );
};

export default HomePage;