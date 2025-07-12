'use client';

interface ComplianceScoreBarProps {
  score: number;
  compact?: boolean;
}

export default function ComplianceScoreBar({ score, compact = false }: ComplianceScoreBarProps) {
  // Ensure score is a valid number
  const safeScore = typeof score === 'number' && !isNaN(score) ? Math.max(0, Math.min(100, score)) : 0;
  
  const getScoreColor = () => {
    if (safeScore >= 90) return 'bg-green-500';
    if (safeScore >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (safeScore >= 90) return 'text-green-400';
    if (safeScore >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getScoreColor()} transition-all duration-500`}
            style={{ width: `${safeScore}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${getTextColor()}`}>
          {safeScore}%
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-5xl font-bold text-white">{safeScore}%</span>
        <span className={`text-sm px-3 py-1 rounded-full ${
          safeScore >= 90 ? 'bg-green-500/20 text-green-400' :
          safeScore >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {safeScore >= 90 ? 'Excellent' : safeScore >= 70 ? 'Good' : 'Needs Improvement'}
        </span>
      </div>
      <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getScoreColor()} transition-all duration-500 relative`}
          style={{ width: `${safeScore}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>0</span>
        <span>Brand Compliance Score</span>
        <span>100</span>
      </div>
    </div>
  );
}