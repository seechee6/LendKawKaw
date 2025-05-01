import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiCamera } from 'react-icons/hi';

const SelfiePage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [livenessStatus, setLivenessStatus] = useState('inactive'); // 'inactive', 'checking', 'verified', 'failed'
  const [cameraActive, setCameraActive] = useState(false);
  const [livenessPrompt, setLivenessPrompt] = useState('');
  
  const livenessPrompts = [
    'Please blink slowly',
    'Look to the left',
    'Look to the right',
    'Now look straight ahead'
  ];

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [cameraActive]);
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setLivenessStatus('checking');
        startLivenessCheck();
      }
    } catch (err) {
      console.error('Error accessing the camera:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  const startLivenessCheck = () => {
    // Simulate liveness detection process
    let currentPromptIndex = 0;
    
    const promptInterval = setInterval(() => {
      if (currentPromptIndex < livenessPrompts.length) {
        setLivenessPrompt(livenessPrompts[currentPromptIndex]);
        currentPromptIndex++;
      } else {
        clearInterval(promptInterval);
        setLivenessPrompt('Verification complete');
        setLivenessStatus('verified');
        captureImage();
      }
    }, 1500);
    
    return () => clearInterval(promptInterval);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const imageDataUrl = canvas.toDataURL('image/png');
      setCapturedImage(imageDataUrl);
      
      // Stop camera after capturing
      stopCamera();
      setCameraActive(false);
    }
  };

  const handleTryAgain = () => {
    setCapturedImage(null);
    setLivenessStatus('inactive');
    setLivenessPrompt('');
  };

  const handleStartLiveness = () => {
    setCameraActive(true);
  };

  const handleContinue = () => {
    // No need to validate, just continue
    navigate('/onboarding/upload-payslip');
  };

  const handleSkip = () => {
    // Skip this step entirely
    navigate('/onboarding/upload-payslip');
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
            <div className="h-1 bg-secondary rounded-full" style={{ width: '100%' }}></div>
          </div>
          <div className="text-xs text-right text-gray-500 mt-1">5/5</div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">Face Verification</h1>
          <button
            onClick={handleSkip}
            className="text-secondary font-medium text-sm py-1 px-3 rounded-md hover:bg-secondary hover:bg-opacity-10"
          >
            Skip
          </button>
        </div>
        <p className="text-gray-600 mb-6">Complete a quick liveness check to verify your identity. Follow the on-screen instructions.</p>

        {/* Liveness Detection Section */}
        <div className="flex-1 flex flex-col items-center mb-8">
          <canvas ref={canvasRef} className="hidden"></canvas>
          
          {capturedImage ? (
            <div className="relative w-full">
              <img 
                src={capturedImage} 
                alt="Captured selfie" 
                className="w-full h-64 object-cover border border-gray-300 rounded-lg"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                Verified
              </div>
              <button 
                onClick={handleTryAgain}
                className="mt-4 text-secondary hover:text-secondaryLight font-medium"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="w-full h-72 bg-gray-100 rounded-xl relative overflow-hidden">
              {cameraActive ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  ></video>
                  
                  {/* Liveness prompt overlay */}
                  {livenessStatus === 'checking' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-20 text-white">
                      <div className="bg-black bg-opacity-70 px-4 py-2 rounded-lg">
                        {livenessPrompt}
                      </div>
                    </div>
                  )}
                  
                  {/* Positioning guide */}
                  <div className="absolute inset-0 border-2 border-dashed border-white m-4 rounded-full pointer-events-none"></div>
                </>
              ) : (
                <div className="absolute w-full h-full flex items-center justify-center">
                  <div className="relative">
                    {/* Simple face outline */}
                    <div className="w-32 h-48 flex flex-col items-center">
                      {/* Head */}
                      <div className="w-24 h-24 border-4 border-gray-300 rounded-full"></div>
                      
                      {/* Body outline */}
                      <div className="w-24 h-20 border-t-0 border-4 border-gray-300 mt-1 rounded-b-xl"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!cameraActive && !capturedImage && (
            <button 
              onClick={handleStartLiveness}
              className="mt-6 bg-secondary text-white rounded-full p-4 shadow-lg hover:bg-secondaryLight transition-colors focus:outline-none"
            >
              <HiCamera className="w-8 h-8" />
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Tips for successful verification:</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Ensure you're in a well-lit environment</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Remove glasses or anything covering your face</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Follow all on-screen instructions carefully</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Keep your face within the outline</span>
            </li>
          </ul>
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

export default SelfiePage;