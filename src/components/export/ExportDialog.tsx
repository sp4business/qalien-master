/**
 * Export Dialog Component
 * Tabbed dialog for PDF export (and future email export)
 */

'use client';

import { useState } from 'react';
import { X, FileText, Mail, Download, AlertCircle } from 'lucide-react';
import { Campaign } from '@/types/campaign';
import { CampaignAsset, PDFExportOptions } from '@/services/export/types';
import { PDFLogger } from '@/utils/pdfLogger';
import { useSupabaseClient } from '@/lib/supabase';
import { exportManager } from '@/services/export';
import { createPDFExportService } from '@/services/export/PDFExportService';
import { createReportDataService } from '@/services/report/ReportDataService';

interface ExportDialogProps {
  campaign: Campaign;
  assets: CampaignAsset[];
  brandId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportDialog({
  campaign,
  assets,
  brandId,
  isOpen,
  onClose
}: ExportDialogProps) {
  const supabase = useSupabaseClient();
  const [activeTab, setActiveTab] = useState<'pdf' | 'email'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    stage: string;
    percent: number;
    message: string;
  } | null>(null);

  // PDF Options
  const [pdfOptions, setPdfOptions] = useState<PDFExportOptions>({
    includeAnalysis: true,
    includeMetrics: true,
    includeRecommendations: true,
    includeAssets: true,
    includeThumbnails: true,
    includeTranscripts: false,
    format: 'detailed',
    pageSize: 'A4',
    orientation: 'portrait'
  });

  // Feature flag for email
  const emailFeatureEnabled = false;

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress({ stage: 'preparing', percent: 0, message: 'Initializing export...' });

    PDFLogger.log('Export', 'Export initiated from dialog', {
      campaignId: campaign.id,
      campaignName: campaign.name,
      exportType: activeTab,
      options: pdfOptions
    });

    try {
      // Register PDF exporter if not already registered
      if (!exportManager.isExportTypeAvailable('pdf')) {
        const pdfExporter = createPDFExportService();
        exportManager.registerExporter(pdfExporter);
        PDFLogger.log('Export', 'PDF exporter registered');
      }

      // Prepare campaign data
      setProgress({ stage: 'preparing', percent: 20, message: 'Preparing campaign data...' });
      const reportDataService = createReportDataService(supabase);
      const reportData = await reportDataService.prepareCampaignData(
        campaign,
        assets,
        brandId
      );

      PDFLogger.log('Export', 'Report data prepared', {
        campaignName: reportData.campaign.name,
        assetCount: reportData.assets.length,
        hasAnalysis: !!reportData.analysis
      });

      // Generate export
      setProgress({ stage: 'generating', percent: 50, message: 'Generating PDF...' });
      const result = await exportManager.export(
        'pdf',
        reportData,
        pdfOptions,
        (progress) => setProgress(progress)
      );

      if (result.success) {
        PDFLogger.log('Export', 'Export completed successfully', {
          fileName: result.fileName,
          fileSize: result.fileSize
        });
        
        setProgress({ 
          stage: 'complete', 
          percent: 100, 
          message: 'Export complete! Your download should start automatically.' 
        });
        
        // Close dialog after a short delay
        setTimeout(() => {
          onClose();
          setProgress(null);
        }, 2000);
      } else {
        throw new Error(result.error || 'Export failed');
      }

    } catch (error) {
      PDFLogger.error('Export', error as Error, {
        campaignId: campaign.id
      });
      
      setError(error instanceof Error ? error.message : 'An error occurred during export');
      setProgress(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-[#1A1F2E] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Export Campaign Report</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
              activeTab === 'pdf'
                ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </button>
          
          <button
            onClick={() => emailFeatureEnabled && setActiveTab('email')}
            disabled={!emailFeatureEnabled}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
              activeTab === 'email'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : emailFeatureEnabled
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email Report
            {!emailFeatureEnabled && (
              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full ml-2">
                Soon
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'pdf' ? (
            <div className="space-y-6">
              {/* Report Sections */}
              <div className="bg-[#2A3142] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Report Sections</h3>
                
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={pdfOptions.includeMetrics}
                    onChange={(e) => setPdfOptions({...pdfOptions, includeMetrics: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white">Campaign Metrics & Scores</span>
                </label>
                
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={pdfOptions.includeAnalysis}
                    onChange={(e) => setPdfOptions({...pdfOptions, includeAnalysis: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white">AI Analysis & Executive Summary</span>
                </label>
                
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={pdfOptions.includeRecommendations}
                    onChange={(e) => setPdfOptions({...pdfOptions, includeRecommendations: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white">Recommendations & Insights</span>
                </label>
                
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={pdfOptions.includeAssets}
                    onChange={(e) => setPdfOptions({...pdfOptions, includeAssets: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white">Individual Asset Analysis</span>
                </label>
              </div>

              {/* Asset Options */}
              {pdfOptions.includeAssets && (
                <div className="bg-[#2A3142] rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-4">Asset Options</h3>
                  
                  <label className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={pdfOptions.includeThumbnails}
                      onChange={(e) => setPdfOptions({...pdfOptions, includeThumbnails: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-white">Include Asset Thumbnails</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={pdfOptions.includeTranscripts}
                      onChange={(e) => setPdfOptions({...pdfOptions, includeTranscripts: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-white">Include Video Transcripts</span>
                    <span className="text-xs text-gray-500">(if available)</span>
                  </label>
                </div>
              )}

              {/* Format Options */}
              <div className="bg-[#2A3142] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Report Format</h3>
                
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setPdfOptions({...pdfOptions, format: 'detailed'})}
                    className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                      pdfOptions.format === 'detailed'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#1A1F2E] text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    Detailed
                  </button>
                  <button
                    onClick={() => setPdfOptions({...pdfOptions, format: 'summary'})}
                    className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                      pdfOptions.format === 'summary'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#1A1F2E] text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    Summary
                  </button>
                </div>

                <div className="text-xs text-gray-500">
                  {pdfOptions.format === 'detailed' 
                    ? 'Includes all details, feedback, and suggestions for each asset'
                    : 'Condensed version with key metrics and summary only'
                  }
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-300 font-medium mb-1">Export Information</p>
                    <p className="text-xs text-blue-200/80">
                      This report will include {assets.length} assets from the "{campaign.name}" campaign.
                      The PDF will be optimized for printing and sharing with stakeholders.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Email tab content (placeholder for future)
            <div className="flex flex-col items-center justify-center py-12">
              <Mail className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Email Reports Coming Soon</h3>
              <p className="text-gray-400 text-center max-w-md">
                Soon you'll be able to send campaign reports directly to stakeholders via email,
                with options for scheduling and custom recipient lists.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-300 font-medium">Export Error</p>
                  <p className="text-xs text-red-200/80 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {progress && (
            <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-300">{progress.message}</span>
                <span className="text-sm text-purple-400">{progress.percent}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isGenerating || activeTab === 'email'}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}