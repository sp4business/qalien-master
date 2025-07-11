export interface Campaign {
  id: string;
  brand_id: string;
  name: string;
  campaign_type?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  currency?: string;
  country?: string;
  created_at: string;
}

export interface CampaignWithMetrics extends Campaign {
  // Additional fields that might be computed or joined from other tables
  creative_count?: number;
  approved_creative_count?: number;
  roi_percentage?: number;
  status?: 'active' | 'draft' | 'completed' | 'archived';
}