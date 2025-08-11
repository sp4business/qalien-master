'use client';

import { useState, useEffect } from 'react';
import ComplianceScoreBar from './ComplianceScoreBar';

interface ComplianceCategory {
  category?: string;
  check?: string;
  result?: 'pass' | 'warn' | 'fail';
  details?: string;
  icon?: string;
  score?: number;
  status?: 'pass' | 'warning' | 'fail';
  feedback?: string;
  suggestions?: string[];
}

interface Creative {
  creative_id: string;
  name: string;
  compliance_score: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  upload_date: string;
  mime_type: string;
  thumbnail_url?: string;
  frontend_report?: ComplianceCategory[];
  overall_status?: 'approved' | 'warning' | 'failed' | 'pass' | 'warn' | 'fail';
  analysis?: {
    executive_summary: string;
    details: {
      logo_usage: { score: number; notes: string };
      color_palette: { score: number; notes: string };
      typography: { score: number; notes: string };
      messaging_tone: { score: number; notes: string };
      layout_composition: { score: number; notes: string };
    };
  };
  legend_results?: any;
  raw_transcript_data?: any;
}

interface CreativeDetailModalProps {
  creative: Creative;
  isOpen: boolean;
  onClose: () => void;
}

export default function CreativeDetailModal({ creative, isOpen, onClose }: CreativeDetailModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [helpfulVote, setHelpfulVote] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !creative) return null;

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleHelpfulVote = (vote: boolean) => {
    setHelpfulVote(vote);
    console.log('User voted:', vote ? 'Yes' : 'No');
  };

  const generateExecutiveSummary = (report: ComplianceCategory[]): string => {
    if (!report || report.length === 0) {
      return 'Analysis is being processed. Please check back soon for detailed compliance results.';
    }
    
    const avgScore = report.reduce((acc, cat) => acc + cat.score, 0) / report.length;
    const failingCategories = report.filter(cat => cat.status === 'fail');
    const warningCategories = report.filter(cat => cat.status === 'warning');
    
    if (avgScore >= 90 && failingCategories.length === 0) {
      return 'Excellent brand compliance! This asset maintains high standards across all categories with only minor suggestions for enhancement.';
    } else if (avgScore >= 70 && failingCategories.length === 0) {
      return `Good overall compliance with an average score of ${Math.round(avgScore)}%. Some categories need attention: ${warningCategories.map(c => c.category).join(', ')}.`;
    } else {
      return `This asset requires improvements in several areas. Critical issues found in: ${failingCategories.map(c => c.category).join(', ')}. Please address these to meet brand standards.`;
    }
  };

  const officialCategoryIcons: Record<string, string> = {
    'Logos/Iconography': '🏷️',
    'Colors/Palette': '🎨',
    'Brand Vocabulary': '📝',
    'Brand Tone': '💬',
    'Disclaimers & Required Language': '⚖️',
    'Layout/Safe-zone': '📐'
  };

  // Check if asset is still being processed
  const isProcessing = creative.status === 'pending' || creative.status === 'processing';
  const frontendReport = creative.frontend_report || [];

  const analysisCategories = creative.analysis ? [
    { key: 'logo_usage', label: 'Logo Usage', icon: '🏷️' },
    { key: 'color_palette', label: 'Color Palette', icon: '🎨' },
    { key: 'typography', label: 'Typography', icon: '✏️' },
    { key: 'messaging_tone', label: 'Messaging Tone', icon: '💬' },
    { key: 'layout_composition', label: 'Layout & Composition', icon: '📐' }
  ] : [];

  const getStatusBadge = () => {
    const statusConfig = {
      Approved: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '✓' },
      Warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '⚠' },
      Failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '✗' },
      completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '✓' },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '✗' },
      pending: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '⏳' },
      processing: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '⚙️' }
    };
    const config = statusConfig[creative.status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '?' };
    const displayStatus = creative.status === 'completed' ? 'Completed' : 
                         creative.status === 'failed' ? 'Failed' :
                         creative.status === 'pending' ? 'Pending' :
                         creative.status === 'processing' ? 'Processing' :
                         creative.status;
    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${config.bg} ${config.text}`}>
        <span>{config.icon}</span>
        <span>{displayStatus}</span>
      </span>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-[#1A1D29] rounded-2xl shadow-2xl transition-all max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-[#0F1117] px-6 py-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-white">{creative.name}</h2>
                  {getStatusBadge()}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="mb-6 text-sm text-gray-400">
                Campaign: <span className="text-white">Summer Gelatin Campaign 2024</span>
              </div>

              {/* Media Preview Section */}
              {creative.thumbnail_url && (
                <div className="mb-8 bg-[#0F1117] rounded-xl p-4">
                  <h3 className="text-lg font-medium text-white mb-4">Creative Preview</h3>
                  {creative.mime_type?.startsWith('video/') ? (
                    <div className="relative rounded-lg overflow-hidden bg-black">
                      <video
                        src={creative.thumbnail_url}
                        className="w-full max-h-[500px] object-contain"
                        controls
                        controlsList="nodownload"
                        crossOrigin="anonymous"
                        playsInline
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden bg-gray-900">
                      <img
                        src={creative.thumbnail_url}
                        alt={creative.name}
                        className="w-full max-h-[500px] object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-64 text-gray-500">Failed to load image</div>';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="bg-green-500/10 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-medium text-white mb-4">Compliance Score</h3>
                {isProcessing ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-700 rounded-lg"></div>
                    <div className="mt-2 h-4 w-24 bg-gray-700 rounded"></div>
                  </div>
                ) : (
                  <ComplianceScoreBar score={creative.compliance_score || 0} />
                )}
              </div>

              <div className="bg-blue-500/10 border-l-4 border-blue-500 rounded-lg p-6 mb-8">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Executive Summary</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {isProcessing 
                        ? 'Analysis in progress...' 
                        : (creative.analysis?.executive_summary || generateExecutiveSummary(frontendReport))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0F1117] rounded-xl p-6 mb-8">
                <p className="text-gray-300 mb-4">Is this analysis helpful?</p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleHelpfulVote(true)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                      helpfulVote === true
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span>Yes</span>
                  </button>
                  <button
                    onClick={() => handleHelpfulVote(false)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                      helpfulVote === false
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                    <span>No</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-6">Detailed Analysis</h3>
                <div className="space-y-4">
                  {isProcessing ? (
                    // Show skeleton loaders when processing
                    <>
                      {['Brand Tone', 'Logo & Iconography', 'Color Palette', 'Brand Vocabulary', 'Disclaimers & Required Language', 'Layout/Safe-zone'].map((category, idx) => (
                        <div key={category + idx} className="bg-[#0F1117] rounded-lg overflow-hidden animate-pulse">
                          <div className="px-6 py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-700 rounded"></div>
                                <div className="h-5 w-32 bg-gray-700 rounded"></div>
                                <div className="h-6 w-20 bg-gray-700 rounded"></div>
                              </div>
                              <div className="w-5 h-5 bg-gray-700 rounded"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : frontendReport && frontendReport.length > 0 ? (
                    frontendReport.map((item, idx) => {
                      // Support both old and new format
                      const categoryName = item.category || item.check || 'Unknown Check';
                      const isExpanded = expandedSections.has(categoryName);
                      const itemStatus = item.status || item.result || 'pass';
                      
                      // Map status values
                      const statusDisplay = itemStatus === 'warn' ? 'warning' : itemStatus;
                      
                      // Get icon
                      const icon = item.icon || officialCategoryIcons[categoryName] || 
                        (categoryName === 'Brand Tone' ? '💬' :
                         categoryName === 'Color Palette' ? '🎨' :
                         categoryName === 'Content Type' ? '📱' :
                         categoryName === 'Brand Vocabulary' ? '📝' : '📋');
                      
                      return (
                        <div key={categoryName + idx} className="bg-[#0F1117] rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleSection(categoryName)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{icon}</span>
                              <span className="font-medium text-white">{categoryName}</span>
                              {item.score !== undefined && (
                                <ComplianceScoreBar score={item.score} compact />
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                statusDisplay === 'pass' ? 'bg-green-500/20 text-green-400' :
                                statusDisplay === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {statusDisplay.toUpperCase()}
                              </span>
                            </div>
                            <svg 
                              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-6 pb-4 border-t border-gray-800">
                              <p className="text-gray-300 mt-4 leading-relaxed">
                                {item.feedback || item.details || 'No additional details available.'}
                              </p>
                              {item.suggestions && item.suggestions.length > 0 && (
                                <div className="mt-4">
                                  <p className="text-sm font-medium text-purple-400 mb-2">Suggestions for improvement:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {item.suggestions.map((suggestion, index) => (
                                      <li key={index} className="text-sm text-gray-400">
                                        {suggestion}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : analysisCategories.length > 0 && creative.analysis ? (
                    analysisCategories.map((category) => {
                      const analysisDetails = creative.analysis.details;
                      const detail = analysisDetails[category.key as keyof typeof analysisDetails];
                      const isExpanded = expandedSections.has(category.key);
                      
                      return (
                        <div key={category.key} className="bg-[#0F1117] rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleSection(category.key)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{category.icon}</span>
                              <span className="font-medium text-white">{category.label}</span>
                              <ComplianceScoreBar score={detail.score} compact />
                            </div>
                            <svg 
                              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-6 pb-4 border-t border-gray-800">
                              <p className="text-gray-300 mt-4 leading-relaxed">
                                {detail.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-[#0F1117] rounded-lg p-6 text-center">
                      <p className="text-gray-400">
                        {creative.status === 'failed' 
                          ? 'Analysis failed. Please try uploading the asset again.'
                          : 'No analysis data available.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
                <div className="flex items-center space-x-3">
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-5.148 3.282M6.684 10.658a9 9 0 01-3.282 5.148M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Share</span>
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}