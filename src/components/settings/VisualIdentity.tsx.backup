'use client';

import { useState, useEffect, useRef } from 'react';
import { Palette, Image as ImageIcon, Download, Edit2, Plus, X, Save, Upload } from 'lucide-react';
import { useSupabaseClient, supabase as supabaseAnon } from '@/lib/supabase';

interface VisualIdentityProps {
  brand: {
    id: string;
    brand_name: string;
    logo_files?: string[];
    color_palette?: string[];
  };
  onUpdate: () => void;
}

export default function VisualIdentity({ brand, onUpdate }: VisualIdentityProps) {
  const supabase = useSupabaseClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logos, setLogos] = useState<{ url: string; name: string }[]>([]);
  const [isEditingLogos, setIsEditingLogos] = useState(false);
  const [isEditingColors, setIsEditingColors] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newLogos, setNewLogos] = useState<File[]>([]);
  const [colorPalette, setColorPalette] = useState<string[]>(brand.color_palette || []);
  const [logosToDelete, setLogosToDelete] = useState<string[]>([]);

  useEffect(() => {
    if (brand.logo_files && brand.logo_files.length > 0) {
      const logoData = brand.logo_files.map((url, index) => {
        const fileName = decodeURIComponent(url.split('/').pop() || `Logo ${index + 1}`);
        return {
          url,
          name: fileName
        };
      });
      setLogos(logoData);
    }
  }, [brand.logo_files]);

  useEffect(() => {
    setColorPalette(brand.color_palette || []);
  }, [brand.color_palette]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      alert('Please select only image files');
    }
    setNewLogos(prev => [...prev, ...imageFiles]);
  };

  const handleLogoSave = async () => {
    try {
      setIsUploading(true);
      const uploadedUrls: string[] = [];
      
      // Upload new logos
      for (const file of newLogos) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${brand.id}/logos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const { data, error } = await supabaseAnon.storage
          .from('brand-assets')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabaseAnon.storage
          .from('brand-assets')
          .getPublicUrl(fileName);
          
        uploadedUrls.push(publicUrl);
      }

      // Filter out logos marked for deletion
      const remainingLogos = (brand.logo_files || []).filter(url => !logosToDelete.includes(url));
      const allLogoUrls = [...remainingLogos, ...uploadedUrls];
      
      // Update brand record
      const { error: updateError } = await supabase
        .from('brands')
        .update({
          logo_files: allLogoUrls,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (updateError) throw updateError;
      
      setIsEditingLogos(false);
      setNewLogos([]);
      setLogosToDelete([]);
      onUpdate();
    } catch (error) {
      console.error('Error updating logos:', error);
      alert('Failed to update logos');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleLogoForDeletion = (url: string) => {
    if (logosToDelete.includes(url)) {
      setLogosToDelete(logosToDelete.filter(u => u !== url));
    } else {
      setLogosToDelete([...logosToDelete, url]);
    }
  };

  const handleColorSave = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('brands')
        .update({
          color_palette: colorPalette,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (error) throw error;
      
      setIsEditingColors(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating colors:', error);
      alert('Failed to update color palette');
    } finally {
      setIsSaving(false);
    }
  };

  const addColor = () => {
    setColorPalette([...colorPalette, '#000000']);
  };

  const updateColor = (index: number, color: string) => {
    const newPalette = [...colorPalette];
    newPalette[index] = color;
    setColorPalette(newPalette);
  };

  const removeColor = (index: number) => {
    setColorPalette(colorPalette.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Visual Identity</h2>
        <p className="text-gray-600">Logos and color palette that define your brand</p>
      </div>

      {/* Logos Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gray-400" />
            Brand Logos
          </h3>
          {!isEditingLogos && (
            <button
              onClick={() => setIsEditingLogos(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
            >
              <Edit2 className="h-4 w-4" />
              Edit Logos
            </button>
          )}
        </div>
        
        {logos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {logos.map((logo, index) => (
              <div key={index} className={`border rounded-lg overflow-hidden group relative ${
                isEditingLogos && logosToDelete.includes(logo.url) 
                  ? 'border-red-500 ring-2 ring-red-200' 
                  : 'border-gray-200'
              }`}>
                <div className="aspect-square bg-gray-50 p-4 flex items-center justify-center">
                  <img 
                    src={logo.url} 
                    alt={logo.name}
                    className={`max-w-full max-h-full object-contain ${
                      isEditingLogos && logosToDelete.includes(logo.url) ? 'opacity-50' : ''
                    }`}
                  />
                </div>
                <div className="p-3 bg-white border-t border-gray-200">
                  <p className="text-sm text-gray-700 truncate">{logo.name}</p>
                </div>
                {!isEditingLogos ? (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(logo.url);
                        if (!response.ok) throw new Error('Failed to fetch file');
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = logo.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                      } catch (error) {
                        console.error('Error downloading file:', error);
                        alert('Unable to download the file. Please try again.');
                      }
                    }}
                    className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                ) : (
                  <button
                    onClick={() => toggleLogoForDeletion(logo.url)}
                    className={`absolute top-2 right-2 p-2 rounded-lg shadow-sm transition-all ${
                      logosToDelete.includes(logo.url)
                        ? 'bg-red-500 text-white'
                        : 'bg-white hover:bg-red-50 text-red-600'
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No logos uploaded</p>
            {!isEditingLogos && (
              <button
                onClick={() => setIsEditingLogos(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Logos
              </button>
            )}
          </div>
        )}
        
        {/* Logo Upload Form */}
        {isEditingLogos && (
          <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
            {logosToDelete.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  {logosToDelete.length} logo{logosToDelete.length > 1 ? 's' : ''} marked for deletion
                </p>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleLogoSelect}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Choose Logo Files
            </label>
            {newLogos.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Selected files:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {newLogos.map((file, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <span>{file.name}</span>
                      <button
                        onClick={() => setNewLogos(newLogos.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => {
                  setIsEditingLogos(false);
                  setNewLogos([]);
                  setLogosToDelete([]);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoSave}
                disabled={(newLogos.length === 0 && logosToDelete.length === 0) || isUploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Color Palette Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Palette className="h-5 w-5 text-gray-400" />
            Color Palette
          </h3>
          {!isEditingColors && colorPalette.length > 0 && (
            <button
              onClick={() => setIsEditingColors(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
        
        {isEditingColors ? (
          <div className="space-y-4">
            {colorPalette.length === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  No colors defined. Add colors to create your brand palette.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {colorPalette.map((color, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-3 bg-white">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateColor(index, e.target.value)}
                      className="w-full h-20 cursor-pointer"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => updateColor(index, e.target.value)}
                        className="font-mono text-sm px-2 py-1 border border-gray-200 rounded"
                      />
                      <button
                        onClick={() => removeColor(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addColor}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors flex flex-col items-center justify-center h-full min-h-[140px]"
              >
                <Plus className="h-8 w-8 text-gray-400" />
                <span className="mt-2 text-sm text-gray-500">Add Color</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditingColors(false);
                  setColorPalette(brand.color_palette || []);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleColorSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 inline mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : colorPalette.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {colorPalette.map((color, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <div 
                  className="h-24" 
                  style={{ backgroundColor: color }}
                />
                <div className="p-3 bg-white">
                  <p className="font-mono text-sm text-gray-700 text-center">{color.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Palette className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No colors defined</p>
            {!isEditingColors && (
              <button
                onClick={() => setIsEditingColors(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Palette className="h-4 w-4" />
                Add Colors
              </button>
            )}
          </div>
        )}
      </div>

      {/* Visual Guidelines Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">Visual Identity Guidelines</h3>
            <div className="mt-2 text-sm text-purple-700">
              <p>Consistent visual identity includes:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Primary and secondary logos</li>
                <li>Logo variations (full color, black, white)</li>
                <li>Primary and accent colors with hex codes</li>
                <li>Clear space and minimum size requirements</li>
                <li>Incorrect usage examples</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}