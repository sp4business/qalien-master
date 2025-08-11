/**
 * PDF Export Logger Utility
 * Provides comprehensive logging for PDF generation debugging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 
  | 'Init' 
  | 'Data' 
  | 'Image' 
  | 'Template' 
  | 'Generate' 
  | 'Download' 
  | 'Error' 
  | 'Perf'
  | 'Export';

interface LogContext {
  campaignId?: string;
  assetId?: string;
  assetCount?: number;
  [key: string]: any;
}

class PDFLoggerClass {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private performanceMarks = new Map<string, number>();

  private formatMessage(category: LogCategory, message: string): string {
    return `[PDFExport:${category}] ${message}`;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  log(category: LogCategory, message: string, data?: LogContext): void {
    if (!this.isDevelopment) return;
    
    const formattedMessage = this.formatMessage(category, message);
    const timestamp = this.getTimestamp();
    
    console.group(`%c${formattedMessage}`, 'color: #6B46C1; font-weight: bold');
    console.log('Timestamp:', timestamp);
    
    if (data) {
      console.log('Data:', data);
      
      // Log memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log('Memory:', {
          usedJSHeapSize: `${Math.round(memory.usedJSHeapSize / 1048576)}MB`,
          totalJSHeapSize: `${Math.round(memory.totalJSHeapSize / 1048576)}MB`,
          limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`
        });
      }
    }
    
    console.groupEnd();
  }

  error(category: LogCategory, error: Error | unknown, context?: LogContext): void {
    const formattedMessage = this.formatMessage(category, 'Error occurred');
    const timestamp = this.getTimestamp();
    
    console.group(`%c${formattedMessage}`, 'color: #FF0000; font-weight: bold');
    console.error('Timestamp:', timestamp);
    
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Error:', error);
    }
    
    if (context) {
      console.error('Context:', context);
    }
    
    console.groupEnd();
  }

  warn(category: LogCategory, message: string, data?: LogContext): void {
    if (!this.isDevelopment) return;
    
    const formattedMessage = this.formatMessage(category, message);
    console.warn(formattedMessage, data || '');
  }

  /**
   * Start a performance measurement
   */
  startPerformance(label: string): void {
    if (!this.isDevelopment) return;
    
    this.performanceMarks.set(label, performance.now());
    console.log(`%c[PDFExport:Perf] Started: ${label}`, 'color: #FFA500');
  }

  /**
   * End a performance measurement and log the duration
   */
  endPerformance(label: string, metadata?: LogContext): number {
    if (!this.isDevelopment) return 0;
    
    const startTime = this.performanceMarks.get(label);
    if (!startTime) {
      console.warn(`[PDFExport:Perf] No start mark found for: ${label}`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    const durationFormatted = duration > 1000 
      ? `${(duration / 1000).toFixed(2)}s`
      : `${Math.round(duration)}ms`;
    
    console.group(`%c[PDFExport:Perf] Completed: ${label}`, 'color: #32CD32');
    console.log('Duration:', durationFormatted);
    console.log('Raw duration (ms):', duration);
    
    if (metadata) {
      console.log('Metadata:', metadata);
    }
    
    console.groupEnd();
    
    this.performanceMarks.delete(label);
    return duration;
  }

  /**
   * Log data snapshot for debugging
   */
  snapshot(category: LogCategory, label: string, data: any): void {
    if (!this.isDevelopment) return;
    
    console.group(`%c[PDFExport:${category}] Snapshot: ${label}`, 'color: #9370DB');
    console.log('Data:', JSON.parse(JSON.stringify(data)));
    console.groupEnd();
  }

  /**
   * Log image processing details
   */
  logImageProcessing(
    assetId: string,
    originalSize: number,
    optimizedSize: number,
    duration: number
  ): void {
    if (!this.isDevelopment) return;
    
    const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    
    console.group('%c[PDFExport:Image] Image Optimized', 'color: #20B2AA');
    console.log('Asset ID:', assetId);
    console.log('Original Size:', `${(originalSize / 1024).toFixed(1)}KB`);
    console.log('Optimized Size:', `${(optimizedSize / 1024).toFixed(1)}KB`);
    console.log('Reduction:', `${reduction}%`);
    console.log('Processing Time:', `${duration}ms`);
    console.groupEnd();
  }

  /**
   * Log export options for debugging
   */
  logExportOptions(options: any): void {
    if (!this.isDevelopment) return;
    
    console.group('%c[PDFExport:Export] Export Options', 'color: #FF69B4');
    console.table(options);
    console.groupEnd();
  }

  /**
   * Create a summary of the entire export process
   */
  logExportSummary(
    campaignId: string,
    assetCount: number,
    fileSize: number,
    totalDuration: number,
    success: boolean
  ): void {
    const color = success ? '#32CD32' : '#FF0000';
    const status = success ? 'SUCCESS' : 'FAILED';
    
    console.group(`%c[PDFExport:Summary] Export ${status}`, `color: ${color}; font-weight: bold; font-size: 14px`);
    console.log('Campaign ID:', campaignId);
    console.log('Assets Processed:', assetCount);
    console.log('File Size:', `${(fileSize / 1048576).toFixed(2)}MB`);
    console.log('Total Duration:', `${(totalDuration / 1000).toFixed(2)}s`);
    console.log('Average per Asset:', `${(totalDuration / assetCount).toFixed(0)}ms`);
    console.groupEnd();
  }

  /**
   * Clear all performance marks
   */
  clearPerformanceMarks(): void {
    this.performanceMarks.clear();
  }
}

// Export singleton instance
export const PDFLogger = new PDFLoggerClass();

// Export types for use in components
export type { LogContext };