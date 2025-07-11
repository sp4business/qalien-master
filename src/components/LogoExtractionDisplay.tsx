'use client';

interface ExtractedLogo {
  url: string;
  confidence: number;
  extracted: boolean;
  name?: string;
  size?: { width: number; height: number };
}

interface LogoExtractionDisplayProps {
  logos: ExtractedLogo[];
  onLogoSelect?: (logo: ExtractedLogo, index: number) => void;
  onLogoRemove?: (index: number) => void;
  selectable?: boolean;
  removable?: boolean;
  title?: string;
  showConfidenceThreshold?: boolean;
  minConfidence?: number;
}

export default function LogoExtractionDisplay({
  logos,
  onLogoSelect,
  onLogoRemove,
  selectable = false,
  removable = false,
  title = "Extracted Logos",
  showConfidenceThreshold = true,
  minConfidence = 0.7
}: LogoExtractionDisplayProps) {
  if (!logos || logos.length === 0) {
    return (
      <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-8 text-center">
        <div className="w-12 h-12 bg-gray-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <p className="text-gray-400 font-medium">No logos detected</p>
        <p className="text-gray-500 text-sm mt-1">
          Try uploading a higher quality PDF or manually upload your logo files
        </p>
      </div>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'green';
    if (confidence >= 0.7) return 'yellow';
    return 'red';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  const filteredLogos = showConfidenceThreshold 
    ? logos.filter(logo => logo.confidence >= minConfidence)
    : logos;

  const lowConfidenceCount = logos.length - filteredLogos.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">
            {filteredLogos.length} detected
          </div>
        </div>
        
        {showConfidenceThreshold && lowConfidenceCount > 0 && (
          <div className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
            {lowConfidenceCount} hidden (low confidence)
          </div>
        )}
      </div>

      {/* Confidence Threshold Info */}
      {showConfidenceThreshold && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-blue-300">AI Detection Results</span>
          </div>
          <p className="text-xs text-blue-400/80">
            Showing logos with {Math.round(minConfidence * 100)}%+ confidence. 
            Higher confidence scores indicate more reliable logo detection.
          </p>
        </div>
      )}

      {/* Logo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLogos.map((logo, index) => {
          const confidenceColor = getConfidenceColor(logo.confidence);
          const confidenceLabel = getConfidenceLabel(logo.confidence);
          
          return (
            <div
              key={index}
              className={`bg-[#2A3142] border border-gray-700 rounded-xl p-4 transition-all hover:border-blue-500/50 ${
                selectable ? 'cursor-pointer hover:shadow-lg' : ''
              }`}
              onClick={() => selectable && onLogoSelect?.(logo, index)}
            >
              {/* Logo Preview */}
              <div className="aspect-square bg-white rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                {logo.url ? (
                  <img 
                    src={logo.url} 
                    alt={`Logo ${index + 1}`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`${logo.url ? 'hidden' : ''} text-gray-400 text-sm text-center`}>
                  <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-2"></div>
                  Logo {index + 1}
                </div>
                
                {/* Confidence Badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                  confidenceColor === 'green' 
                    ? 'bg-green-500/90 text-white' 
                    : confidenceColor === 'yellow' 
                    ? 'bg-yellow-500/90 text-black'
                    : 'bg-red-500/90 text-white'
                }`}>
                  {Math.round(logo.confidence * 100)}%
                </div>
              </div>
              
              {/* Logo Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium text-sm">
                      {logo.name || `Logo ${index + 1}`}
                    </div>
                    {logo.size && (
                      <div className="text-gray-400 text-xs">
                        {logo.size.width} × {logo.size.height}px
                      </div>
                    )}
                  </div>
                  
                  {removable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLogoRemove?.(index);
                      }}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Confidence Indicator */}
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        confidenceColor === 'green' 
                          ? 'bg-green-500' 
                          : confidenceColor === 'yellow' 
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${logo.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-medium ${
                    confidenceColor === 'green' 
                      ? 'text-green-400' 
                      : confidenceColor === 'yellow' 
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}>
                    {confidenceLabel}
                  </span>
                </div>
                
                {/* Action Buttons */}
                {selectable && (
                  <div className="pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLogoSelect?.(logo, index);
                      }}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Select Logo
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confidence Legend */}
      <div className="bg-[#1A1F2E] border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Confidence Score Guide</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="text-green-400 text-sm font-medium">High (90%+)</div>
              <div className="text-green-400/70 text-xs">Very reliable detection</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div>
              <div className="text-yellow-400 text-sm font-medium">Medium (70-89%)</div>
              <div className="text-yellow-400/70 text-xs">Good detection, review recommended</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div>
              <div className="text-red-400 text-sm font-medium">Low (&lt;70%)</div>
              <div className="text-red-400/70 text-xs">Manual verification needed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}