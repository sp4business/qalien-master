/**
 * Export Button Component
 * Modular button that supports PDF now and email later
 */

'use client';

import { useState } from 'react';
import { Download, FileText, Mail, ChevronDown, Settings } from 'lucide-react';
import { Campaign } from '@/types/campaign';
import { CampaignAsset } from '@/services/export/types';
import { PDFLogger } from '@/utils/pdfLogger';
import ExportDialog from './ExportDialog';

interface ExportButtonProps {
  campaign: Campaign;
  assets: CampaignAsset[];
  brandId?: string;
  className?: string;
}

export default function ExportButton({ 
  campaign, 
  assets, 
  brandId,
  className = ''
}: ExportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Feature flags - email will be enabled in future
  const emailFeatureEnabled = false;

  PDFLogger.log('Init', 'Export button rendered', {
    campaignId: campaign.id,
    campaignName: campaign.name,
    assetCount: assets.length,
    emailEnabled: emailFeatureEnabled
  });

  const handleQuickPDF = () => {
    PDFLogger.log('Export', 'Quick PDF export triggered', {
      campaignId: campaign.id
    });
    
    // Open dialog with PDF tab pre-selected
    setDialogOpen(true);
    setDropdownOpen(false);
  };

  const handleCustomExport = () => {
    PDFLogger.log('Export', 'Custom export dialog opened', {
      campaignId: campaign.id
    });
    
    setDialogOpen(true);
    setDropdownOpen(false);
  };

  const handleQuickEmail = () => {
    PDFLogger.log('Export', 'Quick email export triggered (future feature)', {
      campaignId: campaign.id
    });
    
    // Future: Open dialog with email tab pre-selected
    alert('Email export coming soon!');
    setDropdownOpen(false);
  };

  return (
    <>
      <div className="relative inline-block">
        {/* Main Export Button */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`
            flex items-center gap-2 px-4 py-2 
            bg-purple-600 hover:bg-purple-700 
            text-white rounded-lg transition-colors
            ${className}
          `}
        >
          <Download className="w-4 h-4" />
          Export Report
          <ChevronDown className={`w-4 h-4 transition-transform ${
            dropdownOpen ? 'rotate-180' : ''
          }`} />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            
            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-56 z-50 bg-[#1A1F2E] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
              <button
                onClick={handleQuickPDF}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-white text-sm font-medium">Quick PDF Export</div>
                  <div className="text-gray-400 text-xs">Download report as PDF</div>
                </div>
              </button>

              <button
                onClick={handleCustomExport}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left border-t border-gray-700"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-white text-sm font-medium">Custom Export...</div>
                  <div className="text-gray-400 text-xs">Choose sections & format</div>
                </div>
              </button>

              {emailFeatureEnabled && (
                <button
                  onClick={handleQuickEmail}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left border-t border-gray-700"
                >
                  <Mail className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-white text-sm font-medium">Email Report</div>
                    <div className="text-gray-400 text-xs">Send to stakeholders</div>
                  </div>
                </button>
              )}

              {!emailFeatureEnabled && (
                <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="text-gray-500 text-sm font-medium">Email Export</div>
                      <div className="text-gray-600 text-xs">Coming soon</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        campaign={campaign}
        assets={assets}
        brandId={brandId}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}