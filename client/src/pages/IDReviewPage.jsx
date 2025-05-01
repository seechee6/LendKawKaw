import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiIdentification, HiLocationMarker, HiUser, HiCalendar, HiPencil, HiAcademicCap } from 'react-icons/hi';

const IDReviewPage = () => {
  const navigate = useNavigate();
  const [idCardInfo, setIdCardInfo] = useState({
    name: '',
    identificationNumber: '',
    address: '',
    dateOfBirth: '',
    education: '' // Added education field
  });
  const [editMode, setEditMode] = useState({
    name: false,
    identificationNumber: false,
    address: false,
    dateOfBirth: false,
    education: false // Added education edit mode
  });

  useEffect(() => {
    // Retrieve the ID card information from session storage
    const storedInfo = sessionStorage.getItem('idCardInfo');
    if (storedInfo) {
      try {
        const parsedInfo = JSON.parse(storedInfo);
        setIdCardInfo(parsedInfo);
      } catch (error) {
        console.error('Error parsing ID card info:', error);
        // Instead of redirecting back, just proceed with empty data
        setIdCardInfo({
          name: '',
          identificationNumber: '',
          address: '',
          dateOfBirth: '',
          education: ''
        });
      }
    }
    // No redirection even if no data is found
  }, []);

  const handleInputChange = (field, value) => {
    setIdCardInfo({
      ...idCardInfo,
      [field]: value
    });
  };

  const toggleEditMode = (field) => {
    setEditMode({
      ...editMode,
      [field]: !editMode[field]
    });
  };

  const handleContinue = () => {
    // Save confirmed information to session storage
    sessionStorage.setItem('confirmedIdCardInfo', JSON.stringify(idCardInfo));
    navigate('/onboarding/selfie');
  };

  const handleSkip = () => {
    // Skip this step entirely
    navigate('/onboarding/selfie');
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
            <div className="h-1 bg-secondary rounded-full" style={{ width: '85%' }}></div>
          </div>
          <div className="text-xs text-right text-gray-500 mt-1">4/5</div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">Review Your Information</h1>
          <button
            onClick={handleSkip}
            className="text-secondary font-medium text-sm py-1 px-3 rounded-md hover:bg-secondary hover:bg-opacity-10"
          >
            Skip
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Please confirm the information we extracted from your ID card. This information will be used to verify your identity and process your loan application.
        </p>

        <div className="space-y-5">
          {/* Name */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <HiUser className="w-5 h-5 text-secondary mr-2" />
                <h2 className="font-medium">Full Name</h2>
              </div>
              <button 
                onClick={() => toggleEditMode('name')}
                className="text-secondary hover:text-secondaryLight text-sm flex items-center"
              >
                <HiPencil className="w-4 h-4 mr-1" />
                {editMode.name ? 'Done' : 'Edit'}
              </button>
            </div>
            {editMode.name ? (
              <input
                type="text"
                value={idCardInfo.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-secondary focus:border-transparent outline-none"
                autoFocus
              />
            ) : (
              <p className="text-gray-700 px-2 py-3 bg-gray-50 rounded">{idCardInfo.name || 'Not available'}</p>
            )}
          </div>

          {/* Identification Number */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <HiIdentification className="w-5 h-5 text-secondary mr-2" />
                <h2 className="font-medium">Identification Number</h2>
              </div>
              <button 
                onClick={() => toggleEditMode('identificationNumber')}
                className="text-secondary hover:text-secondaryLight text-sm flex items-center"
              >
                <HiPencil className="w-4 h-4 mr-1" />
                {editMode.identificationNumber ? 'Done' : 'Edit'}
              </button>
            </div>
            {editMode.identificationNumber ? (
              <input
                type="text"
                value={idCardInfo.identificationNumber || ''}
                onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-secondary focus:border-transparent outline-none"
                autoFocus
              />
            ) : (
              <p className="text-gray-700 px-2 py-3 bg-gray-50 rounded">{idCardInfo.identificationNumber || 'Not available'}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <HiCalendar className="w-5 h-5 text-secondary mr-2" />
                <h2 className="font-medium">Date of Birth</h2>
              </div>
              <button 
                onClick={() => toggleEditMode('dateOfBirth')}
                className="text-secondary hover:text-secondaryLight text-sm flex items-center"
              >
                <HiPencil className="w-4 h-4 mr-1" />
                {editMode.dateOfBirth ? 'Done' : 'Edit'}
              </button>
            </div>
            {editMode.dateOfBirth ? (
              <input
                type="text"
                value={idCardInfo.dateOfBirth || ''}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-secondary focus:border-transparent outline-none"
                placeholder="DD/MM/YYYY"
                autoFocus
              />
            ) : (
              <p className="text-gray-700 px-2 py-3 bg-gray-50 rounded">{idCardInfo.dateOfBirth || 'Not available'}</p>
            )}
          </div>

          {/* Address */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-start">
                <HiLocationMarker className="w-5 h-5 text-secondary mr-2 mt-0.5" />
                <h2 className="font-medium">Home Address</h2>
              </div>
              <button 
                onClick={() => toggleEditMode('address')}
                className="text-secondary hover:text-secondaryLight text-sm flex items-center"
              >
                <HiPencil className="w-4 h-4 mr-1" />
                {editMode.address ? 'Done' : 'Edit'}
              </button>
            </div>
            {editMode.address ? (
              <textarea
                value={idCardInfo.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-secondary focus:border-transparent outline-none"
                rows={3}
                autoFocus
              />
            ) : (
              <p className="text-gray-700 px-2 py-3 bg-gray-50 rounded whitespace-pre-line">{idCardInfo.address || 'Not available'}</p>
            )}
          </div>

          {/* Education */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <HiAcademicCap className="w-5 h-5 text-secondary mr-2" />
                <h2 className="font-medium">Education <span className="text-gray-400 text-xs">(Optional)</span></h2>
              </div>
              <button 
                onClick={() => toggleEditMode('education')}
                className="text-secondary hover:text-secondaryLight text-sm flex items-center"
              >
                <HiPencil className="w-4 h-4 mr-1" />
                {editMode.education ? 'Done' : 'Edit'}
              </button>
            </div>
            {editMode.education ? (
              <select
                value={idCardInfo.education || ''}
                onChange={(e) => handleInputChange('education', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-secondary focus:border-transparent outline-none"
                autoFocus
              >
                <option value="">-- Select Education Level (Optional) --</option>
                <option value="High School">High School</option>
                <option value="Bachelor's Degree">Bachelor's Degree</option>
                <option value="Master's Degree">Master's Degree</option>
                <option value="Doctorate">Doctorate</option>
              </select>
            ) : (
              <p className="text-gray-700 px-2 py-3 bg-gray-50 rounded">
                {idCardInfo.education || 'Not specified'}
              </p>
            )}
          </div>

          {/* Data Privacy Notice */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="font-semibold text-blue-800 mb-2">Data Privacy Notice</h3>
            <p className="text-sm text-blue-700">
              The information above has been extracted from your ID card and will be used only for identity verification, 
              fraud prevention, and loan processing purposes. This data is protected under our Data Protection Policy 
              that you consented to during registration.
            </p>
          </div>
        </div>
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

export default IDReviewPage;