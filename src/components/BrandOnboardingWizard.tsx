'use client';

import { useState, useEffect } from 'react';
import { fetchAuthSession } from '../lib/auth-stubs';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthWrapper from './AuthWrapper';
import InviteTeamStep from './InviteTeamStep';
import ExtractedLogos from './ExtractedLogos';
import { API_ENDPOINT } from '../aws-config';

// QAlien Brand Configuration Types (based on our data schemas)
interface BrandConfig {
  brand_name: string;
  industry: string;
  description?: string;
  website?: string;
  phonetic_pronunciation?: string;
  brand_tone?: string;
  color_palette: string[];
  disclaimers_required: string[];
  brand_vocabulary: {
    approved: string[];
    banned: string[];
    required: string[];
  };
}

interface FileUpload {
  file: File;
  preview?: string;
}

interface PDFAnalysisResult {
  logos?: {
    s3_key: string;
    confidence: number;
    page_number: number;
    bounding_box?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
  colors?: {
    hex: string;
    rgb: number[];
    frequency: number;
    confidence: string;
    source: string;
    source_detail?: string;
  }[];
  disclaimers?: string[];
  vocabulary?: {
    approved: string[];
    banned: string[];
  };
  isProcessing: boolean;
  isComplete: boolean;
  error?: string;
  analysis_id?: string;
}

// Wizard Steps based on QAlien detailed flows
enum OnboardingStep {
  COMPANY_INFO = 0,
  BRAND_GUIDELINES = 1,
  VISUAL_IDENTITY = 2,
  VERBAL_IDENTITY = 3,
  GOLDEN_SET = 4,
  INVITE_TEAM = 5,
  REVIEW = 6
}

export default function BrandOnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org');

  const [currentStep, setCurrentStep] = useState(OnboardingStep.COMPANY_INFO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [skipAutoRedirect, setSkipAutoRedirect] = useState(false);
  
  // Onboarding session management
  const [onboardingSessionId, setOnboardingSessionId] = useState<string>('');
  const [analysisId, setAnalysisId] = useState<string>('');
  const [brandId, setBrandId] = useState<string>(''); // Track created brand ID
  
  // Generate or retrieve session ID on component mount
  useEffect(() => {
    // Check if we have a session ID in sessionStorage
    const storedSessionId = sessionStorage.getItem('onboarding_session_id');
    if (storedSessionId) {
      setOnboardingSessionId(storedSessionId);
    } else {
      // Generate new session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setOnboardingSessionId(newSessionId);
      sessionStorage.setItem('onboarding_session_id', newSessionId);
    }
  }, []);

  // Form data based on QAlien brand schema
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    brand_name: '',
    industry: '',
    description: '',
    website: '',
    brand_tone: '',
    color_palette: [],
    disclaimers_required: [],
    brand_vocabulary: {
      approved: [],
      banned: [],
      required: []
    }
  });

  const [files, setFiles] = useState<{
    guidelines?: FileUpload;
    logos: FileUpload[];
    goldenSet: FileUpload[];
  }>({
    logos: [],
    goldenSet: []
  });

  // PDF Analysis state
  const [pdfAnalysis, setPdfAnalysis] = useState<PDFAnalysisResult>({
    isProcessing: false,
    isComplete: false
  });

  // Visual Identity mode - 'auto' for PDF extracted, 'manual' for user input
  const [visualIdentityMode, setVisualIdentityMode] = useState<'auto' | 'manual'>('manual');
  
  // Selected logo keys from extracted logos
  const [selectedLogoKeys, setSelectedLogoKeys] = useState<string[]>([]);

  const steps = [
    { id: OnboardingStep.COMPANY_INFO, title: 'Company Info', description: 'Basic brand information' },
    { id: OnboardingStep.BRAND_GUIDELINES, title: 'Guidelines', description: 'Upload brand guidelines PDF' },
    { id: OnboardingStep.VISUAL_IDENTITY, title: 'Visual Identity', description: 'Logos and color palette' },
    { id: OnboardingStep.VERBAL_IDENTITY, title: 'Verbal Identity', description: 'Tone and vocabulary rules' },
    { id: OnboardingStep.GOLDEN_SET, title: 'Golden Set', description: 'Perfect example creatives (optional)' },
    { id: OnboardingStep.INVITE_TEAM, title: 'Invite Team', description: 'Add collaborators (optional)' },
    { id: OnboardingStep.REVIEW, title: 'Review', description: 'Confirm and submit' }
  ];

  const updateBrandConfig = (updates: Partial<BrandConfig>) => {
    setBrandConfig(prev => ({ ...prev, ...updates }));
  };

  // Create brand early when user reaches Golden Set step
  const createBrandIfNeeded = async () => {
    if (brandId) return brandId; // Already created
    
    if (!brandConfig.brand_name) {
      throw new Error('Brand name is required before creating brand');
    }

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const finalAnalysisId = analysisId || pdfAnalysis.analysis_id;
      if (!finalAnalysisId) {
        throw new Error('No analysis ID available. Please upload brand guidelines first.');
      }

      // Create the brand
      const response = await fetch(`${API_ENDPOINT}/brands/finalize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onboarding_session_id: onboardingSessionId,
          analysis_id: finalAnalysisId,
          brand_name: brandConfig.brand_name,
          industry: brandConfig.industry || 'Other',
          description: brandConfig.description || '',
          website: brandConfig.website || '',
          phonetic_pronunciation: brandConfig.phonetic_pronunciation || '',
          selected_colors: visualIdentityMode === 'auto' && pdfAnalysis.colors
            ? brandConfig.color_palette.map(idx => pdfAnalysis.colors[parseInt(idx)]).filter(Boolean)
            : brandConfig.color_palette.filter(c => c.startsWith('#')).map(hex => ({ hex })),
          selected_logo_keys: selectedLogoKeys,
          primary_logo: selectedLogoKeys[0],
          brand_tone: brandConfig.brand_tone || '',
          disclaimers_required: brandConfig.disclaimers_required || [],
          brand_vocabulary: brandConfig.brand_vocabulary || { approved: [], banned: [], required: [] }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create brand: ${response.status}`);
      }

      const result = await response.json();
      setBrandId(result.brand_id);
      return result.brand_id;
    } catch (error) {
      console.error('Error creating brand early:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    console.log('🚀 Starting brand finalization...');
    console.log('Current state:', {
      onboardingSessionId,
      analysisId,
      pdfAnalysisId: pdfAnalysis.analysis_id,
      brandName: brandConfig.brand_name,
      selectedColors: brandConfig.color_palette,
      selectedLogos: selectedLogoKeys,
      existingBrandId: brandId
    });
    
    setIsSubmitting(true);
    try {
      // If brand was already created (during Golden Set step), we can skip to success
      if (brandId) {
        setSubmitResult({
          success: true,
          brand_id: brandId,
          brand_name: brandConfig.brand_name,
          message: 'Brand created successfully!'
        });
        setRedirectCountdown(5);
        return;
      }

      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Use analysis_id from state or pdfAnalysis
      const finalAnalysisId = analysisId || pdfAnalysis.analysis_id;
      if (!finalAnalysisId) {
        console.error('❌ No analysis_id available!');
        throw new Error('No analysis ID available. Please upload brand guidelines first.');
      }

      // Call the finalize endpoint to create the permanent brand
      const response = await fetch(`${API_ENDPOINT}/brands/finalize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onboarding_session_id: onboardingSessionId,
          analysis_id: finalAnalysisId,
          brand_name: brandConfig.brand_name,
          industry: brandConfig.industry,
          description: brandConfig.description,
          website: brandConfig.website,
          phonetic_pronunciation: brandConfig.phonetic_pronunciation,
          selected_colors: visualIdentityMode === 'auto' && pdfAnalysis.colors
            ? brandConfig.color_palette.map(idx => pdfAnalysis.colors[parseInt(idx)]).filter(Boolean)
            : brandConfig.color_palette.filter(c => c.startsWith('#')).map(hex => ({ hex })),
          selected_logo_keys: selectedLogoKeys,
          primary_logo: selectedLogoKeys[0] // First selected logo is primary
        })
      });

      const result = await response.json();
      console.log('📦 Response:', { status: response.status, data: result });
      setSubmitResult({ status: response.status, data: result });
      
      if (response.ok) {
        console.log('✅ Brand created successfully:', result);
        // Clear session storage
        sessionStorage.removeItem('onboarding_session_id');
        // Start countdown for auto-redirect to Business Center
        setRedirectCountdown(3);
      } else {
        console.error('❌ Brand finalization failed:', result);
        // Show detailed error to user
        const errorMessage = result.message || result.error || 'Failed to create brand';
        alert(`Brand creation failed: ${errorMessage}\n\nPlease check the console for more details.`);
      }
    } catch (error) {
      console.error('Error submitting brand:', error);
      setSubmitResult({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-redirect countdown effect
  useEffect(() => {
    if (redirectCountdown !== null && redirectCountdown > 0 && !skipAutoRedirect) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (redirectCountdown === 0 && !skipAutoRedirect) {
      // Redirect to Business Center
      router.push('/');
    }
  }, [redirectCountdown, skipAutoRedirect, router]);

  const handleGoNow = () => {
    setRedirectCountdown(null);
    router.push('/');
  };

  const handleSkipRedirect = () => {
    setSkipAutoRedirect(true);
    setRedirectCountdown(null);
  };


  const nextStep = () => {
    if (currentStep < OnboardingStep.REVIEW) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > OnboardingStep.COMPANY_INFO) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    // Clear the onboarding session
    sessionStorage.removeItem('onboarding_session_id');
    if (orgId) {
      router.push(`/?org=${orgId}`);
    } else {
      router.push('/');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case OnboardingStep.COMPANY_INFO:
        return brandConfig.brand_name && brandConfig.industry;
      case OnboardingStep.BRAND_GUIDELINES:
        return true; // Optional for now
      case OnboardingStep.VISUAL_IDENTITY:
        return true; // Optional for now
      case OnboardingStep.VERBAL_IDENTITY:
        return true; // Optional for now
      case OnboardingStep.GOLDEN_SET:
        return true; // Always optional
      case OnboardingStep.INVITE_TEAM:
        return true; // Optional - can skip
      case OnboardingStep.REVIEW:
        // For review step, ensure we have minimum required data
        const hasBasicInfo = brandConfig.brand_name && brandConfig.industry;
        const hasAnalysisId = analysisId || pdfAnalysis.analysis_id;
        const canFinalize = hasBasicInfo && hasAnalysisId && onboardingSessionId;
        
        if (!canFinalize) {
          console.warn('Cannot proceed with review:', {
            hasBasicInfo,
            hasAnalysisId,
            hasSessionId: !!onboardingSessionId,
            analysisId: analysisId || pdfAnalysis.analysis_id
          });
        }
        
        return canFinalize;
      default:
        return false;
    }
  };


  return (
    <AuthWrapper>
      <div className="max-w-5xl mx-auto py-12 px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-purple-400 mb-4">
            Brand Onboarding
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Set up your brand for AI-powered compliance analysis with our guided onboarding experience
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-6 left-0 w-full h-0.5 bg-gray-700">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />
            </div>
            
            {/* Steps */}
            <div className="relative flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${
                    index <= currentStep 
                      ? 'bg-gradient-to-r from-purple-500 to-purple-400 text-white border-transparent shadow-lg scale-110' 
                      : index === currentStep + 1
                      ? 'bg-[#2A3142] text-gray-400 border-gray-600 shadow-md'
                      : 'bg-[#1A1F2E] text-gray-500 border-gray-700'
                  }`}>
                    {index <= currentStep ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="text-center mt-3 max-w-24">
                    <div className={`text-sm font-medium transition-colors ${
                      index <= currentStep ? 'text-white' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 leading-tight">
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-[#2A3142] rounded-2xl shadow-xl border border-gray-700 p-8 mb-8">
          {currentStep === OnboardingStep.COMPANY_INFO && (
            <CompanyInfoStep 
              brandConfig={brandConfig} 
              updateBrandConfig={updateBrandConfig} 
            />
          )}
          
          {currentStep === OnboardingStep.BRAND_GUIDELINES && (
            <GuidelinesStep 
              files={files} 
              setFiles={setFiles}
              pdfAnalysis={pdfAnalysis}
              setPdfAnalysis={setPdfAnalysis}
              setVisualIdentityMode={setVisualIdentityMode}
              onboardingSessionId={onboardingSessionId}
              setAnalysisId={setAnalysisId}
              brandName={brandConfig.brand_name}
            />
          )}
          
          {currentStep === OnboardingStep.VISUAL_IDENTITY && (
            <VisualIdentityStep 
              brandConfig={brandConfig} 
              updateBrandConfig={updateBrandConfig}
              files={files} 
              setFiles={setFiles}
              pdfAnalysis={pdfAnalysis}
              visualIdentityMode={visualIdentityMode}
              setVisualIdentityMode={setVisualIdentityMode}
              selectedLogoKeys={selectedLogoKeys}
              setSelectedLogoKeys={setSelectedLogoKeys}
            />
          )}
          
          {currentStep === OnboardingStep.VERBAL_IDENTITY && (
            <VerbalIdentityStep 
              brandConfig={brandConfig} 
              updateBrandConfig={updateBrandConfig}
              pdfAnalysis={pdfAnalysis}
            />
          )}
          
          {currentStep === OnboardingStep.GOLDEN_SET && (
            <GoldenSetStep 
              files={files} 
              setFiles={setFiles}
              createBrandIfNeeded={createBrandIfNeeded}
              brandId={brandId}
            />
          )}
          
          {currentStep === OnboardingStep.INVITE_TEAM && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Invite Your Team</h2>
                <p className="text-gray-400">You can invite team members after creating the brand</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                <p className="text-blue-300 text-sm mb-4">
                  Team invitations will be available after you finalize the brand creation.
                  You'll be able to invite team members with different roles:
                </p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start space-x-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span><strong>Admin:</strong> Full brand management capabilities</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span><strong>Editor:</strong> Can upload and manage creatives</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span><strong>Viewer:</strong> Read-only access to brand content</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          {currentStep === OnboardingStep.REVIEW && (
            <ReviewStep 
              brandConfig={brandConfig} 
              files={files}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitResult={submitResult}
              redirectCountdown={redirectCountdown}
              skipAutoRedirect={skipAutoRedirect}
              handleGoNow={handleGoNow}
              handleSkipRedirect={handleSkipRedirect}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {currentStep === OnboardingStep.COMPANY_INFO ? (
            <button
              onClick={handleCancel}
              className="group flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-700 to-red-600 text-white rounded-xl hover:from-red-800 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancel</span>
            </button>
          ) : (
            <button
              onClick={prevStep}
              disabled={currentStep === OnboardingStep.COMPANY_INFO}
              className="group flex items-center space-x-2 px-6 py-3 text-gray-400 border border-gray-600 rounded-xl hover:bg-[#2A3142] hover:border-gray-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>
          )}
          
          {/* Step indicator */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          
          {currentStep < OnboardingStep.REVIEW ? (
            <div className="flex items-center space-x-3">
              {currentStep === OnboardingStep.INVITE_TEAM && (
                <button
                  onClick={nextStep}
                  className="px-6 py-3 text-gray-300 hover:text-white transition-colors"
                >
                  Skip for Now
                </button>
              )}
              <button
                onClick={() => {
                  if (currentStep === OnboardingStep.VERBAL_IDENTITY && !analysisId && !pdfAnalysis.analysis_id) {
                    alert('Please upload brand guidelines (PDF) first to continue.');
                    return;
                  }
                  nextStep();
                }}
                disabled={!canProceed()}
                className="group flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span>{currentStep === OnboardingStep.INVITE_TEAM ? 'Next Step' : 'Continue'}</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </AuthWrapper>
  );
}

// Step Components (adapted from lovable patterns, following QAlien schema)

interface CompanyInfoStepProps {
  brandConfig: BrandConfig;
  updateBrandConfig: (updates: Partial<BrandConfig>) => void;
}

function CompanyInfoStep({ brandConfig, updateBrandConfig }: CompanyInfoStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Company Information</h2>
        <p className="text-gray-400">Tell us about your brand to get started</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-300">
            Brand Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={brandConfig.brand_name}
            onChange={(e) => updateBrandConfig({ brand_name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500"
            placeholder="e.g., Nespresso"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-300">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            value={brandConfig.industry}
            onChange={(e) => updateBrandConfig({ industry: e.target.value })}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white hover:border-gray-500"
          >
            <option value="">Select industry</option>
            <option value="Food & Beverage">Food & Beverage</option>
            <option value="Fashion & Apparel">Fashion & Apparel</option>
            <option value="Technology">Technology</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Finance">Finance</option>
            <option value="Automotive">Automotive</option>
            <option value="Travel & Hospitality">Travel & Hospitality</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-300">
            Phonetic Pronunciation
          </label>
          <input
            type="text"
            value={brandConfig.phonetic_pronunciation || ''}
            onChange={(e) => updateBrandConfig({ phonetic_pronunciation: e.target.value })}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500"
            placeholder="e.g., NYE-key for Nike"
          />
          <p className="text-xs text-gray-500">How should your brand name be pronounced?</p>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-300">Website</label>
          <input
            type="url"
            value={brandConfig.website}
            onChange={(e) => updateBrandConfig({ website: e.target.value })}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500"
            placeholder="https://yourbrand.com"
          />
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="block text-sm font-semibold text-gray-300">Description</label>
          <textarea
            value={brandConfig.description}
            onChange={(e) => updateBrandConfig({ description: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500 resize-none"
            placeholder="Brief description of your brand and what makes it unique..."
          />
        </div>
      </div>
    </div>
  );
}

function GuidelinesStep({ files, setFiles, pdfAnalysis, setPdfAnalysis, setVisualIdentityMode, onboardingSessionId, setAnalysisId, brandName }: any) {
  const handleFileUpload = async (file: File) => {
    setFiles((prev: any) => ({ ...prev, guidelines: { file } }));
    
    // Start PDF analysis
    setPdfAnalysis((prev: any) => ({
      ...prev,
      isProcessing: true,
      isComplete: false,
      error: undefined
    }));

    try {
      // Get authentication token
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Start onboarding session to get upload URLs
      const onboardResponse = await fetch(`${API_ENDPOINT}/brand/onboard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onboarding_session_id: onboardingSessionId,
          brand_name: brandName || 'Brand',
          industry: 'Other' // Will be updated in finalization
        })
      });

      if (!onboardResponse.ok) {
        throw new Error('Failed to start onboarding session');
      }

      const onboardData = await onboardResponse.json();
      console.log('Onboarding session started:', onboardData);
      
      // Store the analysis ID for later use
      if (onboardData.analysis_id) {
        setAnalysisId(onboardData.analysis_id);
      }

      // Check if we have upload URLs
      if (onboardData.upload_urls?.pdf_guidelines) {
        // Upload PDF to S3 using pre-signed URL
        // Note: Metadata is already included in the presigned URL, don't add headers
        const uploadResponse = await fetch(onboardData.upload_urls.pdf_guidelines.upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/pdf'
          },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload PDF');
        }

        console.log('PDF uploaded successfully');

        // Trigger PDF analysis by calling the analyzer function
        console.log('Starting PDF analysis...');
        
        // Get the analysis_id from the onboarding response - MUST match what's in the metadata
        const analysisId = onboardData.upload_urls?.pdf_guidelines?.analysis_id;
        
        if (!analysisId) {
          console.error('❌ No analysis_id found in onboarding response!', onboardData);
          throw new Error('No analysis_id returned from onboarding session');
        }
        
        console.log('🔍 PDF Analysis Flow Debug:');
        console.log('📋 Onboarding response:', onboardData);
        console.log('🆔 Generated/extracted analysis_id:', analysisId);
        console.log('📤 Upload metadata:', {
          'analysis-id': onboardData.upload_urls?.pdf_guidelines?.analysis_id,
          'onboarding-session-id': onboardingSessionId,
          'org-id': onboardData.org_id
        });
        console.log('📁 Guidelines file:', files.guidelines);
        console.log('⏰ Timestamp:', new Date().toISOString());
        
        // Set processing state
        setPdfAnalysis({
          isProcessing: true,
          isComplete: false,
          analysis_id: analysisId
        });
        
        // Poll for PDF analysis results
        const pollAnalysisStatus = async () => {
          const maxAttempts = 20; // 2 minutes max (6s * 20)
          let attempts = 0;
          
          while (attempts < maxAttempts) {
            try {
              console.log(`📞 Polling attempt ${attempts + 1}/${maxAttempts} for analysis_id: ${analysisId}`);
              const session = await fetchAuthSession();
              const token = session.tokens?.idToken?.toString();
              
              const statusResponse = await fetch(`${API_ENDPOINT}/pdf-analysis/${analysisId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              console.log(`📡 Status response:`, statusResponse.status, statusResponse.statusText);
              
              if (statusResponse.ok) {
                const analysisResult = await statusResponse.json();
                
                if (analysisResult.status === 'completed') {
                  console.log('PDF analysis completed:', analysisResult);
                  
                  setPdfAnalysis({
                    logos: analysisResult.data?.logos || [],
                    colors: analysisResult.data?.colors || [],
                    disclaimers: analysisResult.data?.disclaimers || [],
                    vocabulary: analysisResult.data?.vocabulary || { approved: [], banned: [] },
                    isProcessing: false,
                    isComplete: true,
                    analysis_id: analysisId
                  });
                  
                  setVisualIdentityMode('auto');
                  return; // Success, exit polling
                  
                } else if (analysisResult.status === 'failed') {
                  console.error('PDF analysis failed:', analysisResult.error);
                  setPdfAnalysis({
                    isProcessing: false,
                    isComplete: false,
                    error: analysisResult.error || 'PDF analysis failed',
                    analysis_id: analysisId
                  });
                  return; // Failed, exit polling
                  
                } else if (analysisResult.status === 'processing') {
                  console.log('PDF analysis still processing...');
                  // Continue polling
                }
              } else if (statusResponse.status === 404) {
                // Analysis not started yet - S3 event should trigger it automatically
                console.log(`🚫 Analysis not found (404) - attempt ${attempts + 1}. Expected analysis_id: ${analysisId}`);
                if (attempts === 0) {
                  console.log('⏳ Waiting for S3 event to trigger PDF analysis...');
                } else {
                  console.log('🔄 Still waiting for analysis record to be created...');
                }
              } else {
                console.error(`⚠️ Unexpected response status: ${statusResponse.status}`);
                const errorText = await statusResponse.text();
                console.error(`💥 Error response:`, errorText);
              }
              
            } catch (pollError) {
              console.error('Error polling PDF analysis status:', pollError);
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
          }
          
          // Polling timeout
          console.error('PDF analysis polling timed out');
          setPdfAnalysis({
            isProcessing: false,
            isComplete: false,
            error: 'PDF analysis timed out. Please try again.',
            analysis_id: analysisId
          });
        };
        
        // Start polling
        pollAnalysisStatus();
        setVisualIdentityMode('auto');
      } else {
        throw new Error('No upload URL provided by backend');
      }
    } catch (error) {
      console.error('PDF analysis error:', error);
      setPdfAnalysis((prev: any) => ({
        ...prev,
        isProcessing: false,
        error: `Failed to analyze PDF: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
      }));
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Brand Guidelines</h2>
        <p className="text-gray-400">Upload your brand guidelines for AI analysis and compliance rule extraction</p>
      </div>
      
      <div className="border-2 border-dashed border-gray-600 rounded-2xl p-12 text-center bg-gradient-to-br from-[#1A1F2E] to-[#252B3B] hover:from-[#252B3B] hover:to-[#1A1F2E] transition-all duration-300">
        <div className="space-y-6">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500/20 to-rose-500/20 rounded-xl flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 1H7a2 2 0 00-2 2v16a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium mb-2">
              Drop your brand guidelines PDF here
            </p>
            <p className="text-gray-400 text-sm">
              Or click to browse and select your file
            </p>
          </div>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            id="guidelines-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
              }
            }}
          />
          <label
            htmlFor="guidelines-upload"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-[#2A3142] border border-gray-600 rounded-xl text-sm font-medium text-white hover:bg-[#323B4F] hover:border-gray-500 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Choose PDF File</span>
          </label>
          
          {/* File uploaded indicator */}
          {files.guidelines && !pdfAnalysis.isProcessing && !pdfAnalysis.isComplete && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 max-w-sm mx-auto">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-emerald-300 font-medium">{files.guidelines.file.name}</span>
              </div>
            </div>
          )}
          
          {/* Processing indicator */}
          {pdfAnalysis.isProcessing && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 max-w-sm mx-auto">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <span className="text-sm text-blue-300 font-medium">Analyzing PDF...</span>
              </div>
              <p className="text-xs text-blue-400/80 mt-2">Extracting logos, colors, and compliance rules</p>
            </div>
          )}
          
          {/* Analysis complete */}
          {pdfAnalysis.isComplete && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-md mx-auto">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-300 font-medium">Analysis Complete!</span>
              </div>
              <div className="text-xs text-green-400/80 space-y-1">
                <p>• {pdfAnalysis.logos?.length || 0} logos detected</p>
                <p>• {pdfAnalysis.colors?.length || 0} brand colors extracted</p>
                <p>• {pdfAnalysis.disclaimers?.length || 0} disclaimers found</p>
                <p>• Brand vocabulary analyzed</p>
              </div>
            </div>
          )}
          
          {/* Error state */}
          {pdfAnalysis.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 max-w-sm mx-auto">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-300 font-medium">Analysis Failed</span>
              </div>
              <p className="text-xs text-red-400/80 mt-1">{pdfAnalysis.error}</p>
            </div>
          )}
        </div>
      </div>
      
      {!files.guidelines && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-blue-300 font-medium text-sm mb-1">AI-Powered Analysis Available</p>
              <p className="text-blue-400/80 text-sm">Upload your brand guidelines to automatically extract logos, colors, and compliance rules for the next steps.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VisualIdentityStep({ brandConfig, updateBrandConfig, files, setFiles, pdfAnalysis, visualIdentityMode, setVisualIdentityMode, selectedLogoKeys, setSelectedLogoKeys }: any) {
  const addColor = () => {
    const newColor = '#000000';
    updateBrandConfig({
      color_palette: [...brandConfig.color_palette, newColor]
    });
  };

  const updateColor = (index: number, color: string) => {
    const newPalette = [...brandConfig.color_palette];
    newPalette[index] = color;
    updateBrandConfig({ color_palette: newPalette });
  };

  const removeColor = (index: number) => {
    const newPalette = brandConfig.color_palette.filter((_: any, i: number) => i !== index);
    updateBrandConfig({ color_palette: newPalette });
  };

  const useExtractedColors = () => {
    if (pdfAnalysis.colors) {
      // Store indices of selected colors instead of hex values
      const colorIndices = pdfAnalysis.colors.map((_: any, index: number) => index.toString()).slice(0, 8);
      updateBrandConfig({ color_palette: colorIndices });
    }
  };

  const switchToManualMode = () => {
    setVisualIdentityMode('manual');
  };

  const switchToAutoMode = () => {
    if (pdfAnalysis.isComplete) {
      setVisualIdentityMode('auto');
      useExtractedColors();
    }
  };

  return (
    <div className="space-y-10">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Visual Identity</h2>
        <p className="text-gray-400">
          {pdfAnalysis.isComplete 
            ? "Use AI-extracted assets or manually upload your brand assets" 
            : "Upload your brand assets and define your visual identity"}
        </p>
      </div>

      {/* Mode Switcher */}
      {pdfAnalysis.isComplete && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">PDF Analysis Available</h3>
              <p className="text-sm text-blue-300">We've extracted brand assets from your guidelines. Choose how to proceed:</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={switchToAutoMode}
              className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl border-2 transition-all ${
                visualIdentityMode === 'auto'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-[#1A1F2E] border-gray-600 text-gray-300 hover:border-blue-500/50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Use AI-Extracted</div>
                <div className="text-xs opacity-80">{pdfAnalysis.logos?.length || 0} logos, {pdfAnalysis.colors?.length || 0} colors</div>
              </div>
            </button>
            <button
              onClick={switchToManualMode}
              className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl border-2 transition-all ${
                visualIdentityMode === 'manual'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-[#1A1F2E] border-gray-600 text-gray-300 hover:border-purple-500/50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Manual Upload</div>
                <div className="text-xs opacity-80">Upload your own assets</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* AI-Extracted Logos */}
      {visualIdentityMode === 'auto' && pdfAnalysis.logos && pdfAnalysis.logos.length > 0 && (
        <div className="bg-gradient-to-br from-[#1A1F2E] to-[#252B3B] rounded-2xl p-6">
          <ExtractedLogos 
            logos={pdfAnalysis.logos}
            onSelectionChange={setSelectedLogoKeys}
          />
          
          {/* Show selected count */}
          {selectedLogoKeys.length > 0 && (
            <div className="mt-4 text-sm text-purple-300 text-right">
              {selectedLogoKeys.length} logo{selectedLogoKeys.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      )}

      {/* Manual Logo Upload */}
      {visualIdentityMode === 'manual' && (
        <div className="bg-gradient-to-br from-[#1A1F2E] to-[#252B3B] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span>Brand Logos</span>
          </h3>
          <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 bg-[#1A1F2E]/50">
            <p className="text-gray-400 mb-4 text-center">Upload logo variants (PNG, JPG, SVG formats supported)</p>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              multiple
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-indigo-500/20 file:to-purple-500/20 file:text-indigo-300 hover:file:from-indigo-500/30 hover:file:to-purple-500/30 transition-all file:shadow-lg"
              onChange={(e) => {
                const newFiles = Array.from(e.target.files || []).map(file => ({ file }));
                setFiles((prev: any) => ({ ...prev, logos: [...prev.logos, ...newFiles] }));
              }}
            />
            {files.logos.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-gray-300">{files.logos.length} logo file(s) uploaded:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {files.logos.map((logo: any, index: number) => (
                    <div key={index} className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-emerald-300 font-medium truncate">{logo.file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Color Palette */}
      <div className="bg-gradient-to-br from-[#1A1F2E] to-[#252B3B] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
            </div>
            <span>Color Palette</span>
          </h3>
          {visualIdentityMode === 'auto' && pdfAnalysis.colors && (
            <button
              onClick={useExtractedColors}
              className="text-sm px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
            >
              Refresh from PDF
            </button>
          )}
        </div>
        
        {visualIdentityMode === 'auto' && pdfAnalysis.colors && pdfAnalysis.colors.length > 0 && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <p className="text-sm text-blue-300 mb-3">AI-extracted colors from your brand guidelines:</p>
            <div className="flex flex-wrap gap-2">
              {pdfAnalysis.colors.map((color: any, index: number) => (
                <div key={index} className="flex items-center space-x-2 bg-[#1A1F2E] rounded-lg px-3 py-2">
                  <div
                    className="w-6 h-6 rounded border border-gray-600"
                    style={{ backgroundColor: color.hex }}
                  ></div>
                  <span className="text-xs text-white font-mono">{color.hex}</span>
                  <span className="text-xs text-gray-400">({Math.round(color.frequency * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {visualIdentityMode === 'manual' ? (
            // Manual mode - hex color inputs
            <div className="flex flex-wrap gap-4">
              {brandConfig.color_palette.map((color: string, index: number) => (
              <div key={index} className="bg-[#2A3142] rounded-xl p-4 border border-gray-700 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    className="w-14 h-14 rounded-xl border-2 border-gray-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => updateColor(index, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#1A1F2E] text-white"
                    />
                  </div>
                  <button
                    onClick={() => removeColor(index)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              ))}
            </div>
          ) : (
            // Auto mode - show extracted colors with checkboxes
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pdfAnalysis.colors?.map((color: any, index: number) => {
                const isSelected = brandConfig.color_palette.includes(index.toString());
                return (
                  <div
                    key={index}
                    onClick={() => {
                      const currentPalette = [...brandConfig.color_palette];
                      if (isSelected) {
                        // Remove from selection
                        const idx = currentPalette.indexOf(index.toString());
                        if (idx > -1) currentPalette.splice(idx, 1);
                      } else {
                        // Add to selection (max 8 colors)
                        if (currentPalette.length < 8) {
                          currentPalette.push(index.toString());
                        }
                      }
                      updateBrandConfig({ color_palette: currentPalette });
                    }}
                    className={`cursor-pointer bg-[#2A3142] rounded-xl p-4 border-2 transition-all ${
                      isSelected
                        ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-gray-600"
                        style={{ backgroundColor: color.hex }}
                      ></div>
                      <div className="flex-1">
                        <p className="text-sm font-mono text-white">{color.hex}</p>
                        <p className="text-xs text-gray-400">
                          {color.confidence === 'high' ? '✓ From text' : 'Extracted'}
                        </p>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={addColor}
            className="flex items-center space-x-2 px-4 py-3 text-sm bg-[#2A3142] border-2 border-dashed border-gray-600 text-gray-300 rounded-xl hover:bg-[#323B4F] hover:border-gray-500 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Color</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function VerbalIdentityStep({ brandConfig, updateBrandConfig, pdfAnalysis }: any) {
  // Auto-populate from PDF analysis when available
  useEffect(() => {
    const verbalData = pdfAnalysis?.results?.verbal_identity;
    console.log('VerbalIdentityStep - pdfAnalysis:', pdfAnalysis);
    console.log('VerbalIdentityStep - verbalData:', verbalData);
    if (verbalData && Object.keys(verbalData).length > 0) {
      // Only update if we have actual extracted data
      const updates: any = {};
      
      if (verbalData.brand_tone && !brandConfig.brand_tone) {
        updates.brand_tone = verbalData.brand_tone;
      }
      
      if (verbalData.approved_terms && verbalData.approved_terms.length > 0 && 
          brandConfig.brand_vocabulary.approved.length === 0) {
        updates.brand_vocabulary = {
          ...brandConfig.brand_vocabulary,
          approved: verbalData.approved_terms
        };
      }
      
      if (verbalData.banned_terms && verbalData.banned_terms.length > 0 && 
          brandConfig.brand_vocabulary.banned.length === 0) {
        updates.brand_vocabulary = {
          ...updates.brand_vocabulary || brandConfig.brand_vocabulary,
          banned: verbalData.banned_terms
        };
      }
      
      if (verbalData.required_disclaimers && verbalData.required_disclaimers.length > 0 && 
          brandConfig.disclaimers_required.length === 0) {
        updates.disclaimers_required = verbalData.required_disclaimers;
      }
      
      // Only update if we have something to update
      if (Object.keys(updates).length > 0) {
        updateBrandConfig(updates);
      }
    }
  }, [pdfAnalysis?.results?.verbal_identity]);
  const updateVocabulary = (type: 'approved' | 'banned' | 'required', value: string) => {
    const terms = value.split(',').map(term => term.trim()).filter(term => term);
    updateBrandConfig({
      brand_vocabulary: {
        ...brandConfig.brand_vocabulary,
        [type]: terms
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Verbal Identity</h2>
        <p className="text-gray-400">Define your brand's voice, tone, and vocabulary guidelines</p>
        {pdfAnalysis?.results?.verbal_identity && Object.keys(pdfAnalysis.results.verbal_identity).length > 0 && (
          <div className="mt-2 inline-flex items-center space-x-2 bg-blue-500/10 px-3 py-1 rounded-full">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-blue-300">AI-populated from PDF</span>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-300">Brand Tone & Voice</label>
        <textarea
          value={brandConfig.brand_tone}
          onChange={(e) => updateBrandConfig({ brand_tone: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500 resize-none"
          placeholder="e.g., Premium, sophisticated, inviting. Maintain European flair; avoid slang. Be conversational but not casual."
        />
        <p className="text-gray-500 text-sm">Describe your brand's personality, tone, and communication style</p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-300 flex items-center space-x-2">
          <span>Approved Terms</span>
          <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </label>
        <input
          type="text"
          value={brandConfig.brand_vocabulary.approved.join(', ')}
          onChange={(e) => updateVocabulary('approved', e.target.value)}
          className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500"
          placeholder="e.g., Nespresso, Original, Vertuo (comma-separated)"
        />
        <p className="text-gray-500 text-sm">Terms that align with your brand and should be used in content</p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-300 flex items-center space-x-2">
          <span>Banned Terms</span>
          <div className="w-5 h-5 bg-rose-500/20 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </label>
        <input
          type="text"
          value={brandConfig.brand_vocabulary.banned.join(', ')}
          onChange={(e) => updateVocabulary('banned', e.target.value)}
          className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500"
          placeholder="e.g., free refill, discount, cheap (comma-separated)"
        />
        <p className="text-gray-500 text-sm">Terms that conflict with your brand and should never appear</p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-300">Required Disclaimers</label>
        <textarea
          value={brandConfig.disclaimers_required.join('\n')}
          onChange={(e) => updateBrandConfig({ 
            disclaimers_required: e.target.value.split('\n').filter(line => line.trim()) 
          })}
          rows={3}
          className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500 resize-none"
          placeholder="e.g., © Nespresso 2025\n*Terms and conditions apply (one per line)"
        />
        <p className="text-gray-500 text-sm">Legal disclaimers or copyright notices that must appear in content</p>
      </div>
    </div>
  );
}

// Golden Set Creative Interface
interface GoldenSetCreative {
  id: string;
  file: File;
  category: 'UGC' | 'Produced' | '';
  description?: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  ml_processing_status: 'pending' | 'extracting' | 'embedding' | 'indexing' | 'completed' | 'failed';
  creative_id?: string;
  ml_results?: {
    golden_set_confidence?: number;
    compliance_tags?: string[];
    style_characteristics?: string[];
    reference_quality?: string;
  };
  error?: string;
}

function GoldenSetStep({ files, setFiles, createBrandIfNeeded, brandId }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org');
  
  const [goldenCreatives, setGoldenCreatives] = useState<GoldenSetCreative[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Add files to golden creatives with ML metadata structure
  const addFiles = (newFiles: File[]) => {
    const goldenFiles = newFiles.map(file => ({
      id: `golden_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      category: '' as 'UGC' | 'Produced' | '',
      description: '',
      uploadProgress: 0,
      status: 'pending' as const,
      ml_processing_status: 'pending' as const
    }));
    
    setGoldenCreatives(prev => [...prev, ...goldenFiles]);
    
    // Update legacy files state for backward compatibility
    const legacyFiles = newFiles.map(file => ({ file }));
    setFiles((prev: any) => ({ ...prev, goldenSet: [...prev.goldenSet, ...legacyFiles] }));
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Update creative metadata
  const updateCreative = (id: string, updates: Partial<GoldenSetCreative>) => {
    setGoldenCreatives(prev => 
      prev.map(creative => 
        creative.id === id ? { ...creative, ...updates } : creative
      )
    );
  };

  // Remove creative
  const removeCreative = (id: string) => {
    setGoldenCreatives(prev => prev.filter(creative => creative.id !== id));
  };

  // Upload creative to golden set API
  const uploadCreative = async (creative: GoldenSetCreative) => {
    try {
      updateCreative(creative.id, { status: 'uploading', uploadProgress: 0 });

      // Get authentication token
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      // Debug token
      console.log('Auth session:', session);
      console.log('Token exists:', !!token);
      console.log('Token preview:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Create brand if needed and get the real brand ID
      let realBrandId = brandId;
      if (!realBrandId) {
        try {
          realBrandId = await createBrandIfNeeded();
        } catch (error) {
          throw new Error('Unable to create brand. Please complete all previous steps first.');
        }
      }

      // Step 1: Ingest creative with minimal metadata
      const ingestResponse = await fetch(`${API_ENDPOINT}/brands/${realBrandId}/golden-creatives/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset_name: creative.file.name,
          content_type: creative.file.type.startsWith('video') ? 'video' : 'static',
          mime_type: creative.file.type,
          category: creative.category,
          description: creative.description || undefined
        })
      });

      if (!ingestResponse.ok) {
        throw new Error(`Failed to ingest creative: ${ingestResponse.status}`);
      }

      const { creative_id, upload_url } = await ingestResponse.json();
      updateCreative(creative.id, { creative_id, uploadProgress: 25 });
      
      // Debug logging
      console.log('Presigned URL received:', upload_url);
      console.log('File to upload:', creative.file.name, creative.file.type, creative.file.size);

      // Step 2: Upload file to S3
      console.log('Starting S3 upload...');
      console.log('Upload URL:', upload_url);
      console.log('File content type:', creative.file.type);
      
      try {
        const uploadResponse = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': creative.file.type
          },
          body: creative.file
        });
        
        console.log('S3 upload response:', uploadResponse.status, uploadResponse.statusText);
        const responseText = await uploadResponse.text();
        console.log('S3 response body:', responseText);

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText} - ${responseText}`);
        }
      } catch (uploadError) {
        console.error('S3 upload error:', uploadError);
        throw new Error(`S3 upload failed: ${uploadError.message}`);
      }

      updateCreative(creative.id, { 
        status: 'processing', 
        uploadProgress: 100,
        ml_processing_status: 'extracting'
      });

      // Step 3: Monitor ML processing
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${API_ENDPOINT}/brands/${realBrandId}/golden-creatives/${creative_id}/status`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            
            updateCreative(creative.id, {
              ml_processing_status: statusData.ml_processing_status
            });

            if (statusData.ml_processing_status === 'completed') {
              updateCreative(creative.id, {
                status: 'completed',
                ml_results: {
                  golden_set_confidence: statusData.golden_set_confidence || 0.95,
                  compliance_tags: statusData.compliance_tags || ['Brand Consistent', 'High Quality'],
                  style_characteristics: statusData.style_characteristics || ['Professional', 'Modern'],
                  reference_quality: statusData.reference_quality || 'high'
                }
              });
              clearInterval(pollInterval);
            } else if (statusData.ml_processing_status === 'failed') {
              updateCreative(creative.id, {
                status: 'failed',
                error: statusData.error || 'ML processing failed'
              });
              clearInterval(pollInterval);
            }
          }
        } catch (pollError) {
          console.error('Error polling ML status:', pollError);
        }
      }, 3000); // Poll every 3 seconds

      // Clear polling after 5 minutes max
      setTimeout(() => clearInterval(pollInterval), 300000);

    } catch (error) {
      console.error('Upload error:', error);
      updateCreative(creative.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  };

  // Upload all pending creatives
  const uploadAllCreatives = async () => {
    setIsUploading(true);
    
    const pendingCreatives = goldenCreatives.filter(c => 
      c.status === 'pending' && c.category !== ''
    );

    for (const creative of pendingCreatives) {
      await uploadCreative(creative);
    }
    
    setIsUploading(false);
  };

  // Get ML processing stage description
  const getMLStageDescription = (status: string) => {
    switch (status) {
      case 'extracting': return 'Extracting visual features...';
      case 'embedding': return 'Generating vector embeddings...';
      case 'indexing': return 'Indexing for similarity search...';
      case 'completed': return 'ML analysis complete ✓';
      case 'failed': return 'ML processing failed ✗';
      default: return 'Waiting for ML processing...';
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Golden Set Examples</h2>
        <p className="text-gray-400">Upload perfect example creatives for AI-powered compliance training</p>
      </div>
      
      {/* Drag and Drop Upload Zone */}
      <div 
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
          isDragging 
            ? 'border-yellow-400 bg-yellow-400/10' 
            : 'border-gray-600 bg-gradient-to-br from-[#1A1F2E] to-[#252B3B] hover:from-[#252B3B] hover:to-[#1A1F2E]'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-6">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium mb-2">
              Drop your golden set examples here
            </p>
            <p className="text-gray-400 text-sm">
              Upload 5-10 perfect examples of your brand creative for ML training
            </p>
          </div>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            id="golden-upload"
            onChange={(e) => {
              const newFiles = Array.from(e.target.files || []);
              addFiles(newFiles);
            }}
          />
          <label
            htmlFor="golden-upload"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-[#2A3142] border border-gray-600 rounded-xl text-sm font-medium text-white hover:bg-[#323B4F] hover:border-gray-500 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Choose Files</span>
          </label>
        </div>
      </div>

      {/* Golden Creatives List */}
      {goldenCreatives.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Golden Set Creatives ({goldenCreatives.length})
            </h3>
            <button
              onClick={uploadAllCreatives}
              disabled={isUploading || goldenCreatives.every(c => c.category === '' || c.status !== 'pending')}
              className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
            >
              {isUploading ? 'Processing...' : 'Start ML Processing'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {goldenCreatives.map((creative) => (
              <div key={creative.id} className="bg-[#2A3142] rounded-xl p-6 border border-gray-700">
                <div className="flex items-start space-x-4">
                  {/* File Preview */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg flex items-center justify-center">
                      {creative.file.type.startsWith('video') ? (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-4">
                    {/* File Info and Controls */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{creative.file.name}</p>
                        <p className="text-sm text-gray-400">
                          {(creative.file.size / 1024 / 1024).toFixed(1)} MB • {creative.file.type}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCreative(creative.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Metadata Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Category *
                        </label>
                        <select
                          value={creative.category}
                          onChange={(e) => updateCreative(creative.id, { category: e.target.value as 'UGC' | 'Produced' })}
                          className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-[#1A1F2E] text-white"
                          disabled={creative.status !== 'pending'}
                        >
                          <option value="">Select category</option>
                          <option value="UGC">UGC (User Generated Content)</option>
                          <option value="Produced">Produced (Professional Content)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={creative.description || ''}
                          onChange={(e) => updateCreative(creative.id, { description: e.target.value })}
                          placeholder="Why is this a perfect example?"
                          className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-[#1A1F2E] text-white placeholder-gray-500"
                          disabled={creative.status !== 'pending'}
                        />
                      </div>
                    </div>

                    {/* Progress and Status */}
                    {creative.status !== 'pending' && (
                      <div className="space-y-3">
                        {/* Upload Progress */}
                        {creative.status === 'uploading' && (
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-300">Uploading...</span>
                              <span className="text-gray-400">{creative.uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${creative.uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* ML Processing Status */}
                        {(creative.status === 'processing' || creative.status === 'completed') && (
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-300">
                                {getMLStageDescription(creative.ml_processing_status)}
                              </span>
                              {creative.ml_processing_status === 'completed' && (
                                <span className="text-green-400 font-medium">Complete</span>
                              )}
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  creative.ml_processing_status === 'completed' 
                                    ? 'bg-gradient-to-r from-green-500 to-green-400' 
                                    : 'bg-gradient-to-r from-yellow-500 to-orange-400 animate-pulse'
                                }`}
                                style={{ 
                                  width: creative.ml_processing_status === 'completed' ? '100%' : 
                                         creative.ml_processing_status === 'indexing' ? '80%' :
                                         creative.ml_processing_status === 'embedding' ? '60%' : 
                                         creative.ml_processing_status === 'extracting' ? '30%' : '10%'
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* ML Results */}
                        {creative.status === 'completed' && creative.ml_results && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-green-300 font-medium">ML Analysis Complete</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">Confidence Score:</span>
                                <span className="text-green-300 font-medium ml-2">
                                  {((creative.ml_results.golden_set_confidence || 0) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Reference Quality:</span>
                                <span className="text-green-300 font-medium ml-2 capitalize">
                                  {creative.ml_results.reference_quality || 'High'}
                                </span>
                              </div>
                              
                              {creative.ml_results.compliance_tags && creative.ml_results.compliance_tags.length > 0 && (
                                <div className="md:col-span-2">
                                  <span className="text-gray-400 block mb-2">Compliance Tags:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {creative.ml_results.compliance_tags.map((tag, index) => (
                                      <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {creative.ml_results.style_characteristics && creative.ml_results.style_characteristics.length > 0 && (
                                <div className="md:col-span-2">
                                  <span className="text-gray-400 block mb-2">Style Characteristics:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {creative.ml_results.style_characteristics.map((style, index) => (
                                      <span key={index} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                                        {style}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Error State */}
                        {creative.status === 'failed' && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-red-300 font-medium">Processing Failed</span>
                            </div>
                            {creative.error && (
                              <p className="text-red-400 text-sm mt-2">{creative.error}</p>
                            )}
                            <button
                              onClick={() => uploadCreative(creative)}
                              className="mt-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Info */}
      {goldenCreatives.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-yellow-300 font-medium mb-1">Golden Set ML Processing</p>
              <p className="text-yellow-400/80 text-sm">
                Your golden set examples will be analyzed using AI to extract visual features, generate embeddings, 
                and create a reference standard for future compliance analysis. This helps the system understand 
                what "perfect" looks like for your brand.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ brandConfig, files, onSubmit, isSubmitting, submitResult, redirectCountdown, skipAutoRedirect, handleGoNow, handleSkipRedirect }: any) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Review & Submit</h2>
        <p className="text-gray-400">Review your brand configuration before creating your compliance profile</p>
      </div>
      
      <div className="bg-gradient-to-br from-[#1A1F2E] to-[#252B3B] rounded-2xl p-8 space-y-6">
        {/* Brand Information */}
        <div className="bg-[#2A3142] rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Brand Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Brand Name</p>
              <p className="font-medium text-white">{brandConfig.brand_name || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Industry</p>
              <p className="font-medium text-white">{brandConfig.industry || 'Not specified'}</p>
            </div>
            {brandConfig.phonetic_pronunciation && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Phonetic Pronunciation</p>
                <p className="font-medium text-white">{brandConfig.phonetic_pronunciation}</p>
              </div>
            )}
            {brandConfig.website && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">Website</p>
                <p className="font-medium text-white">{brandConfig.website}</p>
              </div>
            )}
            {brandConfig.description && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-300">{brandConfig.description}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Files Summary */}
        <div className="bg-[#2A3142] rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500/20 to-rose-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 1H7a2 2 0 00-2 2v16a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Uploaded Assets</h3>
          </div>
          <div className="space-y-3">
            {files.guidelines ? (
              <div className="flex items-center space-x-2 text-emerald-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Brand guidelines PDF uploaded</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm">No brand guidelines uploaded</span>
              </div>
            )}
            
            {files.logos.length > 0 ? (
              <div className="flex items-center space-x-2 text-emerald-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{files.logos.length} logo file(s) uploaded</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm">No logo files uploaded</span>
              </div>
            )}
            
            {files.goldenSet.length > 0 ? (
              <div className="flex items-center space-x-2 text-emerald-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{files.goldenSet.length} golden set example(s) uploaded</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm">No golden set examples uploaded</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Color Palette */}
        {brandConfig.color_palette.length > 0 && (
          <div className="bg-[#2A3142] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Color Palette</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {brandConfig.color_palette.map((color: string, index: number) => (
                <div key={index} className="flex items-center space-x-2 bg-[#1A1F2E] rounded-lg p-2">
                  <div 
                    className="w-8 h-8 rounded-lg border-2 border-gray-600 shadow-sm" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-mono text-gray-400">{color}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-lg"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center space-x-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Creating Your Brand...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Create Brand Profile</span>
          </div>
        )}
      </button>

      {submitResult && (
        <div className={`rounded-2xl p-6 border ${submitResult.error ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          {submitResult.error ? (
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-rose-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-rose-300 font-semibold mb-1">Error Creating Brand</p>
                <p className="text-rose-400/80">{submitResult.error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-emerald-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-emerald-300 font-semibold mb-2">🎉 Brand Created Successfully!</p>
                  <div className="bg-[#2A3142] rounded-lg p-3 border border-emerald-500/30">
                    <p className="text-sm text-emerald-400 mb-1">Brand ID:</p>
                    <p className="font-mono text-sm text-gray-300">{submitResult.data.brand_id}</p>
                  </div>
                  <p className="text-emerald-400/80 text-sm mt-3">Your brand is now ready for AI-powered compliance analysis!</p>
                </div>
              </div>
              
              {/* Countdown and Navigation */}
              {redirectCountdown !== null && !skipAutoRedirect ? (
                <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <span className="text-purple-400 font-semibold text-sm">{redirectCountdown}</span>
                      </div>
                      <div>
                        <p className="text-purple-300 font-medium text-sm">
                          Redirecting to Business Center in {redirectCountdown} seconds...
                        </p>
                        <p className="text-purple-400/70 text-xs">
                          Start analyzing your creative assets and managing your brand
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleGoNow}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Go Now
                      </button>
                      <button
                        onClick={handleSkipRedirect}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Stay Here
                      </button>
                    </div>
                  </div>
                </div>
              ) : skipAutoRedirect ? (
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-blue-300 font-medium text-sm">Ready when you are!</p>
                        <p className="text-blue-400/70 text-xs">Your brand is set up and ready for creative analysis</p>
                      </div>
                    </div>
                    <button
                      onClick={handleGoNow}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg"
                    >
                      Go to Business Center
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}