/**
 * PDF Export Service
 * Handles PDF generation for campaign reports
 */

import { PDFLogger } from '@/utils/pdfLogger';
import {
  IExportService,
  CampaignReportData,
  BaseExportOptions,
  PDFExportOptions,
  ExportResult,
  ValidationResult
} from './types';

// We'll import React-PDF dynamically to reduce bundle size
type PDFModule = typeof import('@react-pdf/renderer');

export class PDFExportService implements IExportService {
  name = 'PDF Export';
  type = 'pdf' as const;
  isAvailable = true;

  /**
   * Generate PDF with comprehensive logging
   */
  async generate(
    data: CampaignReportData,
    options: BaseExportOptions
  ): Promise<ExportResult> {
    const startTime = performance.now();
    PDFLogger.startPerformance('pdf-generation');
    PDFLogger.log('Generate', 'Starting PDF generation', {
      campaignId: data.campaign.id,
      campaignName: data.campaign.name,
      assetCount: data.assets.length,
      options
    });

    try {
      // Dynamically import React-PDF to reduce initial bundle size
      PDFLogger.log('Generate', 'Loading React-PDF library...');
      const { pdf } = await import('@react-pdf/renderer') as PDFModule;
      
      PDFLogger.log('Generate', 'Loading PDF template...');
      const { CampaignReportPDF } = await import('@/components/pdf/templates/CampaignReportPDF');

      // Process and optimize images if needed
      const pdfOptions = options as PDFExportOptions;
      let processedData = { ...data };
      
      if (pdfOptions.includeThumbnails !== false) {
        PDFLogger.log('Image', 'Processing thumbnails for PDF', {
          assetCount: data.assets.length
        });
        processedData = await this.processImagesForPDF(data);
      }

      // Create PDF document
      PDFLogger.log('Generate', 'Creating PDF document');
      const document = CampaignReportPDF({ 
        data: processedData, 
        options: pdfOptions 
      });

      // Generate PDF blob
      PDFLogger.log('Generate', 'Generating PDF blob');
      const blob = await pdf(document).toBlob();

      const fileSize = blob.size;
      const fileName = this.generateFileName(data.campaign.name);
      
      PDFLogger.log('Generate', 'PDF generated successfully', {
        fileName,
        fileSize: `${(fileSize / 1024).toFixed(1)}KB`,
        pages: await this.estimatePageCount(data, pdfOptions)
      });

      const duration = PDFLogger.endPerformance('pdf-generation', {
        fileSize,
        assetCount: data.assets.length
      });

      // Create download link
      this.triggerDownload(blob, fileName);

      return {
        type: 'pdf',
        success: true,
        data: blob,
        fileName,
        fileSize,
        metadata: {
          generatedAt: new Date(),
          duration,
          assetCount: data.assets.length,
          options
        }
      };

    } catch (error) {
      PDFLogger.error('Generate', error as Error, {
        campaignId: data.campaign.id
      });

      return {
        type: 'pdf',
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed',
        metadata: {
          generatedAt: new Date(),
          duration: performance.now() - startTime,
          assetCount: data.assets.length,
          options
        }
      };
    }
  }

  /**
   * Validate export options
   */
  validateOptions(options: BaseExportOptions): ValidationResult {
    PDFLogger.log('Generate', 'Validating PDF export options', { options });
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required options
    if (options.selectedAssetIds && options.selectedAssetIds.length === 0) {
      errors.push('No assets selected for export');
    }

    // Check for potential issues
    if (options.selectedAssetIds && options.selectedAssetIds.length > 50) {
      warnings.push('Large number of assets may result in a large PDF file');
    }

    const pdfOptions = options as PDFExportOptions;
    if (pdfOptions.orientation === 'landscape' && pdfOptions.includeThumbnails) {
      warnings.push('Landscape orientation with thumbnails may affect layout');
    }

    PDFLogger.log('Generate', 'Validation complete', {
      valid: errors.length === 0,
      errors,
      warnings
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get default PDF export options
   */
  getDefaultOptions(): PDFExportOptions {
    return {
      includeAnalysis: true,
      includeMetrics: true,
      includeRecommendations: true,
      includeAssets: true,
      includeThumbnails: true,
      includeTranscripts: false,
      format: 'detailed',
      pageSize: 'A4',
      orientation: 'portrait'
    };
  }

  /**
   * Estimate PDF size and generation time
   */
  estimate?(
    data: CampaignReportData,
    options: BaseExportOptions
  ): { estimatedSize: number; estimatedTime: number } {
    const pdfOptions = options as PDFExportOptions;
    
    // Base size for document structure
    let estimatedSize = 100 * 1024; // 100KB base
    
    // Add size for each asset
    const assetCount = options.selectedAssetIds?.length || data.assets.length;
    estimatedSize += assetCount * 50 * 1024; // 50KB per asset
    
    // Add size for thumbnails
    if (pdfOptions.includeThumbnails) {
      estimatedSize += assetCount * 100 * 1024; // 100KB per thumbnail
    }
    
    // Add size for transcripts
    if (pdfOptions.includeTranscripts) {
      const videosCount = data.assets.filter(a => a.mime_type?.startsWith('video/')).length;
      estimatedSize += videosCount * 20 * 1024; // 20KB per transcript
    }

    // Estimate time (rough calculation)
    const estimatedTime = 500 + (assetCount * 100); // 500ms base + 100ms per asset

    PDFLogger.log('Generate', 'PDF size and time estimated', {
      estimatedSize: `${(estimatedSize / 1024).toFixed(0)}KB`,
      estimatedTime: `${(estimatedTime / 1000).toFixed(1)}s`,
      assetCount
    });

    return { estimatedSize, estimatedTime };
  }

  /**
   * Process images for PDF embedding
   */
  private async processImagesForPDF(data: CampaignReportData): Promise<CampaignReportData> {
    PDFLogger.startPerformance('image-processing');
    
    const processedAssets = await Promise.all(
      data.assets.map(async (asset, index) => {
        if (!asset.thumbnail_url) {
          PDFLogger.log('Image', `Asset ${index + 1} has no thumbnail`, {
            assetId: asset.id,
            assetName: asset.name
          });
          return asset;
        }

        try {
          PDFLogger.log('Image', `Processing thumbnail ${index + 1}/${data.assets.length}`, {
            assetId: asset.id,
            originalUrl: asset.thumbnail_url
          });

          // For now, we'll use the original URL
          // In a production app, you might want to optimize/compress images here
          const optimizedUrl = await this.optimizeImage(asset.thumbnail_url, asset.id);
          
          return {
            ...asset,
            thumbnail_url: optimizedUrl
          };
        } catch (error) {
          PDFLogger.error('Image', error as Error, {
            assetId: asset.id,
            assetName: asset.name
          });
          return asset;
        }
      })
    );

    PDFLogger.endPerformance('image-processing', {
      processedCount: processedAssets.length
    });

    return {
      ...data,
      assets: processedAssets
    };
  }

  /**
   * Optimize image for PDF
   */
  private async optimizeImage(url: string, assetId: string): Promise<string> {
    const startTime = performance.now();
    
    try {
      // For now, return the original URL
      // In production, you would:
      // 1. Load the image
      // 2. Resize if needed (max 800px width)
      // 3. Compress (JPEG quality 80%)
      // 4. Convert to base64
      
      PDFLogger.log('Image', 'Image optimization placeholder', {
        assetId,
        note: 'Using original URL for now'
      });
      
      return url;
      
      // Production code would be:
      /*
      const response = await fetch(url);
      const blob = await response.blob();
      const originalSize = blob.size;
      
      // Create image element
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve) => {
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Calculate dimensions (max 800px width)
          const maxWidth = 800;
          const scale = Math.min(1, maxWidth / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          const optimizedSize = base64.length * 0.75; // Approximate size
          
          PDFLogger.logImageProcessing(
            assetId,
            originalSize,
            optimizedSize,
            performance.now() - startTime
          );
          
          URL.revokeObjectURL(objectUrl);
          resolve(base64);
        };
        
        img.src = objectUrl;
      });
      */
      
    } catch (error) {
      PDFLogger.error('Image', error as Error, { assetId });
      return url; // Return original URL as fallback
    }
  }

  /**
   * Generate file name for PDF
   */
  private generateFileName(campaignName: string): string {
    const sanitized = campaignName
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${sanitized}-report-${date}.pdf`;
    
    PDFLogger.log('Generate', 'Generated file name', { fileName });
    return fileName;
  }

  /**
   * Estimate page count
   */
  private async estimatePageCount(
    data: CampaignReportData,
    options: PDFExportOptions
  ): Promise<number> {
    let pages = 1; // Executive summary page
    
    if (options.includeMetrics) pages += 1;
    if (options.includeRecommendations) pages += 1;
    
    // Estimate 3 assets per page
    const assetPages = Math.ceil(data.assets.length / 3);
    pages += assetPages;
    
    PDFLogger.log('Generate', 'Estimated page count', { pages });
    return pages;
  }

  /**
   * Trigger file download
   */
  private triggerDownload(blob: Blob, fileName: string): void {
    PDFLogger.log('Download', 'Triggering PDF download', {
      fileName,
      fileSize: `${(blob.size / 1024).toFixed(1)}KB`
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up object URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
      PDFLogger.log('Download', 'Cleaned up object URL');
    }, 1000);
  }
}

// Export factory function
export function createPDFExportService(): PDFExportService {
  return new PDFExportService();
}