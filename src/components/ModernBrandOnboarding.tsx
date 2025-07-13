'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useCreateBrand } from '@/hooks/useBrands';
import { useSupabaseClient, supabase as supabaseAnon } from '@/lib/supabase';
import ModernInviteTeamStep, { TeamMember } from './ModernInviteTeamStep';
import { useInviteTeam } from '@/hooks/useInviteTeam';

// Keep the same enum structure from original
enum OnboardingStep {
  COMPANY_INFO,
  BRAND_GUIDELINES,
  VISUAL_IDENTITY,
  VERBAL_IDENTITY,
  GOLDEN_SET,
  INVITE_TEAM,
  REVIEW
}

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

interface GoldenSetItem {
  id: string;
  file: File;
  thumbnail?: string;
  creativeType: 'UGC' | 'Produced';
}

export default function ModernBrandOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org');
  const { organization } = useOrganization();
  const { user } = useUser();
  const createBrand = useCreateBrand();
  const inviteTeam = useInviteTeam();
  const supabase = useSupabaseClient();
  
  const [currentStep, setCurrentStep] = useState(OnboardingStep.COMPANY_INFO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [skipAutoRedirect, setSkipAutoRedirect] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
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
  
  const [pendingInvites, setPendingInvites] = useState<TeamMember[]>([]);

  const [files, setFiles] = useState<{
    guidelines?: FileUpload;
    logos: FileUpload[];
    goldenSet: GoldenSetItem[];
  }>({
    logos: [],
    goldenSet: []
  });

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
        return brandConfig.brand_name && brandConfig.industry;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called');
    console.log('Current organization:', organization);
    console.log('Current user:', user);
    
    setIsSubmitting(true);
    try {
      if (!organization || !user) {
        throw new Error('Organization or user not found. Please ensure you are signed in.');
      }
      
      let guidelinesUrl = null;
      let logoUrls: string[] = [];
      
      // Step 3: Upload Guidelines PDF if present
      if (files.guidelines) {
        console.log('Uploading guidelines PDF...');
        setUploadProgress('Uploading brand guidelines...');
        
        // Generate unique filename with timestamp to avoid conflicts
        const fileExt = files.guidelines.file.name.split('.').pop();
        const fileName = `${Date.now()}-${brandConfig.brand_name.replace(/\s+/g, '-').toLowerCase()}.${fileExt}`;
        const filePath = `guidelines/${organization.id}/${fileName}`;
        
        console.log('Upload path:', filePath);
        
        // Use anonymous client for storage to avoid owner_id UUID issue
        const { data: uploadData, error: uploadError } = await supabaseAnon.storage
          .from('brand-assets')
          .upload(filePath, files.guidelines.file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload guidelines: ${uploadError.message}`);
        }
        
        console.log('Upload successful:', uploadData);
        
        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabaseAnon.storage
          .from('brand-assets')
          .getPublicUrl(filePath);
          
        guidelinesUrl = publicUrl;
        console.log('Guidelines URL:', guidelinesUrl);
      }
      
      // Upload Logo Files if present
      if (files.logos && files.logos.length > 0) {
        console.log(`Uploading ${files.logos.length} logo files...`);
        setUploadProgress(`Uploading ${files.logos.length} logo file${files.logos.length > 1 ? 's' : ''}...`);
        
        // Upload all logos in parallel
        const logoUploadPromises = files.logos.map(async (logoFile, index) => {
          try {
            const fileExt = logoFile.file.name.split('.').pop();
            const fileName = `${Date.now()}-${index}-${brandConfig.brand_name.replace(/\s+/g, '-').toLowerCase()}.${fileExt}`;
            const filePath = `logos/${organization.id}/${fileName}`;
            
            const { data: uploadData, error: uploadError } = await supabaseAnon.storage
              .from('brand-assets')
              .upload(filePath, logoFile.file, {
                cacheControl: '3600',
                upsert: false
              });
              
            if (uploadError) {
              console.error(`Logo ${index} upload error:`, uploadError);
              throw new Error(`Failed to upload logo ${logoFile.file.name}: ${uploadError.message}`);
            }
            
            // Get public URL
            const { data: { publicUrl } } = supabaseAnon.storage
              .from('brand-assets')
              .getPublicUrl(filePath);
              
            console.log(`Logo ${index} uploaded:`, publicUrl);
            return publicUrl;
          } catch (error) {
            console.error(`Error uploading logo ${index}:`, error);
            throw error;
          }
        });
        
        // Wait for all uploads to complete
        try {
          logoUrls = await Promise.all(logoUploadPromises);
          console.log('All logos uploaded successfully:', logoUrls);
        } catch (error) {
          throw new Error('Failed to upload one or more logo files');
        }
      }
      
      // Create brand with all data including visual and verbal identity
      const brandData = {
        name: brandConfig.brand_name,
        description: brandConfig.description || null,
        industry: brandConfig.industry || null,
        website: brandConfig.website || null,
        phonetic_pronunciation: brandConfig.phonetic_pronunciation || null,
        // Visual Identity data (Step 3)
        logo_files: logoUrls, // Now includes all uploaded logo URLs
        color_palette: brandConfig.color_palette, // Color hex codes from Step 3
        // Verbal Identity data (Step 4)
        tone_keywords: brandConfig.brand_tone ? brandConfig.brand_tone.split(',').map(t => t.trim()).filter(t => t) : [],
        approved_terms: brandConfig.brand_vocabulary.approved,
        banned_terms: brandConfig.brand_vocabulary.banned,
        required_disclaimers: brandConfig.disclaimers_required,
        // Initialize remaining fields
        guidelines_pdf_url: guidelinesUrl, // Guidelines PDF URL
        safe_zone_config: {}
      };
      
      console.log('Creating brand with data:', brandData);
      setUploadProgress('Saving brand information...');
      
      const result = await createBrand.mutateAsync(brandData);
      console.log('Brand created successfully:', result);
      const brandId = result.id;
      
      // Upload Golden Set files if present
      if (files.goldenSet && files.goldenSet.length > 0) {
        console.log(`Uploading ${files.goldenSet.length} golden set files...`);
        setUploadProgress(`Uploading ${files.goldenSet.length} golden set example${files.goldenSet.length > 1 ? 's' : ''}...`);
        
        // Upload all golden set files in parallel
        const goldenSetRecords = await Promise.all(
          files.goldenSet.map(async (goldenItem, index) => {
            try {
              const fileExt = goldenItem.file.name.split('.').pop();
              const fileName = `${goldenItem.id}-${goldenItem.file.name}`;
              const filePath = `golden-set/${brandId}/${fileName}`;
              
              // Upload file to storage
              const { data: uploadData, error: uploadError } = await supabaseAnon.storage
                .from('brand-assets')
                .upload(filePath, goldenItem.file, {
                  cacheControl: '3600',
                  upsert: false
                });
                
              if (uploadError) {
                console.error(`Golden set ${index} upload error:`, uploadError);
                throw new Error(`Failed to upload golden set file ${goldenItem.file.name}: ${uploadError.message}`);
              }
              
              // Get public URL
              const { data: { publicUrl } } = supabaseAnon.storage
                .from('brand-assets')
                .getPublicUrl(filePath);
                
              console.log(`Golden set ${index} uploaded:`, publicUrl);
              
              // Return record data for database insert
              return {
                brand_id: brandId,
                storage_path: filePath,
                file_name: goldenItem.file.name,
                file_type: goldenItem.file.type,
                file_size: goldenItem.file.size,
                creative_type: goldenItem.creativeType // Include the creative type
              };
            } catch (error) {
              console.error(`Error uploading golden set ${index}:`, error);
              throw error;
            }
          })
        );
        
        // Insert records into golden_set_creatives table
        console.log('Creating golden set records in database...');
        setUploadProgress('Saving golden set examples...');
        
        const { error: insertError } = await supabase
          .from('golden_set_creatives')
          .insert(goldenSetRecords);
          
        if (insertError) {
          console.error('Error creating golden set records:', insertError);
          throw new Error(`Failed to save golden set records: ${insertError.message}`);
        }
        
        console.log('Golden set records created successfully');
      }
      
      // Send team invitations if any
      if (pendingInvites.length > 0 && organization) {
        console.log(`Sending ${pendingInvites.length} team invitations...`);
        setUploadProgress(`Sending ${pendingInvites.length} team invitation${pendingInvites.length > 1 ? 's' : ''}...`);
        
        try {
          const inviteResult = await inviteTeam.mutateAsync({
            organizationId: organization.id,
            organizationName: organization.name,
            invitations: pendingInvites.map(invite => ({
              email: invite.email,
              role: invite.role
            }))
          });
          
          console.log('Invitation results:', inviteResult);
          
          // Check if there were any errors
          if (inviteResult.errors && inviteResult.errors.length > 0) {
            console.warn('Some invitations failed:', inviteResult.errors);
          }
          
          // Show success message with details
          const successCount = inviteResult.results?.length || 0;
          const errorCount = inviteResult.errors?.length || 0;
          
          if (successCount > 0) {
            console.log(`Successfully sent ${successCount} invitation(s)`);
          }
          
          if (errorCount > 0) {
            console.warn(`Failed to send ${errorCount} invitation(s)`);
          }
        } catch (inviteError) {
          // Don't fail the entire brand creation if invitations fail
          console.error('Error sending invitations:', inviteError);
          // We could show a warning here but continue with success
        }
      }
      
      setSubmitResult({ success: true });
      setRedirectCountdown(5);
    } catch (error: any) {
      console.error('Error creating brand - Full error:', error);
      const errorMessage = error.message || error.toString() || 'Failed to create brand';
      setSubmitResult({ error: errorMessage });
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
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
      // Redirect to Business Center with organization to show brands
      const orgParam = orgId || organization?.id;
      if (orgParam) {
        router.push(`/?org=${orgParam}`);
      } else {
        router.push('/');
      }
    }
  }, [redirectCountdown, skipAutoRedirect, router]);

  const handleGoNow = () => {
    setRedirectCountdown(null);
    const orgParam = orgId || organization?.id;
    if (orgParam) {
      router.push(`/?org=${orgParam}`);
    } else {
      router.push('/');
    }
  };

  const handleSkipRedirect = () => {
    setSkipAutoRedirect(true);
    setRedirectCountdown(null);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      {/* Header - Exact copy from original */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-purple-400 mb-4">
          Brand Onboarding
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Set up your brand for AI-powered compliance analysis with our guided onboarding experience
        </p>
      </div>

      {/* Progress Steps - Exact copy from original */}
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
          />
        )}
        
        {currentStep === OnboardingStep.VISUAL_IDENTITY && (
          <VisualIdentityStep 
            brandConfig={brandConfig} 
            updateBrandConfig={updateBrandConfig}
            files={files} 
            setFiles={setFiles}
          />
        )}
        
        {currentStep === OnboardingStep.VERBAL_IDENTITY && (
          <VerbalIdentityStep 
            brandConfig={brandConfig} 
            updateBrandConfig={updateBrandConfig}
          />
        )}
        
        {currentStep === OnboardingStep.GOLDEN_SET && (
          <GoldenSetStep 
            files={files} 
            setFiles={setFiles}
          />
        )}
        
        {currentStep === OnboardingStep.INVITE_TEAM && (
          <ModernInviteTeamStep 
            brandName={brandConfig.brand_name}
            pendingInvites={pendingInvites}
            setPendingInvites={setPendingInvites}
          />
        )}
        
        {currentStep === OnboardingStep.REVIEW && (
          <ReviewStep 
            brandConfig={brandConfig} 
            files={files}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitResult={submitResult}
            setSubmitResult={setSubmitResult}
            redirectCountdown={redirectCountdown}
            skipAutoRedirect={skipAutoRedirect}
            handleGoNow={handleGoNow}
            handleSkipRedirect={handleSkipRedirect}
            uploadProgress={uploadProgress}
          />
        )}
      </div>

      {/* Navigation - Exact copy from original */}
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
              onClick={nextStep}
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
  );
}

// Step Components - Exact copies from original

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
          <label className="block text-sm font-semibold text-gray-300">Website</label>
          <input
            type="url"
            value={brandConfig.website}
            onChange={(e) => updateBrandConfig({ website: e.target.value })}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500"
            placeholder="https://yourbrand.com"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-300">
            Phonetic Pronunciation (Optional)
          </label>
          <input
            type="text"
            value={brandConfig.phonetic_pronunciation || ''}
            onChange={(e) => updateBrandConfig({ phonetic_pronunciation: e.target.value })}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500"
            placeholder="e.g., loo-loo-lemon"
          />
          <p className="text-xs text-gray-500">How should your brand name be pronounced?</p>
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

function GuidelinesStep({ files, setFiles }: any) {
  const handleFileUpload = async (file: File) => {
    setFiles((prev: any) => ({ ...prev, guidelines: { file } }));
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Brand Guidelines</h2>
        <p className="text-gray-400">Upload your brand guidelines PDF for reference</p>
      </div>
      
      <div className="max-w-xl mx-auto">
        {/* File Upload Zone */}
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 hover:bg-purple-500/5 transition-all duration-200 cursor-pointer"
            onClick={() => document.getElementById('guidelines-upload')?.click()}
          >
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-300 font-semibold mb-2">
              {files.guidelines ? files.guidelines.file.name : 'Click to upload PDF'}
            </p>
            <p className="text-sm text-gray-500">or drag and drop your brand guidelines PDF here</p>
            <input
              id="guidelines-upload"
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
          </div>
        </div>
        
        {/* File uploaded indicator */}
        {files.guidelines && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-green-300 font-medium">PDF uploaded successfully</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VisualIdentityStep({ brandConfig, updateBrandConfig, files, setFiles }: any) {
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).map(file => ({ file }));
    setFiles((prev: any) => ({ ...prev, logos: [...prev.logos, ...newFiles] }));
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Visual Identity</h2>
        <p className="text-gray-400">Define your brand's visual elements</p>
      </div>
      
      {/* Logo Upload */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <span>Logo Files</span>
        </h3>
        
        <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center hover:border-purple-500 hover:bg-purple-500/5 transition-all duration-200 cursor-pointer"
             onClick={() => document.getElementById('logo-upload')?.click()}>
          <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-300 font-medium">Upload logo files</p>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG (max 10MB)</p>
          <input
            id="logo-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
        
        {files.logos.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {files.logos.map((logo: FileUpload, index: number) => (
              <div key={index} className="relative bg-[#1A1F2E] rounded-lg p-3 border border-gray-700">
                <img
                  src={URL.createObjectURL(logo.file)}
                  alt={`Logo ${index + 1}`}
                  className="w-full h-24 object-contain"
                />
                <button
                  onClick={() => {
                    setFiles((prev: any) => ({
                      ...prev,
                      logos: prev.logos.filter((_: any, i: number) => i !== index)
                    }));
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Color Palette */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span>Color Palette</span>
          </h3>
        </div>
        
        <div className="space-y-6">
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
            
            <button
              onClick={addColor}
              className="w-36 h-24 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center hover:border-purple-500 hover:bg-purple-500/10 transition-all cursor-pointer"
            >
              <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-gray-400">Add Color</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerbalIdentityStep({ brandConfig, updateBrandConfig }: any) {
  const updateVocabulary = (type: 'approved' | 'banned' | 'required', value: string) => {
    // Support both comma and newline separation
    const terms = value
      .split(/[,\n]+/)
      .map(term => term.trim())
      .filter(term => term);
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Verbal Identity</h2>
        <p className="text-gray-400">Define your brand's tone and vocabulary</p>
      </div>
      
      <div className="space-y-8">
        {/* Brand Tone */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Brand Tone</h3>
          <textarea
            value={brandConfig.brand_tone || ''}
            onChange={(e) => updateBrandConfig({ brand_tone: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500 resize-none"
            placeholder="e.g., Professional, friendly, approachable, expert..."
          />
        </div>
        
        {/* Brand Vocabulary */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Brand Vocabulary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Approved Terms</label>
              <textarea
                value={brandConfig.brand_vocabulary.approved.join(', ')}
                onChange={(e) => updateVocabulary('approved', e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500 resize-none"
                placeholder="Premium, Quality, Excellence..."
              />
              <p className="text-xs text-gray-500">Comma or newline separated ({brandConfig.brand_vocabulary.approved.length} terms)</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Banned Terms</label>
              <textarea
                value={brandConfig.brand_vocabulary.banned.join(', ')}
                onChange={(e) => updateVocabulary('banned', e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500 resize-none"
                placeholder="Cheap, Discount, Sale..."
              />
              <p className="text-xs text-gray-500">Terms to avoid ({brandConfig.brand_vocabulary.banned.length} terms)</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Required Terms</label>
              <textarea
                value={brandConfig.brand_vocabulary.required.join(', ')}
                onChange={(e) => updateVocabulary('required', e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500 resize-none"
                placeholder="Official Partner, Authorized..."
              />
              <p className="text-xs text-gray-500">Must include terms ({brandConfig.brand_vocabulary.required.length} terms)</p>
            </div>
          </div>
        </div>
        
        {/* Disclaimers */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Required Disclaimers</h3>
          <textarea
            value={brandConfig.disclaimers_required.join('\n')}
            onChange={(e) => updateBrandConfig({ 
              disclaimers_required: e.target.value.split('\n').filter(d => d.trim()) 
            })}
            rows={4}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500 resize-none"
            placeholder="© 2025 Your Brand. All rights reserved.&#10;Terms and conditions apply..."
          />
          <p className="text-xs text-gray-500">One disclaimer per line ({brandConfig.disclaimers_required.length} disclaimers)</p>
        </div>
      </div>
    </div>
  );
}

function GoldenSetStep({ files, setFiles }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Process each file
      const newItems = await Promise.all(
      selectedFiles.map(async (file) => {
        const item: GoldenSetItem = {
          id: crypto.randomUUID(),
          file,
          creativeType: 'Produced', // Default to Produced
          thumbnail: undefined
        };
        
        // Generate thumbnail for videos
        if (file.type.startsWith('video/')) {
          try {
            const { generateVideoThumbnail } = await import('@/lib/video-utils');
            item.thumbnail = await generateVideoThumbnail(file);
          } catch (error) {
            console.error('Failed to generate thumbnail:', error);
          }
        }
        
        return item;
      })
      );
      
      setFiles((prev: any) => ({ ...prev, goldenSet: [...prev.goldenSet, ...newItems] }));
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const updateCreativeType = (id: string, type: 'UGC' | 'Produced') => {
    setFiles((prev: any) => ({
      ...prev,
      goldenSet: prev.goldenSet.map((item: GoldenSetItem) =>
        item.id === id ? { ...item, creativeType: type } : item
      )
    }));
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Golden Set</h2>
        <p className="text-gray-400">Upload perfect examples of on-brand creatives (optional)</p>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-yellow-300 font-medium text-sm mb-1">What are Golden Set creatives?</p>
              <p className="text-yellow-400/80 text-sm">These are perfect examples of your brand in action. Our AI will use these as references to better understand your brand's style and ensure future creatives match this gold standard.</p>
            </div>
          </div>
        </div>
        
        <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 hover:bg-purple-500/5 transition-all duration-200 cursor-pointer"
             onClick={() => document.getElementById('golden-upload')?.click()}>
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-300 font-semibold mb-2">Upload Golden Examples</p>
          <p className="text-sm text-gray-500">Images or videos that perfectly represent your brand</p>
          <input
            id="golden-upload"
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        
        {isProcessing && (
          <div className="mt-4 flex items-center justify-center space-x-2 text-purple-400">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Processing videos...</span>
          </div>
        )}
        
        {files.goldenSet.length > 0 && (
          <div className="mt-6 space-y-4">
            {files.goldenSet.map((item: GoldenSetItem) => (
              <div key={item.id} className="bg-[#1A1F2E] rounded-lg p-4 border border-gray-700">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {item.file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(item.file)}
                        alt={item.file.name}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    ) : item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.file.name}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-800 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* File info and type selector */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-200">{item.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setFiles((prev: any) => ({
                            ...prev,
                            goldenSet: prev.goldenSet.filter((g: GoldenSetItem) => g.id !== item.id)
                          }));
                        }}
                        className="w-6 h-6 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center"
                      >
                        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Type selector */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">Type:</span>
                      <div className="flex rounded-lg overflow-hidden border border-gray-600">
                        <button
                          onClick={() => updateCreativeType(item.id, 'UGC')}
                          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                            item.creativeType === 'UGC'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          UGC
                        </button>
                        <button
                          onClick={() => updateCreativeType(item.id, 'Produced')}
                          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                            item.creativeType === 'Produced'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Produced
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewStep({ brandConfig, files, onSubmit, isSubmitting, submitResult, setSubmitResult, redirectCountdown, skipAutoRedirect, handleGoNow, handleSkipRedirect, uploadProgress }: any) {
  return (
    <div className="space-y-8">
      {!submitResult ? (
        <>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Review & Submit</h2>
            <p className="text-gray-400">Review your brand configuration before finalizing</p>
          </div>
          
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-[#2A3142] rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Company Information</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Brand Name:</span>
                  <span className="text-white font-medium">{brandConfig.brand_name || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Industry:</span>
                  <span className="text-white font-medium">{brandConfig.industry || 'Not set'}</span>
                </div>
                {brandConfig.website && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Website:</span>
                    <span className="text-white font-medium">{brandConfig.website}</span>
                  </div>
                )}
                {brandConfig.phonetic_pronunciation && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Phonetic Pronunciation:</span>
                    <span className="text-white font-medium">{brandConfig.phonetic_pronunciation}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Files Uploaded */}
            <div className="bg-[#2A3142] rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Uploaded Files</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Brand Guidelines:</span>
                  <span className="text-white font-medium">{files.guidelines ? '✓ Uploaded' : 'Not uploaded'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Logo Files:</span>
                  <span className="text-white font-medium">{files.logos.length} file(s)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Golden Set:</span>
                  <span className="text-white font-medium">{files.goldenSet.length} file(s)</span>
                </div>
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
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (uploadProgress || 'Creating Brand...') : 'Create Brand'}
          </button>
        </>
      ) : (
        /* Success State */
        <div className="text-center">
          {submitResult.success ? (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white">Brand Created Successfully!</h2>
              <p className="text-gray-400 text-lg">Your brand has been set up and is ready for compliance analysis.</p>
              
              {redirectCountdown !== null && !skipAutoRedirect ? (
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-300 mb-3">Redirecting to Business Center in {redirectCountdown} seconds...</p>
                  <div className="flex items-center justify-center space-x-3">
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
              ) : skipAutoRedirect ? (
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-blue-300">Auto-redirect cancelled. Click below when ready.</p>
                    </div>
                    <button
                      onClick={handleGoNow}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Go to Business Center
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* Error State */
            <div className="space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-red-400 to-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white">Something went wrong</h2>
              <p className="text-gray-400 text-lg">{submitResult.error || 'Failed to create brand. Please try again.'}</p>
              <button
                onClick={() => setSubmitResult(null)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}