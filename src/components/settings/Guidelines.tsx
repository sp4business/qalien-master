'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Upload, ExternalLink, Edit2, X } from 'lucide-react';
import { useSupabaseClient, supabase as supabaseAnon } from '@/lib/supabase';

interface GuidelinesProps {
  brand: {
    id: string;
    brand_name: string;
    guidelines_pdf_url?: string;
  };
  onUpdate: () => void;
}

export default function Guidelines({ brand, onUpdate }: GuidelinesProps) {
  const supabase = useSupabaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; url: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);

  useEffect(() => {
    if (brand.guidelines_pdf_url) {
      // Extract filename from URL
      const urlParts = brand.guidelines_pdf_url.split('/');
      const fileName = urlParts[urlParts.length - 1] || 'Brand Guidelines.pdf';
      
      setFileInfo({
        name: decodeURIComponent(fileName),
        size: 0, // Size info not available without additional API call
        url: brand.guidelines_pdf_url
      });
    }
  }, [brand.guidelines_pdf_url]);

  const handleDownload = async () => {
    if (!brand.guidelines_pdf_url) return;
    
    try {
      // Try direct download first (works if CORS allows)
      const response = await fetch(brand.guidelines_pdf_url);
      
      if (response.ok) {
        const blob = await response.blob();
        
        // Use the more reliable approach
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          // For IE/Edge
          window.navigator.msSaveOrOpenBlob(blob, fileInfo?.name || 'brand-guidelines.pdf');
        } else {
          // For other browsers
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileInfo?.name || 'brand-guidelines.pdf';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Revoke after a delay to ensure download starts
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        }
      } else {
        throw new Error('Failed to fetch file');
      }
    } catch (error) {
      console.error('Download error:', error);
      // If CORS blocks the download, provide alternative
      if (confirm('Direct download failed due to browser restrictions. Would you like to open the file in a new tab where you can save it manually?')) {
        window.open(brand.guidelines_pdf_url, '_blank');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setNewFile(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!newFile) return;
    
    try {
      setIsUploading(true);
      
      // Generate unique file path
      const fileExt = newFile.name.split('.').pop();
      const fileName = `${brand.id}/guidelines/brand-guidelines-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage using anonymous client
      const { data: uploadData, error: uploadError } = await supabaseAnon.storage
        .from('brand-assets')
        .upload(fileName, newFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabaseAnon.storage
        .from('brand-assets')
        .getPublicUrl(fileName);

      // Update brand record with new guidelines URL
      const { error: updateError } = await supabase
        .from('brands')
        .update({
          guidelines_pdf_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (updateError) throw updateError;
      
      setIsEditing(false);
      setNewFile(null);
      onUpdate();
    } catch (error) {
      console.error('Error uploading guidelines:', error);
      alert('Failed to upload guidelines');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Brand Guidelines</h2>
          <p className="text-gray-600">Your brand guidelines documentation</p>
        </div>
        {!isEditing && brand.guidelines_pdf_url && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Replace
          </button>
        )}
      </div>

      {brand.guidelines_pdf_url && fileInfo ? (
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">{fileInfo.name}</h3>
              <p className="text-sm text-gray-500 mb-4">
                PDF Document • {formatFileSize(fileInfo.size)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => window.open(brand.guidelines_pdf_url, '_blank')}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No guidelines uploaded</h3>
            <p className="mt-2 text-sm text-gray-500">
              Brand guidelines have not been uploaded yet
            </p>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Guidelines
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Form */}
      {isEditing && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-4">Upload New Guidelines</h3>
          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="guidelines-upload"
              />
              <label
                htmlFor="guidelines-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choose PDF File
              </label>
              {newFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {newFile.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4 inline mr-2" />
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!newFile || isUploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Brand Guidelines</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Brand guidelines help ensure consistent brand representation across all materials. They typically include:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Logo usage rules</li>
                <li>Color specifications</li>
                <li>Typography guidelines</li>
                <li>Tone of voice</li>
                <li>Do's and don'ts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}