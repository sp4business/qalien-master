'use client';

interface Creative {
  creative_id: string;
  name: string;
  compliance_score: number;
  status: 'Approved' | 'Warning' | 'Failed';
  upload_date: string;
  mime_type: string;
}

interface CreativeCardProps {
  creative: Creative;
  onClick: () => void;
}

export default function CreativeCard({ creative, onClick }: CreativeCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'text-green-400';
      case 'Warning':
        return 'text-yellow-400';
      case 'Failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const isVideo = creative.mime_type.startsWith('video/');

  return (
    <div 
      onClick={onClick}
      className="bg-[#0F1117] rounded-lg p-6 border border-gray-800 hover:border-purple-600 transition-all cursor-pointer group"
    >
      {/* Creative Preview */}
      <div className="relative h-40 bg-gray-900 rounded-lg mb-4 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {isVideo ? (
            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        
        {/* Compliance Score Badge */}
        <div className="absolute top-2 right-2">
          <div className={`px-3 py-1 bg-black/80 rounded-full flex items-center space-x-1`}>
            <span className={`text-lg font-bold ${getScoreColor(creative.compliance_score)}`}>
              {creative.compliance_score}%
            </span>
          </div>
        </div>
      </div>

      {/* Creative Info */}
      <div className="space-y-3">
        <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors line-clamp-1">
          {creative.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className={`text-sm ${getStatusColor(creative.status)}`}>
            {creative.status}
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