import React, { useState } from 'react';
import QAlienLoadingScreen from './QAlienLoadingScreen';
import { useQAlienLoading } from '../hooks/useQAlienLoading';

const QAlienLoadingTest: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState<string | null>(null);
  const loading = useQAlienLoading();

  const demoStates = [
    { type: 'error', label: 'Error State' },
    { type: 'auth', label: 'Auth State' },
    { type: 'processing', label: 'Processing State' },
    { type: 'success', label: 'Success State' },
    { type: 'empty', label: 'Empty State' },
    { type: 'general', label: 'General State' }
  ];

  const handleDemoState = (type: string) => {
    setCurrentDemo(type);
    
    switch (type) {
      case 'error':
        loading.showError('Test error message');
        break;
      case 'auth':
        loading.showAuth('Test auth message');
        break;
      case 'processing':
        loading.showProcessing('Test processing message');
        break;
      case 'success':
        loading.showTemporarySuccess('Test success message');
        break;
      case 'empty':
        loading.showEmpty('Test empty message');
        break;
      case 'general':
        loading.startLoading('general', 'Test general message');
        break;
    }
  };

  const stopDemo = () => {
    loading.stopLoading();
    setCurrentDemo(null);
  };

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">QAlien Loading States Demo</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {demoStates.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => handleDemoState(type)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${currentDemo === type 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="text-center mt-6">
        <button
          onClick={stopDemo}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Stop Demo
        </button>
      </div>

      <QAlienLoadingScreen
        isVisible={loading.isVisible}
        type={loading.type}
        message={loading.message}
        progress={loading.progress}
        onComplete={() => setCurrentDemo(null)}
      />
    </div>
  );
};

export default QAlienLoadingTest;