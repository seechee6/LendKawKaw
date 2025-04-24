import React from 'react';

const CreditScoreGauge = ({ score }) => {
  // Calculate the percentage (300-850 range)
  const percentage = ((score - 300) / (850 - 300)) * 100;
  
  // Determine color based on score
  const getColor = () => {
    if (score >= 750) return '#22c55e'; // green-500
    if (score >= 700) return '#4ade80'; // green-400
    if (score >= 650) return '#facc15'; // yellow-400
    if (score >= 600) return '#fb923c'; // orange-400
    return '#ef4444'; // red-500
  };
  
  // Calculate the stroke dash offset
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Background circle */}
      <svg className="w-full h-full" viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="transparent"
          stroke="#334155" // slate-700
          strokeWidth="12"
        />
        
        {/* Score progress */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="transparent"
          stroke={getColor()}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
        />
        
        {/* Score ranges markers */}
        <text x="30" y="155" fill="#94a3b8" fontSize="10">300</text>
        <text x="65" y="30" fill="#94a3b8" fontSize="10">600</text>
        <text x="140" y="155" fill="#94a3b8" fontSize="10">850</text>
      </svg>
      
      {/* Score display */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-sm text-gray-300 mt-1">Credit Score</span>
      </div>
    </div>
  );
};

export default CreditScoreGauge;