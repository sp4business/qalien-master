import { Suspense } from 'react';
import ModernBrandOnboarding from "../../../components/ModernBrandOnboarding";
import QAlienLoadingScreen from "../../../components/QAlienLoadingScreen";

export default function BrandOnboardPage() {
  return (
    <Suspense 
      fallback={
        <QAlienLoadingScreen 
          isVisible={true} 
          type="brand" 
          message="Loading onboarding..." 
        />
      }
    >
      <ModernBrandOnboarding />
    </Suspense>
  );
}