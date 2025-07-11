'use client';

import React, { useState, useEffect } from 'react';
import '../styles/qalien-animations.css';

interface LoadingMessageProps {
  message: string;
  isVisible: boolean;
  showProgress?: boolean;
  progress?: number;
  className?: string;
  showTypingEffect?: boolean;
  showLoadingDots?: boolean;
}

const LoadingMessage: React.FC<LoadingMessageProps> = ({
  message,
  isVisible,
  showProgress = false,
  progress,
  className = '',
  showTypingEffect = true,
  showLoadingDots = true
}) => {
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      setDisplayedMessage('');
      setIsTyping(false);
      return;
    }

    if (!showTypingEffect) {
      setDisplayedMessage(message);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedMessage('');
    setShowCursor(true);

    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < message.length) {
        setDisplayedMessage(prev => prev + message[index]);
        index++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        // Hide cursor after typing is complete
        setTimeout(() => setShowCursor(false), 1000);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [message, isVisible, showTypingEffect]);

  // Cursor blinking effect
  useEffect(() => {
    if (!showCursor) return;

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, [showCursor, isTyping]);

  if (!isVisible) return null;

  return (
    <div className={`text-center space-y-6 ${className}`}>
      {/* Main loading message */}
      <div className="text-xl md:text-2xl font-medium text-white min-h-[2rem]">
        <span className="inline-block">
          {displayedMessage}
          {(isTyping || showCursor) && (
            <span 
              className={`inline-block w-0.5 h-6 ml-1 bg-purple-300 transition-opacity duration-150 ${
                showCursor ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ animation: showCursor ? 'blinkCursor 1s step-end infinite' : 'none' }}
            />
          )}
        </span>
      </div>
      
      {/* Progress information */}
      {showProgress && progress !== undefined && (
        <div className="text-sm text-purple-300 font-medium">
          {Math.round(progress)}% complete
        </div>
      )}
      
      {/* Animated loading dots - only show when not typing */}
      {showLoadingDots && !isTyping && (
        <div className="flex space-x-2 justify-center items-center">
          <div className="w-3 h-3 bg-purple-400 rounded-full loading-dot" />
          <div className="w-3 h-3 bg-purple-400 rounded-full loading-dot" />
          <div className="w-3 h-3 bg-purple-400 rounded-full loading-dot" />
        </div>
      )}
      
      {/* Subtle shimmer effect under text */}
      <div className="h-0.5 w-32 mx-auto bg-gradient-to-r from-transparent via-purple-400 to-transparent shimmer opacity-60" />
    </div>
  );
};

export default LoadingMessage;