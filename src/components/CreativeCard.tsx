'use client';

import { useState } from 'react';

interface Creative {
  creative_id: string;
  name: string;
  compliance_score: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'Approved' | 'Warning' | 'Failed';
  upload_date: string;
  mime_type: string;
  thumbnail_url?: string;
}

interface CreativeCardProps {
  creative: Creative;
  onClick: () => void;
  onDelete?: (creativeId: string) => void;
}

export default function CreativeCard({ creative, onClick, onDelete }: CreativeCardProps) {
  const [imageError, setImageError] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'completed':
      case 'pass':
        return 'text-green-400';
      case 'Warning':
      case 'warn':
        return 'text-yellow-400';
      case 'Failed':
      case 'failed':
      case 'fail':
        return 'text-red-400';
      case 'pending':
      case 'processing':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const isVideo = creative.mime_type.startsWith('video/') || 
    creative.thumbnail_url?.endsWith('.mp4') || 
    creative.thumbnail_url?.endsWith('.webm') || 
    creative.thumbnail_url?.endsWith('.mov');
  const isProcessing = creative.status === 'pending' || creative.status === 'processing';

  return (
    <div 
      className="bg-[#0F1117] rounded-lg p-6 border border-gray-800 hover:border-purple-600 transition-all cursor-pointer group relative"
    >
      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(creative.creative_id);
          }}
          className="absolute top-2 right-2 z-10 p-2 bg-red-600/80 hover:bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete asset"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Creative Preview */}
      <div className="relative h-40 bg-gray-900 rounded-lg mb-4 overflow-hidden" onClick={onClick}>
        {creative.thumbnail_url && !isVideo && !imageError ? (
          <img 
            src={creative.thumbnail_url} 
            alt={creative.name}
            className="w-full h-full object-cover"
            onError={() => {
              console.error('Failed to load image:', creative.thumbnail_url);
              setImageError(true);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isVideo ? (
              <>
                {creative.thumbnail_url && !imageError && (
                  <video
                    src={creative.thumbnail_url}
                    className="absolute inset-0 w-full h-full object-cover"
                    crossOrigin="anonymous"
                    muted
                    playsInline
                    preload="metadata"
                    onError={() => {
                      console.error('Failed to load video:', creative.thumbnail_url);
                      setImageError(true);
                    }}
                    onLoadedMetadata={(e) => {
                      // Seek to 1 second to show a frame
                      const video = e.currentTarget;
                      video.currentTime = 1;
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <svg className="w-12 h-12 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </>
            ) : (
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        )}
        
        {/* Compliance Score Badge or Processing Status */}
        <div className="absolute top-2 right-2">
          {isProcessing ? (
            <div className="px-3 py-1 bg-purple-600/80 rounded-full flex items-center space-x-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-white">Processing</span>
            </div>
          ) : (
            <div className={`px-3 py-1 bg-black/80 rounded-full flex items-center space-x-1`}>
              <span className={`text-lg font-bold ${getScoreColor(creative.compliance_score)}`}>
                {creative.compliance_score}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Creative Info */}
      <div className="space-y-3" onClick={onClick}>
        <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors line-clamp-1">
          {creative.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className={`text-sm ${getStatusColor(creative.status)}`}>
            {isProcessing ? 'Analysis Pending' : 
             creative.status === 'completed' ? 'Completed' :
             creative.status === 'failed' ? 'Failed' :
             creative.status === 'pending' ? 'Pending' :
             creative.status === 'processing' ? 'Processing' :
             creative.status}
          </span>
          <span className="text-xs text-gray-500">
            Uploaded {creative.upload_date}
          </span>
        </div>
      </div>

      {/* Hover Effect Indicator */}
      <div className="absolute inset-0 rounded-lg pointer-events-none">
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-purple-600/10 to-transparent" />
      </div>
    </div>
  );
}