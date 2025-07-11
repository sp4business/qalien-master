'use client';

import { useParams, useSearchParams } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import CampaignDetail from '@/components/CampaignDetail';

export default function CampaignPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const campaignId = params.campaignId as string;
  const brandId = searchParams.get('brandId');

  console.log('CampaignPage - campaignId:', campaignId, 'brandId:', brandId);

  return (
    <AuthWrapper>
      <CampaignDetail campaignId={campaignId} brandId={brandId} />
    </AuthWrapper>
  );
}