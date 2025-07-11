'use client';

interface PDFAnalysisResult {
  logos?: {
    url: string;
    confidence: number;
    extracted: boolean;
  }[];
  colors?: {
    hex: string;
    frequency: number;
    extracted: boolean;
  }[];
  disclaimers?: string[];
  vocabulary?: {
    approved: string[];
    banned: string[];
  };
  isProcessing: boolean;
  isComplete: boolean;
  error?: string;
}

interface PDFAnalysisResultsProps {
  analysis: PDFAnalysisResult;
  onUseExtractedData?: () => void;
  showActionButtons?: boolean;
}

export default function PDFAnalysisResults({ 
  analysis, 
  onUseExtractedData, 
  showActionButtons = false 
}: PDFAnalysisResultsProps) {
  if (analysis.isProcessing) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="text-lg font-semibold text-blue-300">Analyzing PDF...</span>
        </div>
        <div className="space-y-2 text-sm text-blue-400/80">
          <p className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Extracting logos and iconography</span>
          </p>
          <p className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-200"></div>
            <span>Analyzing color palette</span>
          </p>
          <p className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-400"></div>
            <span>Processing brand vocabulary</span>
          </p>
          <p className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-600"></div>
            <span>Extracting compliance rules</span>
          </p>
        </div>
      </div>
    );
  }

  if (analysis.error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-red-300 font-semibold">Analysis Failed</p>
            <p className="text-red-400/80 text-sm mt-1">{analysis.error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis.isComplete) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-300">PDF Analysis Complete!</h3>
            <p className="text-green-400/80 text-sm">Successfully extracted brand assets from your guidelines</p>
          </div>
        </div>
        {showActionButtons && onUseExtractedData && (
          <button
            onClick={onUseExtractedData}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Use Extracted Data
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1F2E] rounded-lg p-3 border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">{analysis.logos?.length || 0}</div>
          <div className="text-xs text-green-400/80">Logos Detected</div>
        </div>
        <div className="bg-[#1A1F2E] rounded-lg p-3 border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">{analysis.colors?.length || 0}</div>
          <div className="text-xs text-green-400/80">Colors Extracted</div>
        </div>
        <div className="bg-[#1A1F2E] rounded-lg p-3 border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">{analysis.disclaimers?.length || 0}</div>
          <div className="text-xs text-green-400/80">Disclaimers Found</div>
        </div>
        <div className="bg-[#1A1F2E] rounded-lg p-3 border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">
            {(analysis.vocabulary?.approved?.length || 0) + (analysis.vocabulary?.banned?.length || 0)}
          </div>
          <div className="text-xs text-green-400/80">Vocabulary Terms</div>
        </div>
      </div>

      {/* Extracted Logos Preview */}
      {analysis.logos && analysis.logos.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-green-300 mb-3 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>Extracted Logos</span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {analysis.logos.map((logo, index) => (
              <div key={index} className="bg-[#1A1F2E] border border-green-500/20 rounded-lg p-3">
                <div className="aspect-square bg-white rounded-md mb-2 flex items-center justify-center">
                  <div className="text-gray-500 text-xs">Logo {index + 1}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-400">Confidence</span>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    logo.confidence > 0.9 
                      ? 'bg-green-500/20 text-green-300' 
                      : logo.confidence > 0.7 
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {Math.round(logo.confidence * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Colors Preview */}
      {analysis.colors && analysis.colors.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-green-300 mb-3 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            <span>Brand Color Palette</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.colors.map((color, index) => (
              <div key={index} className="flex items-center space-x-2 bg-[#1A1F2E] rounded-lg px-3 py-2 border border-green-500/20">
                <div
                  className="w-6 h-6 rounded border border-gray-600"
                  style={{ backgroundColor: color.hex }}
                ></div>
                <div className="text-xs">
                  <div className="text-white font-mono">{color.hex}</div>
                  <div className="text-green-400/80">{Math.round(color.frequency * 100)}% usage</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vocabulary Preview */}
      {analysis.vocabulary && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-green-300 mb-3 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Brand Vocabulary</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.vocabulary.approved && analysis.vocabulary.approved.length > 0 && (
              <div className="bg-[#1A1F2E] border border-green-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-300">Approved Terms</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.vocabulary.approved.map((term, index) => (
                    <span key={index} className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.vocabulary.banned && analysis.vocabulary.banned.length > 0 && (
              <div className="bg-[#1A1F2E] border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-300">Banned Terms</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.vocabulary.banned.map((term, index) => (
                    <span key={index} className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimers Preview */}
      {analysis.disclaimers && analysis.disclaimers.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-300 mb-3 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Required Disclaimers</span>
          </h4>
          <div className="space-y-2">
            {analysis.disclaimers.map((disclaimer, index) => (
              <div key={index} className="bg-[#1A1F2E] border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-300 font-mono">{disclaimer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}