'use client';

import React, { useState, useEffect } from 'react';
import QAlienContextualCharacter, { QAlienStatus } from './QAlienContextualCharacter';
import LoadingMessage from './LoadingMessage';
import PulsingWaves from './PulsingWaves';
import { getRandomLoadingMessage, DEFAULT_TYPE_MESSAGES } from '../constants/loadingMessages';
import '../styles/qalien-animations.css';

interface QAlienLoadingScreenProps {
  isVisible: boolean;
  type?: 'organizations' | 'brands' | 'campaigns' | 'processing' | 'uploading' | 'auth' | 'general' | 'error' | 'success' | 'empty';
  message?: string;
  progress?: number;
  onComplete?: () => void;
  className?: string;
  showProgress?: boolean;
  duration?: number; // minimum display duration in ms
}

const QAlienLoadingScreen: React.FC<QAlienLoadingScreenProps> = ({
  isVisible,
  type = 'general',
  message,
  progress,
  onComplete,
  className = '',
  showProgress = false,
  duration = 1000
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [shouldShow, setShouldShow] = useState(false);
  const [messageRotationInterval, setMessageRotationInterval] = useState<NodeJS.Timeout | null>(null);

  // Use the new constants for default messages, fallback to random messages
  const defaultMessages = DEFAULT_TYPE_MESSAGES;

  // Map loading screen types to QAlien status
  const typeToStatusMap: Record<string, QAlienStatus> = {
    organizations: 'general',
    brands: 'general', 
    campaigns: 'general',
    processing: 'processing',
    uploading: 'processing',
    auth: 'auth',
    general: 'general',
    error: 'error',
    success: 'success',
    empty: 'empty'
  };

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      setIsAnimating(true);
      
      // Set initial message - either provided message or random from collection
      const initialMessage = message || getRandomLoadingMessage();
      setCurrentMessage(initialMessage);
      
      // Start message rotation every 3 seconds if no specific message provided
      if (!message) {
        const interval = setInterval(() => {
          setCurrentMessage(getRandomLoadingMessage());
        }, 3000);
        setMessageRotationInterval(interval);
      }
    } else {
      setIsAnimating(false);
      
      // Clear message rotation interval
      if (messageRotationInterval) {
        clearInterval(messageRotationInterval);
        setMessageRotationInterval(null);
      }
      
      // Wait for fade out animation before hiding completely
      const hideTimer = setTimeout(() => {
        setShouldShow(false);
        if (onComplete) {
          onComplete();
        }
      }, 300);
      
      return () => clearTimeout(hideTimer);
    }
  }, [isVisible, message, type, onComplete]);

  // Minimum display duration
  useEffect(() => {
    if (isVisible && duration > 0) {
      const minTimer = setTimeout(() => {
        // This ensures the loading screen shows for at least `duration` ms
      }, duration);
      
      return () => clearTimeout(minTimer);
    }
  }, [isVisible, duration]);
  
  // Cleanup rotation interval on unmount
  useEffect(() => {
    return () => {
      if (messageRotationInterval) {
        clearInterval(messageRotationInterval);
      }
    };
  }, [messageRotationInterval]);

  if (!shouldShow) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        loading-background qalien-loading-overlay qalien-loading-container
        transition-all duration-500 ease-out
        ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        ${className}
      `}
      role="dialog"
      aria-label="Loading content"
      aria-live="polite"
      aria-busy={isVisible}
      tabIndex={-1}
    >
      {/* Background Overlay with animated gradient */}
      <div className="absolute inset-0 loading-background" />
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-12 px-6">
        
        {/* Main QAlien Character with surrounding waves */}
        <div className="relative">
          {/* Large outer pulsing waves - only show for general/processing states, NOT auth */}
          {(typeToStatusMap[type] === 'general' || typeToStatusMap[type] === 'processing') && (
            <>
              <PulsingWaves
                waveCount={4}
                color="#A78BFA"
                intensity="medium"
                size="large"
                className="opacity-60"
              />
              
              {/* Medium inner waves */}
              <PulsingWaves
                waveCount={3}
                color="#C084FC"
                intensity="high"
                size="medium"
                className="opacity-40"
              />
            </>
          )}
          
          {/* QAlien Contextual Character - Shows different status images with animations */}
          <QAlienContextualCharacter
            status={typeToStatusMap[type]}
            size="xl"
            className="transform scale-110 drop-shadow-2xl"
          />
        </div>
        
        {/* Loading Message with typing effect */}
        <LoadingMessage
          message={currentMessage}
          isVisible={isVisible}
          showProgress={showProgress}
          progress={progress}
          showTypingEffect={true}
          showLoadingDots={true}
          className="max-w-md"
        />
        
        {/* Optional Progress Bar */}
        {showProgress && progress !== undefined && (
          <div className="w-80 max-w-sm">
            <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-purple-400 via-purple-300 to-cyan-300 transition-all duration-700 ease-out progress-fill"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="text-center text-sm text-purple-300 mt-2 font-medium">
              {Math.round(progress)}% Complete
            </div>
          </div>
        )}
        
        {/* Decorative floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating alien-themed particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`
                absolute rounded-full opacity-20
                ${i % 3 === 0 ? 'w-2 h-2 bg-green-400' : i % 3 === 1 ? 'w-1 h-1 bg-purple-400' : 'w-1.5 h-1.5 bg-cyan-400'}
                animate-float-${(i % 3) + 1}
              `}
              style={{
                left: `${15 + (i * 12)}%`,
                top: `${20 + ((i % 4) * 15)}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${6 + (i % 3)}s`
              }}
            />
          ))}
          
          {/* Additional decorative elements */}
          {[...Array(4)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full opacity-30 animate-pulse"
              style={{
                left: `${25 + (i * 20)}%`,
                top: `${30 + (i * 10)}%`,
                animationDelay: `${i * 1.2}s`,
                animationDuration: `${2 + i}s`
              }}
            />
          ))}
        </div>
        
        {/* Bottom decoration */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-2 text-purple-300 text-sm font-medium opacity-60">
            <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-purple-400"></div>
            <span>QAlien</span>
            <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-purple-400"></div>
          </div>
        </div>
      </div>
      
      {/* Subtle vignette effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-purple-900/20 pointer-events-none" />
    </div>
  );
};

export default QAlienLoadingScreen;