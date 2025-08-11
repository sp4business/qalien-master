'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, Download, Video, Image as ImageIcon, Tag, Plus, X, Upload } from 'lucide-react';
import { useSupabaseClient, supabase as supabaseAnon } from '@/lib/supabase';
import { isVideoFile } from '@/lib/video-utils';

interface GoldenSetCreative {
  id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  creative_type: 'UGC' | 'Produced';
  created_at: string;
  thumbnail_url?: string;
}

interface GoldenSetProps {
  brand: {
    id: string;
    brand_name: string;
  };
  onUpdate: () => void;
}

// Simplified Video Preview Component using native HTML5 video
function VideoPreview({ 
  src, 
  creativeId, 
  onThumbnailGenerated, 
  thumbnail 
}: { 
  src: string; 
  creativeId: string;
  onThumbnailGenerated: (thumbnail: string) => void;
  thumbnail?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Skip thumbnail generation entirely - just use the video element's native preview
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);

  return (
    <div className="w-full h-full relative bg-black group">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        controls={false}
        muted
        playsInline
        preload="auto"
        onCanPlay={(e) => {
          setIsVideoLoaded(true);
        }}
        onLoadedMetadata={(e) => {
          // Set to 1 second for better preview
          e.currentTarget.currentTime = 1;
        }}
        onMouseEnter={(e) => {
          if (isVideoLoaded) {
            setIsHovering(true);
            e.currentTarget.play().catch((err) => {
              console.error('Play error:', err);
            });
          }
        }}
        onMouseLeave={(e) => {
          setIsHovering(false);
          e.currentTarget.pause();
          e.currentTarget.currentTime = 1;
        }}
        onError={(e) => {
          const videoElement = e.currentTarget as HTMLVideoElement;
          console.error('Video failed to load:', videoElement.error?.message || 'Unknown error');
        }}
      />
      {!isVideoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="animate-pulse">
            <Video className="h-12 w-12 text-gray-500" />
          </div>
        </div>
      )}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isHovering ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
        <div className="bg-black bg-opacity-50 rounded-full p-3">
          <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function GoldenSet({ brand, onUpdate }: GoldenSetProps) {
  const supabase = useSupabaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [creatives, setCreatives] = useState<GoldenSetCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newFiles, setNewFiles] = useState<{ file: File; type: 'UGC' | 'Produced' }[]>([]);

  useEffect(() => {
    fetchGoldenSetCreatives();
  }, [brand.id]);

  const fetchGoldenSetCreatives = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('golden_set_creatives')
        .select('*')
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCreatives(data || []);
    } catch (error) {
      console.error('Error fetching golden set creatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCreativeTypeColor = (type: 'UGC' | 'Produced') => {
    return type === 'UGC' 
      ? 'bg-purple-100 text-purple-700 border-purple-200' 
      : 'bg-purple-600/20 text-purple-400 border-purple-500/30';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    if (validFiles.length !== files.length) {
      alert('Please select only image or video files');
    }
    
    const newFileEntries = validFiles.map(file => ({ 
      file, 
      type: 'Produced' as 'UGC' | 'Produced' 
    }));
    setNewFiles(prev => [...prev, ...newFileEntries]);
  };

  const handleUpload = async () => {
    if (newFiles.length === 0) return;
    
    try {
      setIsUploading(true);
      
      for (const { file, type } of newFiles) {
        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${brand.id}/golden-set/${timestamp}-${safeFileName}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAnon.storage
          .from('brand-assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL - use the exact same path
        const { data: { publicUrl } } = supabaseAnon.storage
          .from('brand-assets')
          .getPublicUrl(filePath);
        
        // Ensure we have the full URL
        const fullStorageUrl = publicUrl.startsWith('http') 
          ? publicUrl 
          : `https://oqpblqjtmmsnofyucaem.supabase.co/storage/v1/object/public/brand-assets/${publicUrl}`;

        // Create golden_set_creative record
        const { error: dbError } = await supabase
          .from('golden_set_creatives')
          .insert({
            brand_id: brand.id,
            storage_path: fullStorageUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            creative_type: type,
            status: 'pending'
          });

        if (dbError) throw dbError;
      }
      
      setIsAdding(false);
      setNewFiles([]);
      onUpdate();
      fetchGoldenSetCreatives(); // Refresh the list
    } catch (error) {
      console.error('Error uploading golden set creatives:', error);
      alert('Failed to upload creatives');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (creativeId: string) => {
    if (!confirm('Are you sure you want to remove this creative from the golden set?')) return;
    
    try {
      const { error } = await supabase
        .from('golden_set_creatives')
        .delete()
        .eq('id', creativeId);
        
      if (error) throw error;
      
      fetchGoldenSetCreatives();
    } catch (error) {
      console.error('Error deleting creative:', error);
      alert('Failed to delete creative');
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">Golden Set</h2>
          <p className="text-gray-400">Perfect example creatives for brand compliance reference</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Creatives
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : creatives.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creatives.map((creative) => (
            <div key={creative.id} className="border border-gray-700 rounded-lg overflow-hidden group">
              {/* Preview Area */}
              <div className="aspect-video bg-[#0F1117] relative">
                {creative.file_type?.startsWith('video/') ? (
                  <VideoPreview 
                    src={creative.storage_path.startsWith('http') ? creative.storage_path : `https://oqpblqjtmmsnofyucaem.supabase.co/storage/v1/object/public/brand-assets/${creative.storage_path}`}
                    creativeId={creative.id}
                    onThumbnailGenerated={() => {}}
                    thumbnail=""
                  />
                ) : (
                  <img 
                    src={creative.storage_path.startsWith('http') ? creative.storage_path : `https://oqpblqjtmmsnofyucaem.supabase.co/storage/v1/object/public/brand-assets/${creative.storage_path}`}
                    alt={creative.file_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback for images that fail to load
                      e.currentTarget.src = '';
                      e.currentTarget.className = 'hidden';
                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                    }}
                  />
                )}
                
                {/* Creative Type Badge */}
                <div className="absolute top-2 left-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getCreativeTypeColor(creative.creative_type)}`}>
                    <Tag className="h-3 w-3" />
                    {creative.creative_type}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={async () => {
                      try {
                        const fullUrl = creative.storage_path.startsWith('http') 
                          ? creative.storage_path 
                          : `https://oqpblqjtmmsnofyucaem.supabase.co/storage/v1/object/public/brand-assets/${creative.storage_path}`;
                        const response = await fetch(fullUrl);
                        if (!response.ok) throw new Error('Failed to fetch file');
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = creative.file_name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                      } catch (error) {
                        console.error('Error downloading file:', error);
                        alert('Unable to download the file. Please try again.');
                      }
                    }}
                    className="p-2 bg-[#1A1F2E] rounded-lg shadow-sm hover:bg-gray-800"
                  >
                    <Download className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(creative.id)}
                    className="p-2 bg-[#1A1F2E] rounded-lg shadow-sm hover:bg-red-50"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-4 bg-[#1A1F2E]">
                <h4 className="font-medium text-white truncate mb-1">{creative.file_name}</h4>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{formatFileSize(creative.file_size)}</span>
                  <span>{new Date(creative.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-12">
          <div className="text-center">
            <Star className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-white">No golden set creatives</h3>
            <p className="mt-2 text-sm text-gray-500">
              Perfect example creatives have not been uploaded yet
            </p>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Creatives
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Form */}
      {isAdding && (
        <div className="border border-gray-700 rounded-lg p-6 bg-gray-50">
          <h3 className="font-medium text-white mb-4">Add Golden Set Creatives</h3>
          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="golden-set-upload"
              />
              <label
                htmlFor="golden-set-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choose Files
              </label>
            </div>
            
            {newFiles.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Selected files:</p>
                {newFiles.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between border border-gray-700 rounded-lg p-3 bg-[#1A1F2E]">
                    <div className="flex items-center gap-3">
                      {isVideoFile(entry.file) ? (
                        <Video className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700">{entry.file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={entry.type}
                        onChange={(e) => {
                          const updatedFiles = [...newFiles];
                          updatedFiles[index].type = e.target.value as 'UGC' | 'Produced';
                          setNewFiles(updatedFiles);
                        }}
                        className="text-sm border border-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Produced">Produced</option>
                        <option value="UGC">UGC</option>
                      </select>
                      <button
                        onClick={() => setNewFiles(newFiles.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewFiles([]);
                }}
                className="px-4 py-2 border border-gray-700 text-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={newFiles.length === 0 || isUploading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">About Golden Set</h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>The Golden Set consists of perfect example creatives that showcase:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ideal brand representation and compliance</li>
                <li>Both UGC (User Generated Content) and Produced content</li>
                <li>Reference materials for content creators</li>
                <li>Examples of successful brand integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}