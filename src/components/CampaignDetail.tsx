'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@clerk/nextjs';
import { Campaign } from '@/types/campaign';
import CreativeCard from './CreativeCard';
import CreativeDetailModal from './CreativeDetailModal';
import QAlienLoadingScreen from './QAlienLoadingScreen';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { useToast } from '@/components/ui/ToastContainer';

interface Creative {
  creative_id: string;
  name: string;
  compliance_score: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'Approved' | 'Warning' | 'Failed';
  upload_date: string;
  mime_type: string;
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

// Mock data for demo (will be replaced with real data later)
const mockCreatives: Creative[] = [
  {
    creative_id: 'summer-hero-banner',
    name: 'Summer Hero Banner',
    compliance_score: 92,
    status: 'Approved',
    upload_date: '1/14/2024',
    mime_type: 'image/jpeg',
    frontend_report: [
      {
        category: 'Logos/Iconography',
        icon: '🏷️',
        score: 95,
        status: 'pass',
        feedback: 'Logo is properly placed in the designated safe zone with correct clear space. The contrast ratio meets accessibility standards.',
        suggestions: ['Consider adding a subtle drop shadow for better visibility on light backgrounds']
      },
      {
        category: 'Colors/Palette',
        icon: '🎨',
        score: 90,
        status: 'pass',
        feedback: 'Primary brand colors are used effectively. Background gradient aligns with brand guidelines.'
      },
      {
        category: 'Brand Vocabulary',
        icon: '📝',
        score: 88,
        status: 'warning',
        feedback: 'Most brand vocabulary is correct, but some adjustments needed.',
        suggestions: ['Replace "Buy Now" with "Get Yours Today"', 'Use "Experience" instead of "Try"']
      },
      {
        category: 'Brand Tone',
        icon: '💬',
        score: 94,
        status: 'pass',
        feedback: 'Messaging perfectly captures the playful yet sophisticated brand voice. Call-to-action is clear and compelling.'
      },
      {
        category: 'Disclaimers & Required Language',
        icon: '⚖️',
        score: 100,
        status: 'pass',
        feedback: 'All required legal disclaimers are present and properly formatted.'
      },
      {
        category: 'Layout/Safe-zone',
        icon: '📐',
        score: 92,
        status: 'pass',
        feedback: 'Well-balanced composition with proper visual hierarchy. White space usage enhances readability.'
      }
    ],
    overall_status: 'approved'
  }
];

interface CampaignDetailProps {
  campaignId: string;
  brandId?: string | null;
}

export default function CampaignDetail({ campaignId, brandId }: CampaignDetailProps) {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { getToken } = useAuth();
  const { toast } = useToast();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>(mockCreatives);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [creativeToDelete, setCreativeToDelete] = useState<Creative | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failedAssets, setFailedAssets] = useState<Creative[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  // Function to fetch assets
  const fetchAssets = async () => {
    const { data: assetsData, error: assetsError } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
    } else if (assetsData && assetsData.length > 0) {
      // Convert assets to creative format (temporary until AI analysis is implemented)
      const loadedCreatives: Creative[] = assetsData.map(asset => {
        const isProcessing = asset.status === 'pending' || asset.status === 'processing';
        const { data: { publicUrl } } = supabase.storage
          .from('campaign-assets')
          .getPublicUrl(asset.storage_path);
        console.log('Asset thumbnail URL:', publicUrl, 'Storage path:', asset.storage_path);
        
        // Calculate compliance score if we have frontend_report
        let complianceScore = asset.compliance_score || 0;
        if (!isProcessing && asset.frontend_report && Array.isArray(asset.frontend_report)) {
          const totalChecks = asset.frontend_report.length;
          const passedChecks = asset.frontend_report.filter((check: any) => 
            check.result === 'pass' || check.status === 'pass'
          ).length;
          complianceScore = Math.round((passedChecks / totalChecks) * 100);
        }
        
        return {
          creative_id: asset.id,
          name: asset.asset_name || 'Untitled Asset',
          compliance_score: complianceScore,
          status: asset.status, // Keep raw status for processing check
          upload_date: new Date(asset.created_at).toLocaleDateString(),
          mime_type: asset.mime_type || 'image/jpeg',
          thumbnail_url: publicUrl,
          frontend_report: asset.frontend_report || undefined,
          overall_status: asset.overall_status || undefined,
          legend_results: asset.legend_results || undefined,
          raw_transcript_data: asset.raw_transcript_data || undefined,
          analysis: {
            executive_summary: isProcessing ? 'Processing...' : 'Analysis complete',
            details: {
              logo_usage: { score: 0, notes: isProcessing ? 'Processing...' : 'Analysis complete' },
              color_palette: { score: 0, notes: isProcessing ? 'Processing...' : 'Analysis complete' },
              typography: { score: 0, notes: isProcessing ? 'Processing...' : 'Analysis complete' },
              messaging_tone: { score: 0, notes: isProcessing ? 'Processing...' : 'Analysis complete' },
              layout_composition: { score: 0, notes: isProcessing ? 'Processing...' : 'Analysis complete' }
            }
          }
        };
      });
      
      // Separate failed assets
      const failed = loadedCreatives.filter(c => c.status === 'failed');
      const active = loadedCreatives.filter(c => c.status !== 'failed');
      
      setCreatives(active);
      setFailedAssets(failed);
    } else {
      // No assets found, clear the mock data
      setCreatives([]);
      setFailedAssets([]);
    }
  };

  // Fetch campaign data and assets
  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch campaign
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (campaignError) {
          throw campaignError;
        }

        if (!campaignData) {
          throw new Error('Campaign not found');
        }

        setCampaign(campaignData);

        // Fetch campaign assets
        await fetchAssets();
      } catch (err) {
        console.error('Error fetching campaign data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setIsLoading(false);
      }
    };

    if (campaignId) {
      fetchCampaignData();
    }
  }, [campaignId, supabase]);

  // Set up real-time subscription for campaign assets
  useEffect(() => {
    if (!campaignId) return;

    console.log('Setting up real-time subscription for campaign:', campaignId);

    const channel = supabase
      .channel(`campaign-assets-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_assets',
          filter: `campaign_id=eq.${campaignId}`
        },
        async (payload) => {
          console.log('Asset change detected:', {
            eventType: payload.eventType,
            old: payload.old,
            new: payload.new,
            campaignId
          });
          
          // Handle different event types
          if (payload.eventType === 'DELETE') {
            // For delete, remove from state immediately for better UX
            console.log('Removing asset from UI:', payload.old?.id);
            setCreatives(prev => {
              const filtered = prev.filter(c => c.creative_id !== payload.old?.id);
              console.log('Previous count:', prev.length, 'New count:', filtered.length);
              return filtered;
            });
          } else {
            // For INSERT and UPDATE, refresh the full list with a small delay to ensure data is committed
            // This helps avoid race conditions where we fetch before the transaction completes
            setTimeout(async () => {
              await fetchAssets();
            }, 500);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Removing subscription channel');
      supabase.removeChannel(channel);
    };
  }, [campaignId, supabase]);

  // Poll for updates on processing assets
  useEffect(() => {
    if (!campaignId) return;

    // Check if there are any processing assets
    const hasProcessingAssets = creatives.some(c => c.status === 'processing' || c.status === 'pending');
    
    if (!hasProcessingAssets) {
      console.log('No processing assets, skipping polling');
      return;
    }

    console.log('Starting polling for processing assets');
    
    // Poll every 3 seconds for processing assets
    const interval = setInterval(async () => {
      // Check if still have processing assets
      const stillProcessing = creatives.some(c => c.status === 'processing' || c.status === 'pending');
      
      if (!stillProcessing) {
        console.log('No more processing assets, stopping polling');
        clearInterval(interval);
        return;
      }
      
      console.log('Polling for asset updates...');
      await fetchAssets();
    }, 3000);

    return () => {
      console.log('Cleaning up polling interval');
      clearInterval(interval);
    };
  }, [campaignId, creatives, supabase]);

  const handleCreativeClick = (creative: Creative) => {
    setSelectedCreative(creative);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (creativeId: string) => {
    const creative = creatives.find(c => c.creative_id === creativeId);
    if (creative) {
      setCreativeToDelete(creative);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!creativeToDelete) return;

    setIsDeleting(true);
    
    try {
      // Get auth token
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No auth token');

      // Call delete edge function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-campaign-asset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: creativeToDelete.creative_id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete asset');
      }

      // Close modal and show success message
      setDeleteModalOpen(false);
      toast({
        title: 'Asset deleted',
        description: `"${creativeToDelete.name}" has been permanently deleted.`,
        variant: 'success'
      });
      
      // Manually remove from state for immediate UI update
      setCreatives(prev => prev.filter(c => c.creative_id !== creativeToDelete.creative_id));
      
      // Also fetch fresh data to ensure consistency
      setTimeout(() => {
        fetchAssets();
      }, 500);
      
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete asset',
        variant: 'error'
      });
    } finally {
      setIsDeleting(false);
      setCreativeToDelete(null);
    }
  };

  const handleRetryFailed = async () => {
    if (failedAssets.length === 0) return;
    
    setIsRetrying(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No auth token');
      
      // Call requeue function for each failed asset
      const retryPromises = failedAssets.map(async (asset) => {
        const { data, error } = await supabase.rpc('requeue_failed_asset', {
          asset_uuid: asset.creative_id
        });
        
        if (error) {
          console.error(`Failed to retry asset ${asset.name}:`, error);
          return { success: false, assetId: asset.creative_id };
        }
        
        return { success: true, assetId: asset.creative_id };
      });
      
      const results = await Promise.all(retryPromises);
      const successCount = results.filter(r => r.success).length;
      
      if (successCount > 0) {
        toast({
          title: 'Retry initiated',
          description: `Requeued ${successCount} of ${failedAssets.length} failed assets for processing.`,
          variant: 'success'
        });
        
        // Refresh assets list
        await fetchAssets();
      } else {
        toast({
          title: 'Retry failed',
          description: 'Unable to retry failed assets. Please try again.',
          variant: 'error'
        });
      }
    } catch (error) {
      console.error('Error retrying failed assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry assets',
        variant: 'error'
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleUploadMedia = async () => {
    try {
      // Create a hidden file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*,video/*,application/pdf';
      fileInput.multiple = true;

      fileInput.onchange = async (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        
        const newCreatives: Creative[] = [];
        let successCount = 0;
        let errorCount = 0;

        try {
          // Get auth token once for all uploads
          const token = await getToken({ template: 'supabase' });
          if (!token) throw new Error('No auth token');

          // Process all files
          for (const file of Array.from(files)) {
            try {
              // Step 1: Get upload URL from edge function
              const uploadUrlResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-asset-upload-url`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  campaignId,
                  fileName: file.name
                })
              });

              if (!uploadUrlResponse.ok) {
                const error = await uploadUrlResponse.json();
                throw new Error(error.error || 'Failed to get upload URL');
              }

              const { uploadUrl, storagePath } = await uploadUrlResponse.json();
              console.log('Got upload URL for file:', file.name, 'Storage path:', storagePath);

              // Step 2: Upload file to storage
              const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                  'Content-Type': file.type
                }
              });

              if (!uploadResponse.ok) {
                throw new Error('Failed to upload file');
              }

              // Step 3: Link asset to campaign
              const linkResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/link-campaign-asset`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  campaignId,
                  storagePath,
                  assetName: file.name,
                  mimeType: file.type
                })
              });

              if (!linkResponse.ok) {
                const error = await linkResponse.json();
                throw new Error(error.error || 'Failed to link asset');
              }

              const { asset } = await linkResponse.json();
              
              // Get the public URL using Supabase client
              const { data: { publicUrl } } = supabase.storage
                .from('campaign-assets')
                .getPublicUrl(storagePath);

              // Add to creatives list with processing status
              const newCreative: Creative = {
                creative_id: asset.id,
                name: asset.asset_name,
                compliance_score: 0, // Will be updated by AI
                status: 'Approved', // This will be used for compliance status later
                upload_date: new Date().toLocaleDateString(),
                mime_type: file.type,
                thumbnail_url: publicUrl,
                analysis: {
                  executive_summary: 'Processing...',
                  details: {
                    logo_usage: { score: 0, notes: 'Processing...' },
                    color_palette: { score: 0, notes: 'Processing...' },
                    typography: { score: 0, notes: 'Processing...' },
                    messaging_tone: { score: 0, notes: 'Processing...' },
                    layout_composition: { score: 0, notes: 'Processing...' }
                  }
                }
              };

              newCreatives.push(newCreative);
              successCount++;

            } catch (error) {
              console.error(`Error uploading ${file.name}:`, error);
              errorCount++;
            }
          }

          // The real-time subscription will automatically refresh the list
          // No need to manually update state here

          // Show appropriate toast message
          if (successCount > 0 && errorCount === 0) {
            toast({
              title: 'Upload complete',
              description: `Successfully uploaded ${successCount} ${successCount === 1 ? 'asset' : 'assets'}.`,
              variant: 'success'
            });
          } else if (successCount > 0 && errorCount > 0) {
            toast({
              title: 'Partial upload complete',
              description: `Uploaded ${successCount} of ${files.length} assets. ${errorCount} failed.`,
              variant: 'warning'
            });
          } else {
            toast({
              title: 'Upload failed',
              description: 'Failed to upload any assets.',
              variant: 'error'
            });
          }

        } catch (error) {
          console.error('Upload error:', error);
          toast({
            title: 'Upload failed',
            description: error instanceof Error ? error.message : 'Failed to upload assets',
            variant: 'error'
          });
        } finally {
          setIsUploading(false);
        }
      };

      // Trigger file selection
      fileInput.click();

    } catch (error) {
      console.error('Error in upload handler:', error);
      toast({
        title: 'Error',
        description: 'Failed to start upload',
        variant: 'error'
      });
    }
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

  if (error || !campaign) {
    return (
      <div className="bg-[#1A1F2E] text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-semibold mb-2">Campaign not found</h2>
          <p className="text-gray-400 mb-6">{error || 'The campaign you are looking for does not exist.'}</p>
          <button
            onClick={() => {
              if (brandId) {
                router.push(`/brand/${brandId}`);
              } else {
                router.push('/');
              }
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate campaign status based on dates
  const now = new Date();
  const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
  const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
  
  let status: 'draft' | 'active' | 'completed' = 'draft';
  if (startDate && endDate) {
    if (now < startDate) status = 'draft';
    else if (now > endDate) status = 'completed';
    else status = 'active';
  } else if (startDate && now >= startDate) {
    status = 'active';
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
            if (brandId) {
              router.push(`/brand/${brandId}`);
            } else {
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
                <h1 className="text-3xl font-semibold mb-2">{campaign.name}</h1>
                <p className="text-gray-400 mb-4">{campaign.campaign_type || 'Campaign'}</p>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-400">
                    Status: 
                    <span className={`ml-2 ${
                      status === 'active' ? 'text-green-400' : 
                      status === 'completed' ? 'text-blue-400' : 
                      'text-yellow-400'
                    }`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </span>
                  <span className="text-gray-400">Assets: <span className="text-white">{creatives.length}</span></span>
                  <span className="text-gray-400">
                    Compliance: 
                    <span className={`ml-2 ${
                      averageCompliance >= 90 ? 'text-green-400' :
                      averageCompliance >= 70 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {averageCompliance}%
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleUploadMedia}
              disabled={isUploading}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed rounded-xl transition-colors font-medium"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Assets
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Brief */}
      <div className="px-8 mb-8">
        <div className="bg-[#2A3142] rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Campaign Brief</h2>
          <div className="bg-[#1A1F2E] rounded-xl p-4">
            <p className="text-gray-300">
              {campaign.description || 'No description provided for this campaign.'}
            </p>
          </div>
          
          {/* Additional Campaign Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {campaign.budget && (
              <div className="bg-[#1A1F2E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Budget</p>
                <p className="text-white font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: campaign.currency || 'USD'
                  }).format(campaign.budget)}
                </p>
              </div>
            )}
            
            {campaign.start_date && (
              <div className="bg-[#1A1F2E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Start Date</p>
                <p className="text-white font-medium">
                  {new Date(campaign.start_date).toLocaleDateString()}
                </p>
              </div>
            )}
            
            {campaign.end_date && (
              <div className="bg-[#1A1F2E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">End Date</p>
                <p className="text-white font-medium">
                  {new Date(campaign.end_date).toLocaleDateString()}
                </p>
              </div>
            )}
            
            {campaign.country && (
              <div className="bg-[#1A1F2E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Country</p>
                <p className="text-white font-medium">{campaign.country}</p>
              </div>
            )}
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
              disabled={isUploading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Upload Your First Asset'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatives.map((creative) => (
              <CreativeCard
                key={creative.creative_id}
                creative={creative}
                onClick={() => handleCreativeClick(creative)}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Failed Assets Section */}
      {failedAssets.length > 0 && (
        <div className="px-8 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-red-400">Failed Assets</h2>
            <button
              onClick={handleRetryFailed}
              disabled={isRetrying}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {isRetrying ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry All Failed</span>
                </>
              )}
            </button>
          </div>
          
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-300 text-sm">
              These assets failed to process. This usually happens due to temporary API issues. Click "Retry All Failed" to reprocess them.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {failedAssets.map((creative) => (
              <CreativeCard
                key={creative.creative_id}
                creative={creative}
                onClick={() => handleCreativeClick(creative)}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Creative Detail Modal */}
      {selectedCreative && (
        <CreativeDetailModal
          creative={selectedCreative}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {creativeToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setCreativeToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          assetName={creativeToDelete.name}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}