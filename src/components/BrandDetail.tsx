'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CampaignModal from './CampaignModal';
import TeamManagementModal from './TeamManagementModal';
import QAlienLoadingScreen from './QAlienLoadingScreen';
import { useSupabaseClient } from '@/lib/supabase';

interface Brand {
  id: string;
  brand_name: string;
  industry: string;
  description?: string;
  clerk_org_id: string;
}

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  campaign_type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  budget_amount: number;
  budget_currency: string;
  creative_count: number;
  approved_creative_count: number;
  roi_percentage: number;
  created_ts: string;
}

interface BrandDetailProps {
  brandId: string;
}

export default function BrandDetail({ brandId }: BrandDetailProps) {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  useEffect(() => {
    fetchBrandAndCampaigns();
  }, [brandId]);

  const fetchBrandAndCampaigns = async () => {
    try {
      setIsLoading(true);
      
      // Fetch brand details from Supabase
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brandError) {
        console.error('Error fetching brand:', brandError);
        throw brandError;
      }

      setBrand(brandData);
      
      // For now, set empty campaigns since we haven't implemented campaigns in Supabase yet
      setCampaigns([]);
      
    } catch (error: any) {
      console.error('Error fetching brand data:', error);
      // Set fallback data on error
      setBrand({
        id: brandId,
        brand_name: 'Test Brand',
        industry: 'Technology',
        description: 'A test brand for development',
        clerk_org_id: 'org_test'
      });
      
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignClick = (campaign: Campaign) => {
    if (!campaign.campaign_id) {
      console.error('Campaign ID is missing');
      return;
    }
    // Pass the brand ID as a query parameter so the campaign page knows how to navigate back
    console.log('BrandDetail - navigating to campaign:', campaign.campaign_id, 'with brandId:', brandId);
    router.push(`/campaign/${campaign.campaign_id}?brandId=${brandId}`);
  };

  const handleCampaignCreated = async () => {
    await fetchBrandAndCampaigns();
  };

  const getCampaignColor = (index: number) => {
    const colors = [
      'bg-purple-500',
      'bg-green-500',
      'bg-blue-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ];
    return colors[index % colors.length];
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-500/20', text: 'text-green-400' },
      draft: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
      completed: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
      archived: { bg: 'bg-gray-500/20', text: 'text-gray-400' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 ${config.bg} ${config.text} rounded-full text-sm font-medium`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <QAlienLoadingScreen
        isVisible={isLoading}
        type="campaigns"
        message="Loading brand campaigns..."
        duration={1000}
      />
    );
  }

  return (
    <div className="bg-[#1A1F2E] text-white">
      {/* Main Content */}
      <div className="px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl font-semibold mb-2">{brand?.brand_name || 'Campaigns'}</h2>
              <p className="text-gray-400 text-lg">Manage your brand campaigns and creative assets</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  console.log('Back to Brands clicked - brand:', brand, 'clerk_org_id:', brand?.clerk_org_id);
                  router.push(brand?.clerk_org_id ? `/?org=${brand.clerk_org_id}` : '/');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                ← Back to Brands
              </button>
              <button
                onClick={() => router.push(`/brand/${brandId}/settings`)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Brand Settings
              </button>
              <button
                onClick={() => setTeamModalOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manage Team
              </button>
              <button
                onClick={() => setCampaignModalOpen(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Campaign
              </button>
            </div>
          </div>

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((campaign, index) => (
              <div
                key={campaign.campaign_id}
                onClick={() => handleCampaignClick(campaign)}
                className="bg-[#2A3142] hover:bg-[#323B4F] rounded-2xl p-8 cursor-pointer transition-all hover:scale-[1.02] border border-gray-700"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-20 h-20 ${getCampaignColor(index)} rounded-2xl flex items-center justify-center`}>
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(campaign.status)}
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-2xl font-semibold mb-2">{campaign.campaign_name}</h3>
                <p className="text-gray-400 mb-4">{campaign.campaign_type}</p>
                
                {/* Campaign Metrics */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Budget</span>
                    <span className="text-white font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: campaign.budget_currency
                      }).format(campaign.budget_amount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">ROI</span>
                    <span className={`font-medium ${
                      campaign.roi_percentage > 0 ? 'text-green-400' : 
                      campaign.roi_percentage < 0 ? 'text-red-400' : 
                      'text-white'
                    }`}>
                      {campaign.roi_percentage > 0 && '+'}{campaign.roi_percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Creatives</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">{campaign.approved_creative_count}</span>
                      <span className="text-gray-500">/</span>
                      <span className="text-white">{campaign.creative_count}</span>
                    </div>
                  </div>
                </div>
                
                {campaign.start_date && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-500">
                      {new Date(campaign.start_date).toLocaleDateString()} - 
                      {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State - QAlien Style */}
          {campaigns.length === 0 && (
            <div className="text-center py-12">
              <div className="mb-8">
                <img 
                  src="/qalien-empty.png" 
                  alt="QAlien with magnifying glass indicating empty state"
                  className="w-32 h-32 mx-auto object-contain"
                  style={{
                    filter: 'contrast(1.2) brightness(0.9)',
                    mixBlendMode: 'lighten'
                  }}
                />
              </div>
              <h3 className="text-2xl font-medium mb-4 text-white">The universe seems empty here...</h3>
              <p className="text-gray-400 mb-8 text-lg">No campaigns found. Create your first campaign to start tracking performance!</p>
              <button
                onClick={() => setCampaignModalOpen(true)}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium"
              >
                Create Campaign
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Modal */}
      {brand && (
        <CampaignModal
          isOpen={campaignModalOpen}
          onClose={() => setCampaignModalOpen(false)}
          brandId={brandId}
          brandName={brand.brand_name}
          onSuccess={handleCampaignCreated}
        />
      )}

      {/* Team Management Modal */}
      {brand && (
        <TeamManagementModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          brandId={brandId}
          brandName={brand.brand_name}
          currentUserRole="Admin"
        />
      )}
    </div>
  );
}