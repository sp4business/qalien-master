'use client';

import { useParams } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import BrandDetail from '@/components/BrandDetail';

export default function BrandPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  return (
    <AuthWrapper>
      <BrandDetail brandId={brandId} />
    </AuthWrapper>
  );
}