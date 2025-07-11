'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/lib/supabase';
import { Campaign } from '@/types/campaign';

export function useCampaigns(brandId: string) {
  const supabase = useSupabaseClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setCampaigns(data || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch campaigns'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (brandId) {
      fetchCampaigns();
    }
  }, [brandId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!brandId) return;

    const channel = supabase
      .channel(`campaigns-${brandId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'campaigns',
          filter: `brand_id=eq.${brandId}`
        },
        (payload) => {
          console.log('Campaign change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setCampaigns(prev => [payload.new as Campaign, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCampaigns(prev => 
              prev.map(campaign => 
                campaign.id === payload.new.id ? payload.new as Campaign : campaign
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setCampaigns(prev => 
              prev.filter(campaign => campaign.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId, supabase]);

  return {
    campaigns,
    isLoading,
    error,
    refetch: fetchCampaigns
  };
}