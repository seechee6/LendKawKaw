import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Removed TransactionContext import, relying on useWallet for connection state
import {
    Loader,
    HalfCircleBackground,
    WalletCard,
    ActionButtons
} from '../components';
import { IoIosNotificationsOutline } from 'react-icons/io';
import { getUserDashboardData } from '../services/databaseService';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react'; // Keep this

const HomePage = () => {
    // Removed currentAccount and connectWallet from TransactionContext
    const { publicKey, wallet } = useWallet(); // Use publicKey from Solana adapter
    const navigate = useNavigate();
    const [userLoans, setUserLoans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalBalance, setTotalBalance] = useState('0');
    const [nextPaymentDate, setNextPaymentDate] = useState('');
    const [userName, setUserName] = useState('');
    const [notificationsCount, setNotificationsCount] = useState(0);

    useEffect(() => {
        // Fetch user data from our database service
        const fetchUserData = async () => {
            setIsLoading(true);
            try {
                // Check if publicKey exists (wallet connected)
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

                // TODO: Update getUserDashboardData to fetch user data based on publicKey
                // For demo purposes, using a fixed user ID "1" - in a real app,
                // you would match the publicKey.toBase58() to find the user in your backend/database.
                // const userPublicKeyString = publicKey.toBase58();
                // const dashboardData = await getUserDashboardData(userPublicKeyString); // Ideal implementation
                const dashboardData = await getUserDashboardData("1"); // Using mock ID for now

                if (dashboardData && dashboardData.user) {
                    setUserName(dashboardData.user.name);
                    setTotalBalance(dashboardData.totalLoansBalance);
                    setNextPaymentDate(dashboardData.nextPaymentDate);
                    setUserLoans(dashboardData.loans);
                    setNotificationsCount(dashboardData.notificationsCount);
                } else {
                     // Handle case where user data is not found for the connected wallet
                    setUserName('User'); // Default name
                    setTotalBalance('0');
                    setNextPaymentDate('');
                    setUserLoans([]);
                    setNotificationsCount(0);
                }

                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching user data:", error);
                setIsLoading(false);
                 // Reset state on error
                setUserName('');
                setTotalBalance('0');
                setNextPaymentDate('');
                setUserLoans([]);
                setNotificationsCount(0);
            }
        };

        fetchUserData();
        // Update effect dependency to publicKey
    }, [publicKey]);

    const handleRequestLoan = () => {
        navigate('/loan');
    };

    const handleRepayLoan = (loanId) => {
        // Navigate to the loan repayment page with the specified loan ID
        navigate(`/repay/${loanId || 'all'}`);
    };

    const handleViewLoanDetail = (loanId) => {
        navigate(`/loan-detail/${loanId}`);
    };

    const handleNotificationsClick = () => {
        // Navigate to notifications page in a real app
        alert('Notifications feature will open here');
    };

    // Use isLoading state before checking publicKey
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
                {/* Use WalletMultiButton for connection */}
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
                        <h1 className="text-white text-3xl font-bold">{userName || 'User'}</h1>
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

                {/* Wallet Card - Updated props */}
                <div className="mb-6">
                    <WalletCard
                        userName={userName || 'User'}
                        balance={totalBalance}
                        walletAddress={publicKey ? publicKey.toBase58() : ''} // Pass Solana address
                        walletType={wallet ? wallet.adapter.name : 'Wallet'} // Use connected wallet name
                        currencySymbol="RM"
                    />
                </div>

                {/* Action Buttons */}
                <ActionButtons
                    onRepay={() => handleRepayLoan()}
                    onRequest={handleRequestLoan}
                />

                {/* User Loans Section */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Your Loans</h2>

                    {userLoans.length > 0 ? (
                        <div className="space-y-4">
                            {userLoans.map(loan => (
                                <div 
                                    key={loan.id} 
                                    className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => handleViewLoanDetail(loan.id)}
                                    tabIndex="0"
                                    onKeyDown={(e) => e.key === 'Enter' && handleViewLoanDetail(loan.id)}
                                    aria-label={`View details for ${loan.title} loan`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-lg font-semibold">{loan.title}</h3>
                                            <p className="text-sm text-gray-500">
                                                Due Date: <span className={loan.isOverdue ? "text-red-500 font-medium" : ""}>{loan.dueDate}</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent triggering card click
                                                handleRepayLoan(loan.id);
                                            }}
                                            className="bg-primary hover:bg-primaryHover text-white px-5 py-2 rounded-full text-sm font-medium"
                                        >
                                            Repay
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <p className="text-sm text-gray-500">Loan Balance</p>
                                            <p className="text-lg font-semibold text-secondary">RM {loan.balance}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Payment Amount</p>
                                            <p className="text-lg font-semibold text-secondary">RM {loan.paymentAmount}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                            <p className="text-gray-500 mb-4">You don't have any active loans yet.</p>
                            <button
                                onClick={handleRequestLoan}
                                className="bg-primary hover:bg-primaryHover text-white px-6 py-2 rounded-full text-sm font-medium"
                            >
                                Apply for a Loan
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </HalfCircleBackground>
    );
};

export default HomePage;