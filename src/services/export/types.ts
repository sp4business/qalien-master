/**
 * Export Service Types and Interfaces
 * Modular architecture to support PDF now and email later
 */

import { Campaign } from '@/types/campaign';

// Asset type from CampaignDetail
export interface CampaignAsset {
  id: string;
  creative_id?: string;
  asset_name: string;
  name?: string;
  compliance_score: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'Approved' | 'Warning' | 'Failed';
  upload_date?: string;
  created_at?: string;
  mime_type: string;
  storage_path: string;
  thumbnail_url?: string;
  frontend_report?: Array<{
    check?: string;
    result?: string;
    details?: string;
    category?: string;
    icon?: string;
    score?: number;
    status?: 'pass' | 'warning' | 'fail';
    feedback?: string;
    suggestions?: string[];
  }>;
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

// Unified report data structure for all export types
export interface CampaignReportData {
  campaign: Campaign;
  brand?: {
    id: string;
    name: string;
    brand_name?: string;
    industry?: string;
    description?: string;
    website?: string;
    logo_url?: string;
  };
  assets: CampaignAsset[];
  metrics: {
    totalAssets: number;
    approvedCount: number;
    warningCount: number;
    failedCount: number;
    averageScore: number;
    processingCount: number;
  };
  analysis?: {
    executiveSummary: string;
    keyInsights: string[];
    recommendations: string[];
  };
}

// Export options that can be extended by specific exporters
export interface BaseExportOptions {
  includeAnalysis: boolean;
  includeMetrics: boolean;
  includeRecommendations: boolean;
  includeAssets: boolean;
  selectedAssetIds?: string[];
  format: 'detailed' | 'summary';
}

// PDF-specific options
export interface PDFExportOptions extends BaseExportOptions {
  includeThumbnails: boolean;
  includeTranscripts: boolean;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

// Email-specific options (for future)
export interface EmailExportOptions extends BaseExportOptions {
  recipients: string[];
  subject?: string;
  message?: string;
  attachPDF: boolean;
  scheduleTime?: Date;
}

// Result of an export operation
export interface ExportResult {
  type: 'pdf' | 'email' | 'link';
  success: boolean;
  data?: Blob | string;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata: {
    generatedAt: Date;
    duration: number;
    assetCount: number;
    options: BaseExportOptions;
  };
  error?: string;
}

// Validation result for export options
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Base interface for all export services
export interface IExportService {
  name: string;
  type: 'pdf' | 'email';
  isAvailable: boolean;
  
  /**
   * Generate the export with extensive logging
   */
  generate(
    data: CampaignReportData, 
    options: BaseExportOptions
  ): Promise<ExportResult>;
  
  /**
   * Validate export options before generation
   */
  validateOptions(options: BaseExportOptions): ValidationResult;
  
  /**
   * Get default options for this export type
   */
  getDefaultOptions(): BaseExportOptions;
  
  /**
   * Estimate file size or processing time
   */
  estimate?(data: CampaignReportData, options: BaseExportOptions): {
    estimatedSize: number;
    estimatedTime: number;
  };
}

// Export manager configuration
export interface ExportManagerConfig {
  maxAssets?: number;
  maxFileSize?: number;
  enableEmail?: boolean;
  enableScheduling?: boolean;
}

// Export progress callback
export type ExportProgressCallback = (progress: {
  stage: 'preparing' | 'processing' | 'generating' | 'finalizing';
  percent: number;
  message: string;
}) => void;