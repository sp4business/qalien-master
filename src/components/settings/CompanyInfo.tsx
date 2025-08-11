'use client';

import { useState } from 'react';
import { Building2, Globe, FileText, Calendar, Edit2, Save, X, Volume2 } from 'lucide-react';
import { useSupabaseClient } from '@/lib/supabase';

interface CompanyInfoProps {
  brand: {
    id: string;
    name?: string;
    brand_name?: string;
    industry: string;
    description: string;
    website: string;
    created_at: string;
    updated_at: string;
    phonetic_pronunciation?: string | null;
  };
  onUpdate: () => void;
}

export default function CompanyInfo({ brand, onUpdate }: CompanyInfoProps) {
  const supabase = useSupabaseClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const brandName = brand.brand_name || brand.name || '';
  const [formData, setFormData] = useState({
    brand_name: brandName,
    industry: brand.industry,
    description: brand.description,
    website: brand.website,
    phonetic_pronunciation: brand.phonetic_pronunciation || ''
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('brands')
        .update({
          name: formData.brand_name,
          industry: formData.industry,
          description: formData.description,
          website: formData.website,
          phonetic_pronunciation: formData.phonetic_pronunciation || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (error) throw error;
      
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating brand:', error);
      alert('Failed to update brand information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      brand_name: brandName,
      industry: brand.industry,
      description: brand.description,
      website: brand.website
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">Company Information</h2>
          <p className="text-gray-400">Basic information about your brand</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Brand Name */}
        <div className="border border-gray-700 rounded-lg p-4 bg-[#1A1F2E]">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Brand Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F1117] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <p className="text-white">{brandName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Phonetic Pronunciation */}
        <div className="border border-gray-700 rounded-lg p-4 bg-[#1A1F2E]">
          <div className="flex items-start gap-3">
            <Volume2 className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phonetic Pronunciation
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={formData.phonetic_pronunciation}
                    onChange={(e) => setFormData({ ...formData, phonetic_pronunciation: e.target.value })}
                    placeholder="e.g., ko-kah KOH-lah for 'Coca-Cola'"
                    className="w-full px-3 py-2 bg-[#0F1117] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    How should "{brandName}" be pronounced? This ensures AI correctly pronounces your brand.
                  </p>
                </div>
              ) : (
                <p className="text-white">
                  {brand.phonetic_pronunciation || <span className="text-gray-500 italic">Not specified</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Industry */}
        <div className="border border-gray-700 rounded-lg p-4 bg-[#1A1F2E]">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Industry
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F1117] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <p className="text-white">{brand.industry}</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border border-gray-700 rounded-lg p-4 bg-[#1A1F2E]">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0F1117] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <p className="text-white whitespace-pre-wrap">
                  {brand.description || 'No description provided'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Website */}
        <div className="border border-gray-700 rounded-lg p-4 bg-[#1A1F2E]">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Website
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0F1117] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com"
                />
              ) : (
                brand.website ? (
                  <a 
                    href={brand.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 hover:underline"
                  >
                    {brand.website}
                  </a>
                ) : (
                  <p className="text-gray-500">No website provided</p>
                )
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="border border-gray-700 rounded-lg p-4 bg-[#0F1117]">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Brand Metadata</h3>
              <div className="space-y-1 text-sm text-gray-400">
                <p>Created: {formatDate(brand.created_at)}</p>
                <p>Last Updated: {formatDate(brand.updated_at)}</p>
                <p className="font-mono text-xs mt-2 text-gray-500">ID: {brand.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}