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
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  const handleGoogleSignup = () => {
    // In a real app, you would implement Google OAuth login here
    console.log('Signing up with Google...');
    // After successful Google auth, we would get user information
    // and pre-fill relevant form fields
  };

  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.phoneNumber) errors.phoneNumber = 'Phone number is required';
    
    // Data consent validation
    if (!formData.dataConsentAccepted) {
      errors.dataConsentAccepted = 'You must agree to the data protection policy';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      // In a real app, you would save the account details here
      navigate('/onboarding/job-info');
    } else {
      // Scroll to the first error
      const firstErrorElement = document.querySelector('.error-message');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
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
        <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
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
                className={`w-full px-4 py-3 pl-10 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition`}
                required
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <HiMail className="w-5 h-5" />
              </div>
            </div>
            {formErrors.email && (
              <p className="text-red-500 text-sm mt-1 error-message">{formErrors.email}</p>
            )}
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
                className={`w-full px-4 py-3 pl-10 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition`}
                required
                minLength="8"
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
            {formErrors.password && (
              <p className="text-red-500 text-sm mt-1 error-message">{formErrors.password}</p>
            )}
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
                className={`w-full px-4 py-3 pl-10 border ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition`}
                required
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
            {formErrors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1 error-message">{formErrors.confirmPassword}</p>
            )}
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
                className={`flex-1 px-4 py-3 border ${formErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'} rounded-r-lg focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition`}
                required
              />
            </div>
            {formErrors.phoneNumber && (
              <p className="text-red-500 text-sm mt-1 error-message">{formErrors.phoneNumber}</p>
            )}
          </div>

          {/* Data Protection Consent */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">Data Protection Consent</h3>
            <p className="text-sm text-gray-600 mb-4">
              In accordance with the Personal Data Protection Act 2010, we collect and process your personal data to:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Process your loan application internally</li>
                <li>Perform credit scoring and identity verification within our system</li>
                <li>Communicate with you about our services</li>
                <li>Fulfill legal and regulatory requirements</li>
              </ul>
            </p>
            
            <p className="text-sm text-gray-600 mb-4">
              Your data will be used exclusively for internal processing and will not be shared with third parties.
              We are committed to protecting your privacy in accordance with the Personal Data Protection Act 2010.
              For the purposes of providing our services, this data will be retained throughout the duration of your relationship with us.
            </p>
            
            <div className="flex items-start mt-2">
              <div className="flex items-center h-5">
                <input
                  id="dataConsentAccepted"
                  name="dataConsentAccepted"
                  type="checkbox"
                  checked={formData.dataConsentAccepted}
                  onChange={handleInputChange}
                  className={`h-5 w-5 text-secondary focus:ring-secondary border-gray-300 rounded ${formErrors.dataConsentAccepted ? 'border-red-500' : ''}`}
                />
              </div>
              <label htmlFor="dataConsentAccepted" className="ml-3 text-sm">
                I explicitly consent to the collection and processing of my personal data for the purposes stated above, as required by the Personal Data Protection Act 2010.
              </label>
            </div>
            {formErrors.dataConsentAccepted && (
              <p className="text-red-500 text-sm mt-1 error-message">{formErrors.dataConsentAccepted}</p>
            )}
          </div>
        </form>
      </div>

      {/* Bottom button */}
      <div className="px-6 py-4 border-t border-gray-100">
        <button
          onClick={handleContinue}
          className="w-full bg-secondary text-white font-semibold py-4 rounded-lg hover:bg-secondaryLight transition duration-200"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default PersonalInfoPage;