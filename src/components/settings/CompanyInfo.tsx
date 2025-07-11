'use client';

import { useState } from 'react';
import { Building2, Globe, FileText, Calendar, Edit2, Save, X } from 'lucide-react';
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
    website: brand.website
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Company Information</h2>
          <p className="text-gray-600">Basic information about your brand</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Brand Name */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{brandName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Industry */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900">{brand.industry}</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">
                  {brand.description || 'No description provided'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Website */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              ) : (
                brand.website ? (
                  <a 
                    href={brand.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
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
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Brand Metadata</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Created: {formatDate(brand.created_at)}</p>
                <p>Last Updated: {formatDate(brand.updated_at)}</p>
                <p className="font-mono text-xs mt-2">ID: {brand.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}