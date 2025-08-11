/**
 * Campaign Export Manager
 * Central service for managing all export types (PDF, Email future)
 */

import { PDFLogger } from '@/utils/pdfLogger';
import { 
  IExportService, 
  CampaignReportData, 
  BaseExportOptions, 
  ExportResult,
  ExportProgressCallback,
  ExportManagerConfig 
} from './types';

export class CampaignExportManager {
  private static instance: CampaignExportManager;
  private exporters: Map<string, IExportService> = new Map();
  private config: ExportManagerConfig;

  private constructor(config: ExportManagerConfig = {}) {
    this.config = {
      maxAssets: 100,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      enableEmail: false,
      enableScheduling: false,
      ...config
    };
    
    PDFLogger.log('Init', 'Export Manager initialized', {
      availableExporters: Array.from(this.exporters.keys()),
      config: this.config
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ExportManagerConfig): CampaignExportManager {
    if (!CampaignExportManager.instance) {
      CampaignExportManager.instance = new CampaignExportManager(config);
    }
    return CampaignExportManager.instance;
  }

  /**
   * Register an export service
   */
  registerExporter(exporter: IExportService): void {
    PDFLogger.log('Export', `Registering exporter: ${exporter.name}`, {
      type: exporter.type,
      available: exporter.isAvailable
    });
    
    this.exporters.set(exporter.type, exporter);
  }

  /**
   * Check if an export type is available
   */
  isExportTypeAvailable(type: string): boolean {
    const exporter = this.exporters.get(type);
    const available = exporter?.isAvailable || false;
    
    PDFLogger.log('Export', `Checking availability for ${type}`, { available });
    return available;
  }

  /**
   * Get available export types
   */
  getAvailableExportTypes(): string[] {
    const types = Array.from(this.exporters.entries())
      .filter(([_, exporter]) => exporter.isAvailable)
      .map(([type]) => type);
    
    PDFLogger.log('Export', 'Available export types', { types });
    return types;
  }

  /**
   * Main export method with comprehensive logging
   */
  async export(
    type: 'pdf' | 'email',
    data: CampaignReportData,
    options: BaseExportOptions,
    progressCallback?: ExportProgressCallback
  ): Promise<ExportResult> {
    const startTime = performance.now();
    
    PDFLogger.startPerformance(`export-${type}`);
    PDFLogger.log('Export', `Starting ${type} export`, {
      campaignId: data.campaign.id,
      campaignName: data.campaign.name,
      assetCount: data.assets.length,
      options
    });

    try {
      // Validate export type
      const exporter = this.exporters.get(type);
      if (!exporter) {
        throw new Error(`Export type '${type}' not registered`);
      }

      if (!exporter.isAvailable) {
        throw new Error(`Export type '${type}' is not available`);
      }

      // Progress: Preparing
      progressCallback?.({
        stage: 'preparing',
        percent: 10,
        message: 'Validating export options...'
      });

      // Validate options
      const validation = exporter.validateOptions(options);
      if (!validation.valid) {
        PDFLogger.error('Export', new Error('Validation failed'), {
          errors: validation.errors
        });
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        PDFLogger.warn('Export', 'Validation warnings', {
          warnings: validation.warnings
        });
      }

      // Check constraints
      if (data.assets.length > this.config.maxAssets!) {
        throw new Error(`Too many assets. Maximum: ${this.config.maxAssets}`);
      }

      // Progress: Processing
      progressCallback?.({
        stage: 'processing',
        percent: 30,
        message: 'Processing campaign data...'
      });

      // Log data snapshot for debugging
      PDFLogger.snapshot('Data', 'Campaign Data', {
        campaign: {
          id: data.campaign.id,
          name: data.campaign.name,
          type: data.campaign.campaign_type,
          dates: {
            start: data.campaign.start_date,
            end: data.campaign.end_date
          }
        },
        metrics: data.metrics,
        assetSummary: {
          total: data.assets.length,
          withThumbnails: data.assets.filter(a => a.thumbnail_url).length,
          processed: data.assets.filter(a => a.status === 'completed').length
        }
      });

      // Progress: Generating
      progressCallback?.({
        stage: 'generating',
        percent: 50,
        message: `Generating ${type} export...`
      });

      // Generate export
      PDFLogger.log('Export', `Calling ${type} exporter`, {
        exporterName: exporter.name
      });
      
      const result = await exporter.generate(data, options);

      // Progress: Finalizing
      progressCallback?.({
        stage: 'finalizing',
        percent: 90,
        message: 'Finalizing export...'
      });

      // Log result
      const duration = PDFLogger.endPerformance(`export-${type}`, {
        success: result.success,
        fileSize: result.fileSize,
        assetCount: data.assets.length
      });

      // Add duration to result metadata
      result.metadata.duration = duration;

      // Log summary
      if (result.success) {
        PDFLogger.logExportSummary(
          data.campaign.id,
          data.assets.length,
          result.fileSize || 0,
          duration,
          true
        );
      } else {
        PDFLogger.error('Export', new Error(result.error || 'Export failed'), {
          campaignId: data.campaign.id,
          type
        });
      }

      // Progress: Complete
      progressCallback?.({
        stage: 'finalizing',
        percent: 100,
        message: 'Export complete!'
      });

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      PDFLogger.error('Export', error as Error, {
        campaignId: data.campaign.id,
        type,
        duration
      });

      PDFLogger.logExportSummary(
        data.campaign.id,
        data.assets.length,
        0,
        duration,
        false
      );

      return {
        type: type as 'pdf' | 'email',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          generatedAt: new Date(),
          duration,
          assetCount: data.assets.length,
          options
        }
      };
    }
  }

  /**
   * Get default options for an export type
   */
  getDefaultOptions(type: string): BaseExportOptions | null {
    const exporter = this.exporters.get(type);
    if (!exporter) {
      PDFLogger.warn('Export', `No exporter found for type: ${type}`);
      return null;
    }
    
    const options = exporter.getDefaultOptions();
    PDFLogger.log('Export', `Default options for ${type}`, { options });
    return options;
  }

  /**
   * Estimate export size and time
   */
  async estimate(
    type: string,
    data: CampaignReportData,
    options: BaseExportOptions
  ): Promise<{ estimatedSize: number; estimatedTime: number } | null> {
    const exporter = this.exporters.get(type);
    if (!exporter || !exporter.estimate) {
      return null;
    }

    const estimate = exporter.estimate(data, options);
    PDFLogger.log('Export', `Estimate for ${type}`, estimate);
    return estimate;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    PDFLogger.log('Export', 'Cleaning up export manager');
    PDFLogger.clearPerformanceMarks();
    this.exporters.clear();
  }
}

// Export singleton instance
export const exportManager = CampaignExportManager.getInstance();