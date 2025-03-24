import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HalfCircleBackground } from '../components';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [isPremium] = useState(true); // In a real app, this would come from context/API

  return (
    <HalfCircleBackground title="Profile">
      <div className="pt-2">
      

        {/* Credit Score Section */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              {/* Circular progress bar */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#E5E7EB" 
                  strokeWidth="6"
                />
                {/* Progress circle - green */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#00A86B" 
                  strokeWidth="6"
                  strokeDasharray="280"
                  strokeDashoffset="85" 
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Score and triangle in center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="flex items-center text-sm font-medium text-green-600 mb-1">
                  <svg className="w-3 h-3 mr-1 fill-current" viewBox="0 0 24 24">
                    <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                  </svg>
                  +5pts
                </div>
                <div className="text-5xl font-bold mb-1">725</div>
                <div className="text-gray-600 text-sm flex items-center">
                  Good
                  <svg className="w-4 h-4 ml-1 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4M12 8h.01" />
                  </svg>
                </div>
                
                <div className="absolute bottom-4 w-full flex justify-between px-4 text-xs text-gray-500">
                  <span>0</span>
                  <span>850</span>
                </div>
              </div>
            </div>
            
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Updated after each repayment
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mb-6">
          <div className="flex flex-col items-center w-1/3">
            <div className="bg-white rounded-full p-4 shadow-sm mb-2 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v8m-4-4h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">Make Payment</span>
          </div>

          <div className="flex flex-col items-center w-1/3">
            <div className="bg-white rounded-full p-4 shadow-sm mb-2 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">Loan History</span>
          </div>

          <div className="flex flex-col items-center w-1/3">
            <div className="bg-white rounded-full p-4 shadow-sm mb-2 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="5" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="19" cy="12" r="1" fill="currentColor" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">More</span>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <svg className="w-5 h-5 mr-2 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-base font-bold">Loan Summary</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Repayment History</p>
              <p className="text-2xl font-bold mb-1">100%</p>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                <p className="text-sm text-gray-500">Excellent</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Loans</p>
              <p className="text-2xl font-bold mb-1">1</p>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                <p className="text-sm text-gray-500">Good</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Current Balance</p>
              <p className="text-2xl font-bold mb-1">RM 1,875</p>
              <div className="flex items-center justify-center">
                <span className="text-gray-500 text-xs">Next payment:</span>
                <span className="text-xs ml-1">15 Apr</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Max Loan Amount</p>
              <p className="text-2xl font-bold mb-1">RM 5,000</p>
              <div>
                <span className="text-xs text-secondary">Excellent</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/loan-history')}
            className="mt-6 w-full text-blue-500 text-center flex items-center justify-center"
          >
            See Full History →
          </button>
        </div>
      </div>
    </HalfCircleBackground>
  );
};

export default ProfilePage; 