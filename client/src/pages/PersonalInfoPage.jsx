import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import { HiMail, HiLockClosed, HiEye, HiEyeOff, HiPhone } from 'react-icons/hi';

const PersonalInfoPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    dataConsentAccepted: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleGoogleSignup = () => {
    // In a real app, you would implement Google OAuth login here
    console.log('Signing up with Google...');
    navigate('/onboarding/job-info');
  };

  const handleContinue = () => {
    // No validation, just proceed to the next step
    navigate('/onboarding/job-info');
  };

  const handleSkip = () => {
    // Skip this step entirely
    navigate('/onboarding/job-info');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 flex items-center border-b border-gray-100">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="Go back"
        >
          <HiArrowLeft className="w-5 h-5" />
        </button>
        
        {/* Progress bar */}
        <div className="flex-1 px-4 flex flex-col justify-center mt-5">
          <div className="h-1 bg-gray-200 rounded-full">
            <div className="h-1 bg-secondary rounded-full" style={{ width: '20%' }}></div>
          </div>
          <div className="text-xs text-right text-gray-500 mt-1">1/5</div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Create Your Account</h1>
          <button
            onClick={handleSkip}
            className="text-secondary font-medium text-sm py-1 px-3 rounded-md hover:bg-secondary hover:bg-opacity-10"
          >
            Skip
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Please set up your account credentials. Personal details like your full name, date of birth, and address will be captured later from your ID card.
        </p>

        {/* Google Signup Button */}
        <button
          onClick={handleGoogleSignup}
          className="w-full flex justify-center items-center gap-3 border border-gray-300 py-3 px-4 rounded-lg mb-6 hover:bg-gray-50 transition"
        >
          <FcGoogle className="w-5 h-5" />
          <span className="font-medium">Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-gray-200 w-full"></div>
          <div className="absolute bg-white px-4 text-sm text-gray-500">or sign up with email</div>
        </div>

        <form className="space-y-5">
          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <HiMail className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a password"
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <HiLockClosed className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <HiLockClosed className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="flex items-center">
              <div className="flex items-center bg-gray-100 px-3 py-3 rounded-l-lg border border-gray-300 border-r-0">
                <span className="text-gray-600">🇲🇾</span>
                <span className="text-gray-600 ml-1">+60</span>
              </div>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="(123) 456-7890"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          {/* Data Consent */}
          <div className="mt-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="dataConsentAccepted"
                  name="dataConsentAccepted"
                  type="checkbox"
                  checked={formData.dataConsentAccepted}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="dataConsentAccepted" className="text-gray-700">
                  I accept the <Link to="/privacy-policy" className="text-secondary">Data Protection Policy</Link> and <Link to="/terms-of-service" className="text-secondary">Terms of Service</Link>
                </label>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="w-full bg-secondary text-white font-semibold py-4 rounded-lg hover:bg-secondaryLight transition duration-200"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default PersonalInfoPage;