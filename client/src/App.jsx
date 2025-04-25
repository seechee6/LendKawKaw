import {React,useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar, Footer, Transactions, Services, ThemeSwitcher } from "./components";
import { 
  LoanPage, 
  LendPage, 
  LoanConfirmationPage, 
  HomePage, 
  LoanSuccessPage, 
  ProfilePage, 
  TransactionsPage, 
  LoanRepaymentPage, 
  ReviewSummaryPage, 
  PremiumPage, 
  LenderReportsPage,
  LoanFundingPage,
  FundingReviewPage,
  LoanFundingSuccessPage,
  // Onboarding pages
  OnboardingWelcome,
  PersonalInfoPage,
  JobInfoPage,
  UploadIDPage,
  IDReviewPage,
  SelfiePage,
  UploadPayslipPage,
  OnboardingSuccessPage,
  NotFoundPage,
  WithdrawTutorialPage,
  SolanaTestPage,
  LoanDetailPage,
  CreditScorePage,
  SmsTestPage
} from "./pages";
import { ThemeProvider } from "./context/ThemeContext";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { TransactionsProvider } from "./context/TransactionContext";

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

// Component to conditionally render Navbar based on route
const AppContent = () => {
  const location = useLocation();
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  
  // Set to true to enable theme switcher for development/testing
  const showThemeSwitcher = false;
  
  return (
    <div className="min-h-screen">
      <div className="min-h-screen bg-neutral">
        {!isOnboardingRoute && <Navbar />}
        <div className={!isOnboardingRoute ? "pt-16" : ""}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<HomePage />} />
            
            {/* Loan application flow */}
            <Route path="/loan" element={<LoanPage />} />
            <Route path="/loan-confirmation" element={<LoanConfirmationPage />} />
            <Route path="/loan-success" element={<LoanSuccessPage />} />
            <Route path="/loan-detail/:loanId" element={<LoanDetailPage />} />
            
            {/* Loan funding flow */}
            <Route path="/lend" element={<LendPage />} />
            <Route path="/fund/:loanId" element={<LoanFundingPage />} />
            <Route path="/funding-review/:loanId" element={<FundingReviewPage />} />
            <Route path="/funding-success/:loanId" element={<LoanFundingSuccessPage />} />
            
            {/* Loan repayment flow */}
            <Route path="/repay/:loanId" element={<LoanRepaymentPage />} />
            <Route path="/review-summary/:loanId" element={<ReviewSummaryPage />} />
            
            {/* Other pages */}
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/credit-score" element={<CreditScorePage />} />
            <Route path="/lender-reports" element={<LenderReportsPage />} />
            <Route path="/withdraw-tutorial" element={<WithdrawTutorialPage />} />
            <Route path="/solana-test" element={<SolanaTestPage />} />
            <Route path="/sms-test" element={<SmsTestPage />} />
            
            {/* Onboarding routes */}
            <Route path="/onboarding" element={<Navigate to="/onboarding/welcome" replace />} />
            <Route path="/onboarding/welcome" element={<OnboardingWelcome />} />
            <Route path="/onboarding/personal-info" element={<PersonalInfoPage />} />
            <Route path="/onboarding/job-info" element={<JobInfoPage />} />
            <Route path="/onboarding/upload-id" element={<UploadIDPage />} />
            <Route path="/onboarding/id-review" element={<IDReviewPage />} />
            <Route path="/onboarding/selfie" element={<SelfiePage />} />
            <Route path="/onboarding/upload-payslip" element={<UploadPayslipPage />} />
            <Route path="/onboarding/success" element={<OnboardingSuccessPage />} />
            
            {/* 404 route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        {showThemeSwitcher && <ThemeSwitcher />}
      </div>
    </div>
  );
};

const App = () => {
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
      () => [
          /**
           * Wallets that implement either of these standards will be available automatically.
           *
           *   - Solana Mobile Stack Mobile Wallet Adapter Protocol
           *     (https://github.com/solana-mobile/mobile-wallet-adapter)
           *   - Solana Wallet Standard
           *     (https://github.com/anza-xyz/wallet-standard)
           *
           * If you wish to support a wallet that supports neither of those standards,
           * instantiate its legacy wallet adapter here. Common legacy adapters can be found
           * in the npm package `@solana/wallet-adapter-wallets`.
           */
          new UnsafeBurnerWalletAdapter(),
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [network]
  );
  return (

        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                  <TransactionsProvider>
      <ThemeProvider>

        <Router>
                  <AppContent />
        </Router>
      </ThemeProvider>
      </TransactionsProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
  );
};

export default App;
