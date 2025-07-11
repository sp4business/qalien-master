'use client';

import React from 'react';
import QAlienLoadingScreen from './QAlienLoadingScreen';
import { useQAlienLoading } from '../hooks/useQAlienLoading';

// Example component demonstrating all loading screen features
const QAlienLoadingExample: React.FC = () => {
  const {
    isVisible,
    type,
    message,
    progress,
    startLoading,
    stopLoading,
    updateProgress,
    updateMessage,
    setLoadingWithProgress
  } = useQAlienLoading();

  const handleSimpleLoading = () => {
    startLoading('organizations', 'Fetching your organizations...');
    
    // Simulate async operation
    setTimeout(() => {
      stopLoading();
    }, 3000);
  };

  const handleProgressLoading = async () => {
    await setLoadingWithProgress(
      'uploading',
      async () => {
        // Simulate actual work
        await new Promise(resolve => setTimeout(resolve, 1000));
      },
      [
        { message: 'Preparing files...', progress: 0 },
        { message: 'Uploading assets...', progress: 25 },
        { message: 'Processing images...', progress: 50 },
        { message: 'Analyzing content...', progress: 75 },
        { message: 'Finalizing upload...', progress: 100 }
      ]
    );
  };

  const handleBrandLoading = () => {
    startLoading('brands', 'Loading your brands...');
    setTimeout(() => stopLoading(), 2500);
  };

  const handleCampaignLoading = () => {
    startLoading('campaigns', 'Loading campaign details...');
    setTimeout(() => stopLoading(), 2000);
  };

  const handleProcessingLoading = () => {
    startLoading('processing', 'Processing your request...');
    setTimeout(() => stopLoading(), 4000);
  };

  const handleAuthLoading = () => {
    startLoading('auth', 'Authenticating...');
    setTimeout(() => stopLoading(), 1500);
  };

  return (
    <div className="min-h-screen bg-[#0F1117] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          QAlien Loading Screen Demo
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={handleSimpleLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
          >
            Organizations Loading
          </button>
          
          <button
            onClick={handleBrandLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
          >
            Brands Loading
          </button>
          
          <button
            onClick={handleCampaignLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
          >
            Campaigns Loading
          </button>
          
          <button
            onClick={handleProcessingLoading}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
          >
            Processing Loading
          </button>
          
          <button
            onClick={handleAuthLoading}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
          >
            Auth Loading
          </button>
          
          <button
            onClick={handleProgressLoading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-4 px-6 rounded-lg transition-colors"
          >
            Progress Loading
          </button>
        </div>
        
        <div className="bg-[#1A1D29] rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Features Demonstrated</h2>
          <ul className="text-gray-300 space-y-2">
            <li>• Contextual loading messages based on operation type</li>
            <li>• Smooth fade in/out animations</li>
            <li>• Pulsing QAlien character with wave effects</li>
            <li>• Progress bar support for long operations</li>
            <li>• Typing animation for messages</li>
            <li>• Floating particle effects</li>
            <li>• Accessibility features (ARIA labels, reduced motion)</li>
            <li>• Performance optimizations</li>
          </ul>
        </div>
        
        {isVisible && (
          <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg">
            Current: {type} - {message}
            {progress !== undefined && ` (${progress}%)`}
          </div>
        )}
      </div>
      
      <QAlienLoadingScreen
        isVisible={isVisible}
        type={type}
        message={message}
        progress={progress}
        showProgress={progress !== undefined}
        duration={800}
      />
    </div>
  );
};

export default QAlienLoadingExample;