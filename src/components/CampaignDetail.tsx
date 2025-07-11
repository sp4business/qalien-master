'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthSession } from '../lib/auth-stubs';
import CreativeCard from './CreativeCard';
import CreativeDetailModal from './CreativeDetailModal';
import CampaignModal from './CampaignModal';
import QAlienLoadingScreen from './QAlienLoadingScreen';

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  campaign_type: string;
  status: string;
  creative_count: number;
  approved_creative_count: number;
  compliance_rate: number;
}

interface Creative {
  creative_id: string;
  name: string;
  compliance_score: number;
  status: 'Approved' | 'Warning' | 'Failed';
  upload_date: string;
  mime_type: string;
  thumbnail_url?: string;
  analysis: {
    executive_summary: string;
    details: {
      logo_usage: { score: number; notes: string };
      color_palette: { score: number; notes: string };
      typography: { score: number; notes: string };
      messaging_tone: { score: number; notes: string };
      layout_composition: { score: number; notes: string };
    };
  };
}

// Mock data for demo
const mockCreatives: Creative[] = [
  {
    creative_id: 'summer-hero-banner',
    name: 'Summer Hero Banner',
    compliance_score: 92,
    status: 'Approved',
    upload_date: '1/14/2024',
    mime_type: 'image/jpeg',
    analysis: {
      executive_summary: 'Overall, this asset maintains high brand standards with excellent logo usage and color consistency. Minor adjustments to typography sizing could further enhance brand alignment.',
      details: {
        logo_usage: { 
          score: 95, 
          notes: 'Logo is properly placed in the designated safe zone with correct clear space. The contrast ratio meets accessibility standards.'
        },
        color_palette: { 
          score: 90, 
          notes: 'Primary brand colors are used effectively. Background gradient aligns with brand guidelines.'
        },
        typography: { 
          score: 88, 
          notes: 'Font family matches brand standards. Consider increasing headline size by 2pt for better hierarchy.'
        },
        messaging_tone: { 
          score: 94, 
          notes: 'Messaging perfectly captures the playful yet sophisticated brand voice. Call-to-action is clear and compelling.'
        },
        layout_composition: { 
          score: 92, 
          notes: 'Well-balanced composition with proper visual hierarchy. White space usage enhances readability.'
        }
      }
    }
  }
];

interface CampaignDetailProps {
  campaignId: string;
  brandId?: string | null;
}

export default function CampaignDetail({ campaignId, brandId }: CampaignDetailProps) {
  const router = useRouter();
  console.log('CampaignDetail - campaignId:', campaignId, 'brandId:', brandId);
  
  const [campaign] = useState<Campaign>({
    campaign_id: campaignId,
    campaign_name: 'Summer Gelatin Campaign 2024',
    campaign_type: 'Product Launch',
    status: 'active',
    creative_count: 1,
    approved_creative_count: 1,
    compliance_rate: 92
  });
  const [creatives, setCreatives] = useState<Creative[]>(mockCreatives);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreativeClick = (creative: Creative) => {
    setSelectedCreative(creative);
    setIsModalOpen(true);
  };

  const handleUploadMedia = async () => {
    // In a real implementation, this would open a file picker and upload
    // For now, we'll just add a mock creative
    const newCreative: Creative = {
      creative_id: `creative-${Date.now()}`,
      name: 'New Summer Asset',
      compliance_score: 85,
      status: 'Warning',
      upload_date: new Date().toLocaleDateString(),
      mime_type: 'video/mp4',
      analysis: {
        executive_summary: 'This asset shows good brand alignment but requires some adjustments to meet full compliance standards.',
        details: {
          logo_usage: { 
            score: 88, 
            notes: 'Logo placement is correct but size should be increased by 10% for better visibility.'
          },
          color_palette: { 
            score: 82, 
            notes: 'Most colors align with brand palette. Consider adjusting the accent color for better consistency.'
          },
          typography: { 
            score: 79, 
            notes: 'Secondary font does not match brand guidelines. Please use the approved font family.'
          },
          messaging_tone: { 
            score: 90, 
            notes: 'Tone is on-brand and engaging. Message clearly communicates the value proposition.'
          },
          layout_composition: { 
            score: 86, 
            notes: 'Good visual balance. Consider adding more breathing room around the CTA button.'
          }
        }
      }
    };
    
    setCreatives([...creatives, newCreative]);
    
    // Show a success message
    alert('Creative uploaded successfully! (This is a mock upload for demo purposes)');
  };

  if (isLoading) {
    return (
      <QAlienLoadingScreen
        isVisible={isLoading}
        type="campaigns"
        message="Loading campaign details..."
        duration={1200}
      />
    );
  }

  const averageCompliance = creatives.length > 0 
    ? Math.round(creatives.reduce((acc, c) => acc + c.compliance_score, 0) / creatives.length)
    : 0;

  return (
    <div className="bg-[#1A1F2E] text-white min-h-screen">
      {/* Back Button */}
      <div className="px-8 py-6">
        <button 
          onClick={() => {
            console.log('Back button clicked - brandId:', brandId);
            // Navigate back to the brand's campaigns page if we have the brandId
            if (brandId) {
              router.push(`/brand/${brandId}`);
            } else {
              // Fallback to browser back or home
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }
          }}
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Brand Campaigns</span>
        </button>
      </div>

      {/* Campaign Header */}
      <div className="px-8 mb-8">
        <div className="bg-[#2A3142] rounded-2xl p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-semibold mb-2">{campaign.campaign_name}</h1>
                <p className="text-gray-400 mb-4">{campaign.campaign_type}</p>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-400">Status: <span className="text-green-400">{campaign.status}</span></span>
                  <span className="text-gray-400">Assets: <span className="text-white">{creatives.length}</span></span>
                  <span className="text-gray-400">Compliance: <span className="text-green-400">{campaign.compliance_rate}%</span></span>
                </div>
              </div>
            </div>
            <button
              onClick={handleUploadMedia}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Assets
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Brief */}
      <div className="px-8 mb-8">
        <div className="bg-[#2A3142] rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Campaign Brief</h2>
          <div className="bg-[#1A1F2E] rounded-xl p-4">
            <p className="text-gray-300">Focus on refreshing summer treats and family gatherings</p>
          </div>
        </div>
      </div>

      {/* Campaign Assets */}
      <div className="px-8 pb-8">
        <h2 className="text-2xl font-semibold mb-6">Campaign Assets</h2>
        
        {creatives.length === 0 ? (
          <div className="bg-[#2A3142] rounded-2xl p-12 text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-400 mb-4">No assets uploaded yet</p>
            <button
              onClick={handleUploadMedia}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Upload Your First Asset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatives.map((creative) => (
              <CreativeCard
                key={creative.creative_id}
                creative={creative}
                onClick={() => handleCreativeClick(creative)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Creative Detail Modal */}
      {selectedCreative && (
        <CreativeDetailModal
          creative={selectedCreative}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}