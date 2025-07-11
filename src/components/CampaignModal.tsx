'use client';

import { useState } from 'react';
import { fetchAuthSession } from '../lib/auth-stubs';
import Modal from './Modal';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  brandName: string;
  onSuccess?: () => void;
}

interface InfluencerData {
  name: string;
  platform: string;
  follower_count: string;
  engagement_rate: string;
}

export default function CampaignModal({ isOpen, onClose, brandId, brandName, onSuccess }: CampaignModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form fields
  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState('Product Launch');
  const [strategy, setStrategy] = useState('Hybrid');
  const [status, setStatus] = useState('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Budget and financials
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('USD');
  const [revenueTarget, setRevenueTarget] = useState('');
  const [revenueTargetCurrency, setRevenueTargetCurrency] = useState('USD');
  
  // Geographic targeting
  const [targetMarkets, setTargetMarkets] = useState<string[]>([]);
  const [newMarket, setNewMarket] = useState('');
  
  // Demographics
  const [targetAgeMin, setTargetAgeMin] = useState('');
  const [targetAgeMax, setTargetAgeMax] = useState('');
  const [targetGender, setTargetGender] = useState('All');
  const [targetInterests, setTargetInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  
  // Distribution
  const [distributionChannels, setDistributionChannels] = useState<string[]>([]);
  const [primaryPlatform, setPrimaryPlatform] = useState('');
  
  // Influencers
  const [influencers, setInfluencers] = useState<InfluencerData[]>([]);
  const [newInfluencer, setNewInfluencer] = useState<InfluencerData>({
    name: '',
    platform: '',
    follower_count: '',
    engagement_rate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const payload = {
        campaign_name: campaignName,
        description,
        campaign_type: campaignType,
        strategy,
        status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        budget_amount: budgetAmount ? parseFloat(budgetAmount) : 0,
        budget_currency: budgetCurrency,
        revenue_target: revenueTarget ? parseFloat(revenueTarget) : 0,
        revenue_target_currency: revenueTargetCurrency,
        target_markets: targetMarkets,
        target_age_min: targetAgeMin ? parseInt(targetAgeMin) : undefined,
        target_age_max: targetAgeMax ? parseInt(targetAgeMax) : undefined,
        target_gender: targetGender,
        target_interests: targetInterests,
        distribution_channels: distributionChannels,
        primary_platform: primaryPlatform || undefined,
        influencers: influencers
      };

      const response = await fetch(`https://6wfvvuvm25.execute-api.us-east-1.amazonaws.com/dev/brands/${brandId}/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create campaign: ${response.status}`);
      }

      const data = await response.json();
      console.log('Campaign created:', data);
      
      // Reset form
      resetForm();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating campaign:', error);
      setError(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCampaignName('');
    setDescription('');
    setCampaignType('Product Launch');
    setStrategy('Hybrid');
    setStatus('draft');
    setStartDate('');
    setEndDate('');
    setBudgetAmount('');
    setBudgetCurrency('USD');
    setRevenueTarget('');
    setRevenueTargetCurrency('USD');
    setTargetMarkets([]);
    setNewMarket('');
    setTargetAgeMin('');
    setTargetAgeMax('');
    setTargetGender('All');
    setTargetInterests([]);
    setNewInterest('');
    setDistributionChannels([]);
    setPrimaryPlatform('');
    setInfluencers([]);
    setNewInfluencer({
      name: '',
      platform: '',
      follower_count: '',
      engagement_rate: ''
    });
  };

  const addMarket = () => {
    if (newMarket.trim() && !targetMarkets.includes(newMarket.trim())) {
      setTargetMarkets([...targetMarkets, newMarket.trim()]);
      setNewMarket('');
    }
  };

  const removeMarket = (market: string) => {
    setTargetMarkets(targetMarkets.filter(m => m !== market));
  };

  const addInterest = () => {
    if (newInterest.trim() && !targetInterests.includes(newInterest.trim())) {
      setTargetInterests([...targetInterests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setTargetInterests(targetInterests.filter(i => i !== interest));
  };

  const toggleChannel = (channel: string) => {
    if (distributionChannels.includes(channel)) {
      setDistributionChannels(distributionChannels.filter(c => c !== channel));
    } else {
      setDistributionChannels([...distributionChannels, channel]);
    }
  };

  const addInfluencer = () => {
    if (newInfluencer.name.trim()) {
      setInfluencers([...influencers, { ...newInfluencer }]);
      setNewInfluencer({
        name: '',
        platform: '',
        follower_count: '',
        engagement_rate: ''
      });
    }
  };

  const removeInfluencer = (index: number) => {
    setInfluencers(influencers.filter((_, i) => i !== index));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create Campaign for ${brandName}`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-rose-700">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Summer 2025 Launch"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Campaign Type
              </label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="Product Launch">Product Launch</option>
                <option value="Brand Awareness">Brand Awareness</option>
                <option value="Seasonal">Seasonal</option>
                <option value="Partnership">Partnership</option>
                <option value="Influencer">Influencer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Campaign objectives and key messages..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Strategy
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="Organic">Organic</option>
                <option value="Paid">Paid</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Budget & Revenue */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Budget & Revenue Targets</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Campaign Budget
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="10000"
                />
                <select
                  value={budgetCurrency}
                  onChange={(e) => setBudgetCurrency(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CNY">CNY</option>
                  <option value="INR">INR</option>
                  <option value="BRL">BRL</option>
                  <option value="MXN">MXN</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Revenue Target
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={revenueTarget}
                  onChange={(e) => setRevenueTarget(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="50000"
                />
                <select
                  value={revenueTargetCurrency}
                  onChange={(e) => setRevenueTargetCurrency(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CNY">CNY</option>
                  <option value="INR">INR</option>
                  <option value="BRL">BRL</option>
                  <option value="MXN">MXN</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Geographic Targeting */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Geographic Targeting</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Target Markets
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newMarket}
                onChange={(e) => setNewMarket(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMarket())}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="e.g., United States, Japan, Brazil"
              />
              <button
                type="button"
                onClick={addMarket}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {targetMarkets.map((market) => (
                <span
                  key={market}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm"
                >
                  {market}
                  <button
                    type="button"
                    onClick={() => removeMarket(market)}
                    className="hover:text-violet-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Demographics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Age Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={targetAgeMin}
                  onChange={(e) => setTargetAgeMin(e.target.value)}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="18"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={targetAgeMax}
                  onChange={(e) => setTargetAgeMax(e.target.value)}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="65"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Target Gender
              </label>
              <select
                value={targetGender}
                onChange={(e) => setTargetGender(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="All">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Target Interests
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="e.g., Technology, Fashion, Sports"
              />
              <button
                type="button"
                onClick={addInterest}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {targetInterests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="hover:text-violet-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Distribution Channels */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Distribution Channels</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter/X', 'LinkedIn', 'Pinterest', 'Snapchat'].map((channel) => (
              <label key={channel} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={distributionChannels.includes(channel)}
                  onChange={() => toggleChannel(channel)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-700">{channel}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Primary Platform
            </label>
            <select
              value={primaryPlatform}
              onChange={(e) => setPrimaryPlatform(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Select primary platform</option>
              {distributionChannels.map((channel) => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Influencers */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Influencers</h3>
          
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={newInfluencer.name}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, name: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Influencer name"
              />
              <select
                value={newInfluencer.platform}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, platform: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Platform</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="Twitter/X">Twitter/X</option>
              </select>
              <input
                type="text"
                value={newInfluencer.follower_count}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, follower_count: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Followers (e.g., 100K)"
              />
              <input
                type="text"
                value={newInfluencer.engagement_rate}
                onChange={(e) => setNewInfluencer({ ...newInfluencer, engagement_rate: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Engagement (e.g., 4.5%)"
              />
            </div>
            <button
              type="button"
              onClick={addInfluencer}
              className="w-full px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
            >
              Add Influencer
            </button>
          </div>

          {influencers.length > 0 && (
            <div className="space-y-2">
              {influencers.map((influencer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <span className="font-medium text-slate-900">{influencer.name}</span>
                    <span className="text-sm text-slate-600">{influencer.platform}</span>
                    <span className="text-sm text-slate-600">{influencer.follower_count} followers</span>
                    <span className="text-sm text-slate-600">{influencer.engagement_rate} engagement</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInfluencer(index)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !campaignName}
            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </Modal>
  );
}