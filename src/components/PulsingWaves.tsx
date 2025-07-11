'use client';

import React from 'react';
import '../styles/qalien-animations.css';

interface PulsingWavesProps {
  waveCount?: number;
  color?: string;
  intensity?: 'low' | 'medium' | 'high';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  position?: 'center' | 'top-left' | 'top-right';
}

const PulsingWaves: React.FC<PulsingWavesProps> = ({
  waveCount = 4,
  color = '#A78BFA',
  intensity = 'medium',
  size = 'medium',
  className = '',
  position = 'center'
}) => {
  
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  const positionClasses = {
    center: 'inset-0',
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0'
  };

  const intensityDelays = {
    low: [0, 0.6, 1.2, 1.8],
    medium: [0, 0.4, 0.8, 1.2],
    high: [0, 0.3, 0.6, 0.9]
  };

  const delays = intensityDelays[intensity];

  return (
    <div className={`
      absolute ${positionClasses[position]} ${sizeClasses[size]} 
      flex items-center justify-center pointer-events-none
      ${className}
    `}>
      {Array.from({ length: waveCount }, (_, index) => (
        <div
          key={index}
          className="wave-pulse absolute rounded-full border-2"
          style={{
            borderColor: color,
            opacity: 0.3 - (index * 0.05),
            animationDelay: `${delays[index] || index * 0.3}s`,
            width: '100%',
            height: '100%'
          }}
        />
      ))}
    </div>
  );
};

export default PulsingWaves;