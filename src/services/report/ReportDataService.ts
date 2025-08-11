/**
 * Report Data Service
 * Prepares campaign data for export (works for both PDF and future email)
 */

import { PDFLogger } from '@/utils/pdfLogger';
import { Campaign } from '@/types/campaign';
import { CampaignReportData, CampaignAsset } from '../export/types';
import { createClient } from '@supabase/supabase-js';

export class ReportDataService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient;
    PDFLogger.log('Init', 'ReportDataService initialized');
  }

  /**
   * Prepare complete campaign data for export
   */
  async prepareCampaignData(
    campaign: Campaign,
    assets: CampaignAsset[],
    brandId?: string
  ): Promise<CampaignReportData> {
    PDFLogger.startPerformance('prepare-campaign-data');
    PDFLogger.log('Data', 'Preparing campaign data', {
      campaignId: campaign.id,
      assetCount: assets.length,
      brandId
    });

    try {
      // Fetch brand information if available
      let brand = undefined;
      if (brandId || campaign.brand_id) {
        brand = await this.fetchBrandInfo(brandId || campaign.brand_id);
      }

      // Calculate metrics
      const metrics = this.calculateMetrics(assets);
      PDFLogger.log('Data', 'Metrics calculated', metrics);

      // Generate analysis
      const analysis = this.generateAnalysis(campaign, assets, metrics);
      PDFLogger.log('Data', 'Analysis generated', {
        hasExecutiveSummary: !!analysis.executiveSummary,
        insightCount: analysis.keyInsights.length,
        recommendationCount: analysis.recommendations.length
      });

      // Process assets for export
      const processedAssets = await this.processAssets(assets);
      PDFLogger.log('Data', 'Assets processed', {
        total: processedAssets.length,
        withThumbnails: processedAssets.filter(a => a.thumbnail_url).length
      });

      const reportData: CampaignReportData = {
        campaign,
        brand,
        assets: processedAssets,
        metrics,
        analysis
      };

      PDFLogger.endPerformance('prepare-campaign-data', {
        campaignId: campaign.id,
        assetCount: assets.length
      });

      PDFLogger.snapshot('Data', 'Final Report Data', {
        campaignName: reportData.campaign.name,
        brandName: reportData.brand?.name,
        metrics: reportData.metrics,
        analysisAvailable: !!reportData.analysis
      });

      return reportData;

    } catch (error) {
      PDFLogger.error('Data', error as Error, {
        campaignId: campaign.id
      });
      throw error;
    }
  }

  /**
   * Fetch brand information
   */
  private async fetchBrandInfo(brandId: string) {
    PDFLogger.log('Data', 'Fetching brand info', { brandId });

    try {
      const { data, error } = await this.supabase
        .from('brands')
        .select('id, name, brand_name, industry, description, website, logo_url')
        .eq('id', brandId)
        .single();

      if (error) {
        PDFLogger.warn('Data', 'Failed to fetch brand info', { error: error.message });
        return undefined;
      }

      PDFLogger.log('Data', 'Brand info fetched', {
        brandId: data.id,
        brandName: data.brand_name || data.name
      });

      return data;
    } catch (error) {
      PDFLogger.error('Data', error as Error, { brandId });
      return undefined;
    }
  }

  /**
   * Calculate campaign metrics
   */
  private calculateMetrics(assets: CampaignAsset[]) {
    PDFLogger.log('Data', 'Calculating metrics', {
      totalAssets: assets.length
    });

    const metrics = {
      totalAssets: assets.length,
      approvedCount: 0,
      warningCount: 0,
      failedCount: 0,
      processingCount: 0,
      averageScore: 0
    };

    let totalScore = 0;
    let scoredAssets = 0;

    assets.forEach(asset => {
      // Count by status
      const status = asset.overall_status || asset.status;
      
      if (status === 'approved' || status === 'pass' || status === 'Approved' || status === 'completed') {
        metrics.approvedCount++;
      } else if (status === 'warning' || status === 'warn' || status === 'Warning') {
        metrics.warningCount++;
      } else if (status === 'failed' || status === 'fail' || status === 'Failed') {
        metrics.failedCount++;
      } else if (status === 'processing' || status === 'pending') {
        metrics.processingCount++;
      }

      // Calculate average score
      if (asset.compliance_score && asset.compliance_score > 0) {
        totalScore += asset.compliance_score;
        scoredAssets++;
      }
    });

    metrics.averageScore = scoredAssets > 0 ? Math.round(totalScore / scoredAssets) : 0;

    PDFLogger.log('Data', 'Metrics calculated', metrics);
    return metrics;
  }

  /**
   * Generate AI-style analysis and recommendations
   */
  private generateAnalysis(
    campaign: Campaign,
    assets: CampaignAsset[],
    metrics: CampaignReportData['metrics']
  ): CampaignReportData['analysis'] {
    PDFLogger.log('Data', 'Generating analysis', {
      campaignName: campaign.name,
      assetCount: assets.length
    });

    const analysis: CampaignReportData['analysis'] = {
      executiveSummary: '',
      keyInsights: [],
      recommendations: []
    };

    // Generate executive summary
    const complianceRate = metrics.totalAssets > 0 
      ? Math.round((metrics.approvedCount / metrics.totalAssets) * 100)
      : 0;

    analysis.executiveSummary = `Campaign "${campaign.name}" has been analyzed with ${metrics.totalAssets} creative assets. ` +
      `Overall compliance rate is ${complianceRate}% with an average score of ${metrics.averageScore}/100. ` +
      `${metrics.approvedCount} assets are fully compliant, ${metrics.warningCount} require minor adjustments, ` +
      `and ${metrics.failedCount} need significant revision.`;

    // Generate key insights
    if (metrics.averageScore >= 90) {
      analysis.keyInsights.push('Excellent brand compliance across campaign assets');
    } else if (metrics.averageScore >= 70) {
      analysis.keyInsights.push('Good overall compliance with room for improvement');
    } else {
      analysis.keyInsights.push('Significant compliance issues detected requiring attention');
    }

    if (metrics.warningCount > metrics.approvedCount) {
      analysis.keyInsights.push('Majority of assets have minor compliance warnings');
    }

    if (metrics.failedCount > 0) {
      analysis.keyInsights.push(`${metrics.failedCount} assets do not meet brand guidelines`);
    }

    // Analyze common issues
    const commonIssues = this.analyzeCommonIssues(assets);
    commonIssues.forEach(issue => {
      analysis.keyInsights.push(issue);
    });

    // Generate recommendations
    if (metrics.averageScore < 80) {
      analysis.recommendations.push('Review and update brand guidelines training for creative teams');
    }

    if (metrics.failedCount > 0) {
      analysis.recommendations.push('Prioritize revision of failed assets before campaign launch');
    }

    if (metrics.warningCount > 0) {
      analysis.recommendations.push('Address minor compliance warnings to achieve full brand alignment');
    }

    // Specific recommendations based on common issues
    const specificRecs = this.generateSpecificRecommendations(assets);
    analysis.recommendations.push(...specificRecs);

    PDFLogger.log('Data', 'Analysis generated', {
      summaryLength: analysis.executiveSummary.length,
      insights: analysis.keyInsights.length,
      recommendations: analysis.recommendations.length
    });

    return analysis;
  }

  /**
   * Analyze common issues across assets
   */
  private analyzeCommonIssues(assets: CampaignAsset[]): string[] {
    const issues: string[] = [];
    const categoryScores: { [key: string]: number[] } = {};

    assets.forEach(asset => {
      if (asset.frontend_report) {
        asset.frontend_report.forEach(item => {
          if (item.category && item.score !== undefined) {
            if (!categoryScores[item.category]) {
              categoryScores[item.category] = [];
            }
            categoryScores[item.category].push(item.score);
          }
        });
      }
    });

    // Find categories with low average scores
    Object.entries(categoryScores).forEach(([category, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 70) {
        issues.push(`${category} compliance needs improvement (avg: ${Math.round(avg)}%)`);
      }
    });

    PDFLogger.log('Data', 'Common issues analyzed', { issueCount: issues.length });
    return issues;
  }

  /**
   * Generate specific recommendations based on asset analysis
   */
  private generateSpecificRecommendations(assets: CampaignAsset[]): string[] {
    const recommendations: string[] = [];
    const categoryIssues: { [key: string]: number } = {};

    assets.forEach(asset => {
      if (asset.frontend_report) {
        asset.frontend_report.forEach(item => {
          if (item.status === 'fail' || item.status === 'warning') {
            categoryIssues[item.category || 'Other'] = 
              (categoryIssues[item.category || 'Other'] || 0) + 1;
          }
        });
      }
    });

    // Generate recommendations based on most common issues
    const sortedIssues = Object.entries(categoryIssues)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    sortedIssues.forEach(([category, count]) => {
      if (category.includes('Logo')) {
        recommendations.push('Ensure logo placement follows brand safe-zone guidelines');
      } else if (category.includes('Color')) {
        recommendations.push('Verify color palette matches brand specifications');
      } else if (category.includes('Typography')) {
        recommendations.push('Check font usage against approved brand typefaces');
      } else if (category.includes('Tone') || category.includes('Vocabulary')) {
        recommendations.push('Review messaging for brand voice consistency');
      }
    });

    PDFLogger.log('Data', 'Specific recommendations generated', {
      count: recommendations.length
    });

    return recommendations;
  }

  /**
   * Process assets for export
   */
  private async processAssets(assets: CampaignAsset[]): Promise<CampaignAsset[]> {
    PDFLogger.log('Data', 'Processing assets', {
      count: assets.length
    });

    // Ensure consistent data structure
    const processed = assets.map(asset => ({
      ...asset,
      // Normalize name field
      name: asset.name || asset.asset_name || 'Untitled Asset',
      // Normalize date field
      upload_date: asset.upload_date || asset.created_at || new Date().toISOString(),
      // Ensure creative_id exists
      creative_id: asset.creative_id || asset.id
    }));

    PDFLogger.log('Data', 'Assets processed', {
      processedCount: processed.length
    });

    return processed;
  }
}

// Export factory function for easy instantiation
export function createReportDataService(supabaseClient: ReturnType<typeof createClient>) {
  return new ReportDataService(supabaseClient);
}