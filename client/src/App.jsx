import React from 'react';
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
  SelfiePage,
  UploadPayslipPage,
  OnboardingSuccessPage,
  NotFoundPage
} from "./pages";
import { ThemeProvider } from "./context/ThemeContext";

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
            <Route path="/loan" element={<LoanPage />} />
            <Route path="/lend" element={<LendPage />} />
            <Route path="/loan-confirmation" element={<LoanConfirmationPage />} />
            <Route path="/loan-success" element={<LoanSuccessPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/fund/:loanId" element={<LoanFundingPage />} />
            <Route path="/funding-review/:loanId" element={<FundingReviewPage />} />
            <Route path="/funding-success/:loanId" element={<LoanFundingSuccessPage />} />
            <Route path="/repay/:loanId" element={<LoanRepaymentPage />} />
            <Route path="/review-summary/:loanId" element={<ReviewSummaryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/lender-reports" element={<LenderReportsPage />} />
            
            {/* Onboarding routes */}
            <Route path="/onboarding" element={<Navigate to="/onboarding/welcome" replace />} />
            <Route path="/onboarding/welcome" element={<OnboardingWelcome />} />
            <Route path="/onboarding/personal-info" element={<PersonalInfoPage />} />
            <Route path="/onboarding/job-info" element={<JobInfoPage />} />
            <Route path="/onboarding/upload-id" element={<UploadIDPage />} />
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
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App;
