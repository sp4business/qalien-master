'use client';

import { useState } from 'react';

interface ExtractedColor {
  hex: string;
  frequency: number;
  extracted: boolean;
  name?: string;
  usage?: string;
}

interface ColorPaletteExtractorProps {
  extractedColors?: ExtractedColor[];
  currentPalette?: string[];
  onPaletteUpdate?: (colors: string[]) => void;
  onUseExtractedColors?: () => void;
  showFrequency?: boolean;
  maxColors?: number;
  title?: string;
}

export default function ColorPaletteExtractor({
  extractedColors = [],
  currentPalette = [],
  onPaletteUpdate,
  onUseExtractedColors,
  showFrequency = true,
  maxColors = 8,
  title = "Brand Color Palette"
}: ColorPaletteExtractorProps) {
  const [selectedExtractedColors, setSelectedExtractedColors] = useState<Set<string>>(new Set());

  const handleExtractedColorToggle = (hex: string) => {
    const newSelected = new Set(selectedExtractedColors);
    if (newSelected.has(hex)) {
      newSelected.delete(hex);
    } else {
      newSelected.add(hex);
    }
    setSelectedExtractedColors(newSelected);
  };

  const handleAddSelectedColors = () => {
    const colorsToAdd = Array.from(selectedExtractedColors);
    const newPalette = [...currentPalette, ...colorsToAdd].slice(0, maxColors);
    onPaletteUpdate?.(newPalette);
    setSelectedExtractedColors(new Set());
  };

  const handleUseAllExtracted = () => {
    const allExtractedHex = extractedColors.map(color => color.hex).slice(0, maxColors);
    onPaletteUpdate?.(allExtractedHex);
    onUseExtractedColors?.();
  };

  const addNewColor = () => {
    if (currentPalette.length < maxColors) {
      const newPalette = [...currentPalette, '#000000'];
      onPaletteUpdate?.(newPalette);
    }
  };

  const updateColor = (index: number, hex: string) => {
    const newPalette = [...currentPalette];
    newPalette[index] = hex;
    onPaletteUpdate?.(newPalette);
  };

  const removeColor = (index: number) => {
    const newPalette = currentPalette.filter((_, i) => i !== index);
    onPaletteUpdate?.(newPalette);
  };

  const getContrastColor = (hex: string) => {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="px-3 py-1 bg-pink-500/20 text-pink-300 text-sm rounded-full">
            {currentPalette.length}/{maxColors}
          </div>
        </div>
      </div>

      {/* Extracted Colors Section */}
      {extractedColors.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-white mb-1">AI-Extracted Colors</h4>
              <p className="text-sm text-blue-300">Select colors to add to your brand palette</p>
            </div>
            {selectedExtractedColors.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-300">{selectedExtractedColors.size} selected</span>
                <button
                  onClick={handleAddSelectedColors}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Add Selected
                </button>
              </div>
            )}
          </div>

          {/* Color Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            {extractedColors.map((color, index) => {
              const isSelected = selectedExtractedColors.has(color.hex);
              const isAlreadyInPalette = currentPalette.includes(color.hex);
              
              return (
                <div
                  key={index}
                  className={`relative cursor-pointer transition-all ${
                    isSelected ? 'scale-105 shadow-lg' : ''
                  } ${isAlreadyInPalette ? 'opacity-50' : ''}`}
                  onClick={() => !isAlreadyInPalette && handleExtractedColorToggle(color.hex)}
                >
                  <div 
                    className={`w-full aspect-square rounded-xl border-4 transition-all ${
                      isSelected 
                        ? 'border-blue-400' 
                        : isAlreadyInPalette 
                        ? 'border-gray-600' 
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    {/* Color info overlay */}
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex flex-col justify-between p-2 opacity-0 hover:opacity-100 transition-opacity">
                      <div className="text-white text-xs font-mono">{color.hex}</div>
                      {showFrequency && (
                        <div className="text-white text-xs">
                          {Math.round(color.frequency * 100)}%
                        </div>
                      )}
                    </div>
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Already in palette indicator */}
                    {isAlreadyInPalette && (
                      <div className="absolute inset-0 bg-gray-900/50 rounded-lg flex items-center justify-center">
                        <div className="text-gray-300 text-xs font-medium">Added</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-center">
                    <div className="text-xs font-mono text-gray-300">{color.hex}</div>
                    {showFrequency && (
                      <div className="text-xs text-gray-500">{Math.round(color.frequency * 100)}% usage</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-blue-500/20">
            <div className="text-sm text-blue-400/80">
              Colors sorted by frequency of use in your brand guidelines
            </div>
            <button
              onClick={handleUseAllExtracted}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Use All Colors
            </button>
          </div>
        </div>
      )}

      {/* Current Palette Editor */}
      <div className="bg-gradient-to-br from-[#1A1F2E] to-[#252B3B] rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Current Brand Palette</h4>
        
        {currentPalette.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">No colors in palette</p>
            <p className="text-gray-500 text-sm mt-1">
              Add colors from the extracted colors above or create new ones
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentPalette.map((color, index) => (
              <div key={index} className="bg-[#2A3142] rounded-xl p-4 border border-gray-700 shadow-lg">
                <div className="flex items-center space-x-3">
                  {/* Color picker */}
                  <div className="relative">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateColor(index, e.target.value)}
                      className="w-14 h-14 rounded-xl border-2 border-gray-600 cursor-pointer"
                    />
                    <div 
                      className="absolute inset-1 rounded-lg pointer-events-none flex items-center justify-center text-xs font-bold"
                      style={{ 
                        backgroundColor: color,
                        color: getContrastColor(color)
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Color info */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => updateColor(index, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#1A1F2E] text-white font-mono"
                      placeholder="#000000"
                    />
                    <div className="mt-1 text-xs text-gray-400">Color {index + 1}</div>
                  </div>
                  
                  {/* Remove button */}
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
          </div>
        )}

        {/* Add Color Button */}
        {currentPalette.length < maxColors && (
          <div className="mt-6">
            <button
              onClick={addNewColor}
              className="flex items-center space-x-2 px-4 py-3 text-sm bg-[#2A3142] border-2 border-dashed border-gray-600 text-gray-300 rounded-xl hover:bg-[#323B4F] hover:border-gray-500 transition-all w-full justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add Color to Palette</span>
            </button>
          </div>
        )}

        {/* Palette Preview */}
        {currentPalette.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h5 className="text-sm font-semibold text-gray-300 mb-3">Palette Preview</h5>
            <div className="flex rounded-lg overflow-hidden border border-gray-600">
              {currentPalette.map((color, index) => (
                <div
                  key={index}
                  className="flex-1 h-12 relative group"
                  style={{ backgroundColor: color }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-mono transition-opacity">
                      {color}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}