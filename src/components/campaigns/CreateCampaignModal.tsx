'use client';

import { useState } from 'react';
import QAlienModal from '@/components/QAlienModal';
import DatePicker from '@/components/ui/DatePicker';
import { useSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@clerk/nextjs';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  onSuccess?: () => void;
}

interface CampaignFormData {
  name: string;
  campaign_type: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: string;
  currency: string;
  country: string;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
];

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 
  'France', 'Japan', 'China', 'India', 'Brazil', 'Mexico', 'Spain', 
  'Italy', 'Netherlands', 'Switzerland', 'Sweden', 'South Korea', 
  'Singapore', 'Hong Kong', 'New Zealand'
].sort();

export default function CreateCampaignModal({ 
  isOpen, 
  onClose, 
  brandId,
  onSuccess 
}: CreateCampaignModalProps) {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    campaign_type: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: '',
    currency: 'USD',
    country: 'United States'
  });

  const [errors, setErrors] = useState<Partial<CampaignFormData>>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof CampaignFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when date is selected
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CampaignFormData> = {};
    
    // Validate required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }
    
    if (!formData.budget.trim()) {
      newErrors.budget = 'Budget is required';
    } else if (isNaN(Number(formData.budget)) || Number(formData.budget) < 0) {
      newErrors.budget = 'Budget must be a positive number';
    }
    
    // Validate date logic
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get the Clerk token for Supabase
      const token = await getToken({ template: 'supabase' });
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Call the edge function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          brandId,
          campaignData: {
            name: formData.name.trim(),
            campaign_type: formData.campaign_type || null,
            description: formData.description || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            budget: formData.budget ? Number(formData.budget) : null,
            currency: formData.currency,
            country: formData.country,
          }
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create campaign');
      }
      
      toast({
        title: 'Campaign created successfully',
        description: `${formData.name} has been created.`,
        variant: 'success'
      });
      
      // Reset form
      setFormData({
        name: '',
        campaign_type: '',
        description: '',
        start_date: '',
        end_date: '',
        budget: '',
        currency: 'USD',
        country: 'United States'
      });
      
      // Call success callback
      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error creating campaign',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCurrency = CURRENCIES.find(c => c.code === formData.currency);

  return (
    <QAlienModal isOpen={isOpen} onClose={onClose} title="Create New Campaign" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Basic Information</h3>
          
          {/* Campaign Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 bg-[#2A3142] border ${
                errors.name ? 'border-red-500' : 'border-gray-600'
              } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="Enter campaign name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>
          
          {/* Campaign Type */}
          <div>
            <label htmlFor="campaign_type" className="block text-sm font-medium text-gray-300 mb-1">
              Campaign Type
            </label>
            <input
              type="text"
              id="campaign_type"
              name="campaign_type"
              value={formData.campaign_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-[#2A3142] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Social Media, Email, Display"
            />
          </div>
          
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 bg-[#2A3142] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Brief description of the campaign"
            />
          </div>
        </div>
        
        {/* Timeline Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Timeline</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-300 mb-1">
                Start Date
              </label>
              <DatePicker
                value={formData.start_date}
                onChange={(date) => handleDateChange('start_date', date)}
                placeholder="Select start date"
              />
            </div>
            
            {/* End Date */}
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-300 mb-1">
                End Date
              </label>
              <DatePicker
                value={formData.end_date}
                onChange={(date) => handleDateChange('end_date', date)}
                placeholder="Select end date"
                error={!!errors.end_date}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Budget & Location Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Budget & Location</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-300 mb-1">
                Campaign Budget <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  {selectedCurrency?.symbol}
                </span>
                <input
                  type="number"
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full pl-8 pr-3 py-2 bg-[#2A3142] border ${
                    errors.budget ? 'border-red-500' : 'border-gray-600'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="0.00"
                />
              </div>
              {errors.budget && (
                <p className="mt-1 text-sm text-red-500">{errors.budget}</p>
              )}
            </div>
            
            {/* Currency */}
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-300 mb-1">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-[#2A3142] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-1">
              Country
            </label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-[#2A3142] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {COUNTRIES.map(country => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1A1F2E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1A1F2E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              'Create Campaign'
            )}
          </button>
        </div>
      </form>
    </QAlienModal>
  );
}