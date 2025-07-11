'use client';

import { useState } from 'react';
import { MessageSquare, CheckCircle, XCircle, AlertCircle, Volume2, Edit2, Save, X, Plus } from 'lucide-react';
import { useSupabaseClient } from '@/lib/supabase';

interface VerbalIdentityProps {
  brand: {
    id: string;
    brand_name: string;
    tone_keywords?: string[];
    required_disclaimers?: string[];
    approved_terms?: string[];
    banned_terms?: string[];
  };
  onUpdate: () => void;
}

export default function VerbalIdentity({ brand, onUpdate }: VerbalIdentityProps) {
  const supabase = useSupabaseClient();
  const [isEditingTone, setIsEditingTone] = useState(false);
  const [isEditingVocabulary, setIsEditingVocabulary] = useState(false);
  const [isEditingDisclaimers, setIsEditingDisclaimers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [toneKeywords, setToneKeywords] = useState(brand.tone_keywords || []);
  const [approvedTerms, setApprovedTerms] = useState(brand.approved_terms || []);
  const [bannedTerms, setBannedTerms] = useState(brand.banned_terms || []);
  const [disclaimers, setDisclaimers] = useState(brand.required_disclaimers || []);
  
  const [newToneKeyword, setNewToneKeyword] = useState('');
  const [newApprovedTerm, setNewApprovedTerm] = useState('');
  const [newBannedTerm, setNewBannedTerm] = useState('');
  const [newDisclaimer, setNewDisclaimer] = useState('');

  const handleToneSave = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('brands')
        .update({
          tone_keywords: toneKeywords,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (error) throw error;
      
      setIsEditingTone(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating tone:', error);
      alert('Failed to update brand tone');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVocabularySave = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('brands')
        .update({
          approved_terms: approvedTerms,
          banned_terms: bannedTerms,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (error) throw error;
      
      setIsEditingVocabulary(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating vocabulary:', error);
      alert('Failed to update brand vocabulary');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisclaimersSave = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('brands')
        .update({
          required_disclaimers: disclaimers,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (error) throw error;
      
      setIsEditingDisclaimers(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating disclaimers:', error);
      alert('Failed to update disclaimers');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Verbal Identity</h2>
        <p className="text-gray-600">Brand voice, tone, and language guidelines</p>
      </div>

      {/* Brand Tone */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-gray-400" />
            Brand Tone
          </h3>
          {!isEditingTone && (
            <button
              onClick={() => setIsEditingTone(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
        {isEditingTone ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {toneKeywords.map((keyword, index) => (
                <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                  {keyword}
                  <button
                    onClick={() => setToneKeywords(toneKeywords.filter((_, i) => i !== index))}
                    className="hover:text-purple-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newToneKeyword}
                onChange={(e) => setNewToneKeyword(e.target.value)}
                placeholder="Add tone keyword"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newToneKeyword.trim()) {
                    setToneKeywords([...toneKeywords, newToneKeyword.trim()]);
                    setNewToneKeyword('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newToneKeyword.trim()) {
                    setToneKeywords([...toneKeywords, newToneKeyword.trim()]);
                    setNewToneKeyword('');
                  }
                }}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditingTone(false);
                  setToneKeywords(brand.tone_keywords || []);
                  setNewToneKeyword('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleToneSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 inline mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            {toneKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {toneKeywords.map((keyword, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No brand tone defined</p>
            )}
          </div>
        )}
      </div>

      {/* Brand Vocabulary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            Brand Vocabulary
          </h3>
          {!isEditingVocabulary && (
            <button
              onClick={() => setIsEditingVocabulary(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
        
        {isEditingVocabulary ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Approved Terms Edit */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h4 className="font-medium text-gray-900">Approved Terms</h4>
                </div>
                <div className="space-y-2 mb-3">
                  {approvedTerms.map((word, index) => (
                    <div key={index} className="flex items-center justify-between px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-sm">
                      <span>{word}</span>
                      <button
                        onClick={() => setApprovedTerms(approvedTerms.filter((_, i) => i !== index))}
                        className="hover:text-green-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newApprovedTerm}
                    onChange={(e) => setNewApprovedTerm(e.target.value)}
                    placeholder="Add approved term"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newApprovedTerm.trim()) {
                        setApprovedTerms([...approvedTerms, newApprovedTerm.trim()]);
                        setNewApprovedTerm('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newApprovedTerm.trim()) {
                        setApprovedTerms([...approvedTerms, newApprovedTerm.trim()]);
                        setNewApprovedTerm('');
                      }
                    }}
                    className="p-1 bg-green-600 hover:bg-green-700 text-white rounded"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Banned Terms Edit */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <h4 className="font-medium text-gray-900">Banned Terms</h4>
                </div>
                <div className="space-y-2 mb-3">
                  {bannedTerms.map((word, index) => (
                    <div key={index} className="flex items-center justify-between px-3 py-1.5 bg-red-50 text-red-700 rounded-md text-sm">
                      <span>{word}</span>
                      <button
                        onClick={() => setBannedTerms(bannedTerms.filter((_, i) => i !== index))}
                        className="hover:text-red-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBannedTerm}
                    onChange={(e) => setNewBannedTerm(e.target.value)}
                    placeholder="Add banned term"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newBannedTerm.trim()) {
                        setBannedTerms([...bannedTerms, newBannedTerm.trim()]);
                        setNewBannedTerm('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newBannedTerm.trim()) {
                        setBannedTerms([...bannedTerms, newBannedTerm.trim()]);
                        setNewBannedTerm('');
                      }
                    }}
                    className="p-1 bg-red-600 hover:bg-red-700 text-white rounded"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditingVocabulary(false);
                  setApprovedTerms(brand.approved_terms || []);
                  setBannedTerms(brand.banned_terms || []);
                  setNewApprovedTerm('');
                  setNewBannedTerm('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVocabularySave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 inline mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Approved Words */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h4 className="font-medium text-gray-900">Approved Terms</h4>
              </div>
              {approvedTerms.length > 0 ? (
                <div className="space-y-2">
                  {approvedTerms.map((word, index) => (
                    <div key={index} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-sm">
                      {word}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No approved terms defined</p>
              )}
            </div>

            {/* Banned Words */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <h4 className="font-medium text-gray-900">Banned Terms</h4>
              </div>
              {bannedTerms.length > 0 ? (
                <div className="space-y-2">
                  {bannedTerms.map((word, index) => (
                    <div key={index} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-md text-sm">
                      {word}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No banned terms defined</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-gray-400" />
            Required Disclaimers
          </h3>
          {!isEditingDisclaimers && (
            <button
              onClick={() => setIsEditingDisclaimers(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
        
        {isEditingDisclaimers ? (
          <div className="space-y-3">
            {disclaimers.map((disclaimer, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-amber-50">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-700 flex-1">{disclaimer}</p>
                  <button
                    onClick={() => setDisclaimers(disclaimers.filter((_, i) => i !== index))}
                    className="text-red-600 hover:text-red-700 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-2">
              <textarea
                value={newDisclaimer}
                onChange={(e) => setNewDisclaimer(e.target.value)}
                placeholder="Add disclaimer text"
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  if (newDisclaimer.trim()) {
                    setDisclaimers([...disclaimers, newDisclaimer.trim()]);
                    setNewDisclaimer('');
                  }
                }}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditingDisclaimers(false);
                  setDisclaimers(brand.required_disclaimers || []);
                  setNewDisclaimer('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisclaimersSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 inline mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          disclaimers.length > 0 ? (
            <div className="space-y-3">
              {disclaimers.map((disclaimer, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-amber-50">
                  <p className="text-sm text-gray-700">{disclaimer}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No disclaimers required</p>
            </div>
          )
        )}
      </div>

      {/* Verbal Guidelines Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-indigo-800">Verbal Identity Best Practices</h3>
            <div className="mt-2 text-sm text-indigo-700">
              <p>Strong verbal identity guidelines include:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Clear tone of voice (professional, friendly, etc.)</li>
                <li>Key messaging pillars</li>
                <li>Writing style preferences</li>
                <li>Grammar and punctuation rules</li>
                <li>Industry-specific terminology</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}