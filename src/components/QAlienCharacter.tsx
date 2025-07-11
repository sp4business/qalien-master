'use client';

import React, { useState, useEffect } from 'react';
import '../styles/qalien-animations.css';

interface QAlienCharacterProps {
  size?: 'small' | 'medium' | 'large';
  showWaves?: boolean;
  className?: string;
}

const QAlienCharacter: React.FC<QAlienCharacterProps> = ({
  size = 'medium',
  showWaves = true,
  className = ''
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  
  // Random blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000);
    
    return () => clearInterval(blinkInterval);
  }, []);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  // No animation classes needed - alien stays static

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Large pulsing waves around character */}
      {showWaves && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="wave-pulse absolute w-full h-full rounded-full border-2 border-purple-400 opacity-30"></div>
          <div className="wave-pulse absolute w-full h-full rounded-full border-2 border-purple-400 opacity-30"></div>
          <div className="wave-pulse absolute w-full h-full rounded-full border-2 border-purple-400 opacity-30"></div>
          <div className="wave-pulse absolute w-full h-full rounded-full border-2 border-purple-300 opacity-20"></div>
        </div>
      )}
      
      {/* Main Character Container - Static (no animations) */}
      <div className={`
        alien-character relative z-10 w-full h-full flex items-center justify-center
      `}>
        {/* Use the actual PNG image you provided */}
        <img
          src="/qalien.png"
          alt="QAlien mascot character"
          className="w-full h-full object-contain drop-shadow-2xl"
          role="img"
        />
      </div>
    </div>
  );
};

export default QAlienCharacter;