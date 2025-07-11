import React from 'react';

export type QAlienStatus = 'error' | 'auth' | 'processing' | 'success' | 'empty' | 'general';

interface QAlienContextualCharacterProps {
  status: QAlienStatus;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const QAlienContextualCharacter: React.FC<QAlienContextualCharacterProps> = ({ 
  status, 
  size = 'lg', 
  className = '' 
}) => {
  // Size mapping
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  // Status to PNG mapping
  const statusImageMap = {
    error: '/qalien-error.png',
    auth: '/qalien.png', // Temporarily use original for testing
    processing: '/qalien-processing.png',
    success: '/qalien-success.png',
    empty: '/qalien-empty.png',
    general: '/qalien.png'
  };

  // Status to overlay animation class mapping
  const statusOverlayMap = {
    error: 'alien-error-overlay',
    auth: 'alien-auth-overlay',
    processing: 'alien-processing-overlay',
    success: 'alien-success-overlay',
    empty: 'alien-empty-overlay',
    general: ''
  };

  // Status to descriptive alt text mapping
  const statusAltMap = {
    error: 'QAlien character with finger pointing to head, indicating an error state',
    auth: 'QAlien character with authentication interface, indicating login process',
    processing: 'QAlien character with rotating rings, indicating processing state',
    success: 'QAlien character with thumbs up, indicating successful completion',
    empty: 'QAlien character with magnifying glass, indicating empty or searching state',
    general: 'QAlien mascot character in default state'
  };

  const imageSource = statusImageMap[status];
  const overlayClass = statusOverlayMap[status];
  const altText = statusAltMap[status];

  return (
    <div className={`alien-contextual relative ${sizeClasses[size]} ${className}`}>
      {/* Main QAlien Image */}
      <img 
        src={imageSource}
        alt={altText}
        className="alien-contextual-image w-full h-full object-contain"
        role="img"
        aria-label={altText}
      />
      
      {/* Animation Overlay for targeted animations */}
      {overlayClass && (
        <div className={`alien-animation-overlay ${overlayClass}`} />
      )}
    </div>
  );
};

export default QAlienContextualCharacter;