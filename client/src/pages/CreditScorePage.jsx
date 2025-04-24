import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, CreditScoreGauge } from '../components';

const CreditScorePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    age: '',
    monthlySalary: '',
    education: 'High School'
  });
  const [creditScore, setCreditScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const calculateCreditScore = async () => {
    setLoading(true);
    setError('');
    
    // Simple validation
    if (!formData.age || !formData.monthlySalary) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }
    
    const age = parseInt(formData.age);
    const salary = parseFloat(formData.monthlySalary);
    
    if (age < 18 || age > 100) {
      setError('Age must be between 18 and 100');
      setLoading(false);
      return;
    }
    
    if (salary <= 0) {
      setError('Salary must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      // Call the Flask API
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age: age,
          monthlySalary: salary,
          education: formData.education
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get prediction');
      }
      
      const result = await response.json();
      
      // Calculate rating based on credit score
      let rating;
      const score = result.credit_score;
      
      if (score >= 750) rating = 'Excellent';
      else if (score >= 700) rating = 'Good';
      else if (score >= 650) rating = 'Fair';
      else if (score >= 600) rating = 'Poor';
      else rating = 'Bad';
      
      setCreditScore({
        score: score,
        rating: rating,
        prediction: result.prediction,
        probabilities: result.probabilities
      });
      
    } catch (err) {
      console.error("Error calculating credit score:", err);
      setError('Error calculating credit score. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    calculateCreditScore();
  };

  const getProbabilityBar = (percent) => {
    return (
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div 
          className="bg-blue-500 h-2.5 rounded-full" 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="flex w-full justify-center items-center gradient-bg-services min-h-screen">
      <div className="flex flex-col items-center justify-center md:p-20 py-12 px-4 max-w-4xl">
        <h1 className="text-3xl sm:text-5xl text-white py-1 font-semibold">
          Credit Score Prediction
        </h1>
        <p className="text-center mt-5 text-white font-light md:w-9/12 w-11/12 text-base">
          Get an estimate of your credit score based on your age, monthly salary, and education level.
        </p>

        {error && (
          <div className="mt-5 p-3 w-full max-w-md bg-red-500 rounded-md text-white text-center">
            {error}
          </div>
        )}

        <div className="p-5 sm:w-96 w-full flex flex-col justify-start items-center blue-glassmorphism mt-10">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="mb-4">
              <label className="text-white">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="age"
                placeholder="Enter your age"
                value={formData.age}
                onChange={handleChange}
                className="w-full p-2 bg-transparent border border-gray-300 rounded-md text-white"
                required
                min="18"
                max="100"
              />
            </div>
            
            <div className="mb-4">
              <label className="text-white">
                Monthly Salary (RM) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="monthlySalary"
                placeholder="Enter your monthly salary"
                value={formData.monthlySalary}
                onChange={handleChange}
                className="w-full p-2 bg-transparent border border-gray-300 rounded-md text-white"
                required
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="mb-4">
              <label className="text-white">
                Education Level
              </label>
              <select
                name="education"
                value={formData.education}
                onChange={handleChange}
                className="w-full p-2 bg-transparent border border-gray-300 rounded-md text-white"
              >
                <option value="High School">High School</option>
                <option value="Bachelor's Degree">Bachelor's Degree</option>
                <option value="Master's Degree">Master's Degree</option>
                <option value="Doctorate">Doctorate</option>
              </select>
            </div>
            
            <div className="h-[1px] w-full bg-gray-400 my-2" />
            
            <button
              type="submit"
              disabled={loading}
              className="text-white w-full mt-2 border-[1px] p-2 border-[#3d4f7c] hover:bg-[#3d4f7c] rounded-full cursor-pointer"
            >
              {loading ? <Loader /> : "Calculate Credit Score"}
            </button>
          </form>
        </div>

        {creditScore && (
          <div className="mt-10 p-5 w-full max-w-md blue-glassmorphism">
            <h2 className="text-2xl text-white font-bold mb-4 text-center">Credit Score Result</h2>
            
            <div className="flex flex-col items-center justify-center mb-6">
              <CreditScoreGauge score={creditScore.score} />
              <div className={`text-xl font-semibold mt-3 ${
                creditScore.rating === 'Excellent' ? 'text-green-400' :
                creditScore.rating === 'Good' ? 'text-green-300' :
                creditScore.rating === 'Fair' ? 'text-yellow-300' :
                creditScore.rating === 'Poor' ? 'text-orange-400' : 'text-red-500'
              }`}>
                {creditScore.rating}
              </div>
              <div className="text-white opacity-70 text-sm mt-1">
                {creditScore.prediction === 'High' ? 'High approval chance' :
                 creditScore.prediction === 'Average' ? 'Moderate approval chance' :
                 'Low approval chance'}
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-white text-lg mb-2">Credit Category Probabilities</h3>
              <div className="space-y-2">
                {Object.entries(creditScore.probabilities).map(([category, probability]) => (
                  <div key={category} className="text-white">
                    <div className="flex justify-between mb-1">
                      <span>{category}</span>
                      <span>{probability.toFixed(1)}%</span>
                    </div>
                    {getProbabilityBar(probability)}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4 text-white text-sm opacity-80 p-3 bg-gray-800 rounded">
              <h4 className="font-semibold mb-1">Important Factors:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Age: {formData.age} years</li>
                <li>Monthly Income: RM {parseFloat(formData.monthlySalary).toLocaleString()}</li>
                <li>Education: {formData.education}</li>
              </ul>
              <p className="mt-2 text-xs">
                This is an estimated score based on limited factors.
                Actual credit scores consider many additional variables.
              </p>
            </div>
          </div>
        )}
        
        <button
          onClick={() => navigate('/')}
          className="text-white mt-10 border-[1px] p-2 border-[#3d4f7c] hover:bg-[#3d4f7c] rounded-full cursor-pointer px-6"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default CreditScorePage;