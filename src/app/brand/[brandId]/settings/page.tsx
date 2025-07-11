'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/lib/supabase';
import { ChevronLeft, Building2, FileText, Palette, MessageSquare, Star, AlertTriangle } from 'lucide-react';
import CompanyInfo from '@/components/settings/CompanyInfo';
import Guidelines from '@/components/settings/Guidelines';
import VisualIdentity from '@/components/settings/VisualIdentity';
import VerbalIdentity from '@/components/settings/VerbalIdentity';
import GoldenSet from '@/components/settings/GoldenSet';
import DangerZone from '@/components/settings/DangerZone';

interface Brand {
  id: string;
  name: string;
  brand_name?: string; // For backward compatibility
  clerk_org_id: string;
  industry: string;
  description: string;
  website: string;
  guidelines_pdf_url?: string;
  logo_files?: string[];
  color_palette?: string[];
  tone_keywords?: string[];
  approved_terms?: string[];
  banned_terms?: string[];
  required_disclaimers?: string[];
  created_at: string;
  updated_at: string;
}

export default function BrandSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const brandId = params.brandId as string;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('company');

  useEffect(() => {
    fetchBrandData();
  }, [brandId]);

  const fetchBrandData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;
      
      setBrand(data);
    } catch (err) {
      console.error('Error fetching brand:', err);
      setError(err instanceof Error ? err.message : 'Failed to load brand');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'company', title: 'Company Info', icon: Building2, component: CompanyInfo },
    { id: 'guidelines', title: 'Guidelines', icon: FileText, component: Guidelines },
    { id: 'visual', title: 'Visual Identity', icon: Palette, component: VisualIdentity },
    { id: 'verbal', title: 'Verbal Identity', icon: MessageSquare, component: VerbalIdentity },
    { id: 'golden', title: 'Golden Set', icon: Star, component: GoldenSet },
    { id: 'danger', title: 'Danger Zone', icon: AlertTriangle, component: DangerZone, danger: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading brand settings...</p>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Brand not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{brand.name || brand.brand_name}</h1>
                <p className="text-sm text-gray-500">Brand Settings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? section.danger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600' 
                        : section.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {ActiveComponent && <ActiveComponent brand={brand} onUpdate={fetchBrandData} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}