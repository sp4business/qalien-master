/**
 * Campaign Report PDF Template
 * Main PDF document template using React-PDF
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font
} from '@react-pdf/renderer';
import { CampaignReportData, PDFExportOptions } from '@/services/export/types';
import { PDFLogger } from '@/utils/pdfLogger';

// Register fonts (optional - for better typography)
// Font.register({
//   family: 'Inter',
//   src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
// });

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#6B46C1',
    borderBottomStyle: 'solid'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1F2E',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5
  },
  section: {
    marginTop: 25,
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1F2E',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid'
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#374151',
    marginBottom: 8
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 15
  },
  metricBox: {
    width: '48%',
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'solid'
  },
  metricLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 3
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1F2E'
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginVertical: 20
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6B46C1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5
  },
  assetCard: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'solid',
    breakInside: 'avoid'
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  assetName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1F2E',
    flex: 1
  },
  assetScore: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  assetImage: {
    width: '100%',
    height: 200,
    objectFit: 'contain',
    marginVertical: 10,
    backgroundColor: '#F3F4F6'
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderBottomStyle: 'solid'
  },
  categoryName: {
    fontSize: 10,
    color: '#374151'
  },
  categoryScore: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8
  },
  bullet: {
    fontSize: 10,
    color: '#6B46C1',
    marginRight: 8
  },
  recommendationText: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#9CA3AF'
  },
  pageNumber: {
    fontSize: 9,
    color: '#9CA3AF'
  }
});

interface CampaignReportPDFProps {
  data: CampaignReportData;
  options: PDFExportOptions;
}

export const CampaignReportPDF: React.FC<CampaignReportPDFProps> = ({ data, options }) => {
  PDFLogger.log('Template', 'Rendering PDF template', {
    campaignName: data.campaign.name,
    assetCount: data.assets.length,
    options
  });

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getStatusColor = (status?: string): string => {
    if (!status) return '#9CA3AF';
    if (status === 'approved' || status === 'pass' || status === 'Approved') return '#10B981';
    if (status === 'warning' || status === 'warn' || status === 'Warning') return '#F59E0B';
    if (status === 'failed' || status === 'fail' || status === 'Failed') return '#EF4444';
    return '#9CA3AF';
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Document>
      {/* Page 1: Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.campaign.name}</Text>
          <Text style={styles.subtitle}>Campaign Compliance Report</Text>
          <Text style={[styles.subtitle, { fontSize: 10, marginTop: 8 }]}>
            Generated on {formatDate(new Date().toISOString())}
          </Text>
        </View>

        {/* Campaign Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Information</Text>
          <Text style={styles.paragraph}>
            <Text style={{ fontWeight: 'bold' }}>Campaign Type: </Text>
            {data.campaign.campaign_type || 'Standard'}
          </Text>
          <Text style={styles.paragraph}>
            <Text style={{ fontWeight: 'bold' }}>Duration: </Text>
            {formatDate(data.campaign.start_date)} - {formatDate(data.campaign.end_date)}
          </Text>
          {data.campaign.budget && (
            <Text style={styles.paragraph}>
              <Text style={{ fontWeight: 'bold' }}>Budget: </Text>
              {data.campaign.currency || 'USD'} {data.campaign.budget.toLocaleString()}
            </Text>
          )}
          {data.brand && (
            <Text style={styles.paragraph}>
              <Text style={{ fontWeight: 'bold' }}>Brand: </Text>
              {data.brand.brand_name || data.brand.name}
            </Text>
          )}
        </View>

        {/* Overall Score */}
        {options.includeMetrics && (
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCircle, { 
              backgroundColor: getScoreColor(data.metrics.averageScore) 
            }]}>
              <Text style={styles.scoreText}>{data.metrics.averageScore}</Text>
            </View>
            <Text style={styles.scoreLabel}>Overall Compliance Score</Text>
          </View>
        )}

        {/* Metrics */}
        {options.includeMetrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Metrics</Text>
            <View style={styles.metricsContainer}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Total Assets</Text>
                <Text style={styles.metricValue}>{data.metrics.totalAssets}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Approved</Text>
                <Text style={[styles.metricValue, { color: '#10B981' }]}>
                  {data.metrics.approvedCount}
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Warnings</Text>
                <Text style={[styles.metricValue, { color: '#F59E0B' }]}>
                  {data.metrics.warningCount}
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Failed</Text>
                <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                  {data.metrics.failedCount}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Executive Summary */}
        {options.includeAnalysis && data.analysis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            <Text style={styles.paragraph}>{data.analysis.executiveSummary}</Text>
          </View>
        )}

        <Text style={styles.pageNumber} fixed>
          Page 1
        </Text>
      </Page>

      {/* Page 2: Key Insights & Recommendations */}
      {options.includeRecommendations && data.analysis && (
        <Page size="A4" style={styles.page}>
          {data.analysis.keyInsights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Insights</Text>
              {data.analysis.keyInsights.map((insight, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.recommendationText}>{insight}</Text>
                </View>
              ))}
            </View>
          )}

          {data.analysis.recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {data.analysis.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.pageNumber} fixed>
            Page 2
          </Text>
        </Page>
      )}

      {/* Asset Pages */}
      {options.includeAssets && data.assets.map((asset, index) => (
        <Page key={asset.id} size="A4" style={styles.page}>
          <View style={styles.assetCard}>
            <View style={styles.assetHeader}>
              <Text style={styles.assetName}>{asset.name}</Text>
              <Text style={[styles.assetScore, { 
                color: getScoreColor(asset.compliance_score) 
              }]}>
                Score: {asset.compliance_score || 'N/A'}
              </Text>
            </View>

            <Text style={[styles.paragraph, { fontSize: 9, color: '#6B7280' }]}>
              Uploaded: {formatDate(asset.upload_date)}
            </Text>

            <Text style={[styles.paragraph, { 
              fontSize: 10, 
              color: getStatusColor(asset.overall_status || asset.status),
              fontWeight: 'bold'
            }]}>
              Status: {asset.overall_status || asset.status || 'Pending'}
            </Text>

            {/* Thumbnail */}
            {options.includeThumbnails && asset.thumbnail_url && (
              <Image 
                style={styles.assetImage} 
                src={asset.thumbnail_url}
                cache={false}
              />
            )}

            {/* Category Scores */}
            {asset.frontend_report && asset.frontend_report.length > 0 && (
              <View style={{ marginTop: 15 }}>
                <Text style={[styles.sectionTitle, { fontSize: 12 }]}>
                  Compliance Breakdown
                </Text>
                {asset.frontend_report.map((item, idx) => (
                  <View key={idx} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>
                      {item.icon} {item.category}
                    </Text>
                    <Text style={[styles.categoryScore, {
                      color: getScoreColor(item.score || 0)
                    }]}>
                      {item.score || 'N/A'}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* AI Analysis */}
            {asset.analysis && (
              <View style={{ marginTop: 15 }}>
                <Text style={[styles.sectionTitle, { fontSize: 12 }]}>
                  AI Analysis
                </Text>
                <Text style={[styles.paragraph, { fontSize: 9 }]}>
                  {asset.analysis.executive_summary}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.pageNumber} fixed>
            Asset {index + 1} of {data.assets.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
};

// Export as default for dynamic import
export default CampaignReportPDF;