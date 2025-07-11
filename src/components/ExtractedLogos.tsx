import React, { useState, useEffect } from 'react';

interface ExtractedLogo {
  s3_key: string;
  confidence: number;
  page_number: number;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ExtractedLogosProps {
  logos: ExtractedLogo[];
  onSelectionChange: (selectedKeys: string[]) => void;
}

const ExtractedLogos: React.FC<ExtractedLogosProps> = ({ logos, onSelectionChange }) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [preSignedUrls, setPreSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Convert S3 keys to pre-signed URLs
  useEffect(() => {
    const fetchPreSignedUrls = async () => {
      if (!logos || logos.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Import necessary auth functions at the top of your component
        const { fetchAuthSession } = await import('../lib/auth-stubs');
        const { API_ENDPOINT } = await import('../aws-config');
        
        // Get authentication token
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if (!token) {
          throw new Error('No authentication token available');
        }

        // Call API to get pre-signed URLs
        const response = await fetch(`${API_ENDPOINT}/presigned-urls`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            s3_keys: logos.map(logo => logo.s3_key)
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch pre-signed URLs');
        }

        const data = await response.json();
        console.log('Presigned URLs response:', data);
        setPreSignedUrls(data.urls || {});
      } catch (error) {
        console.error('Error fetching pre-signed URLs:', error);
        // Set empty URLs to show placeholders
        const emptyUrls: Record<string, string> = {};
        logos.forEach((logo) => {
          emptyUrls[logo.s3_key] = '';
        });
        setPreSignedUrls(emptyUrls);
      } finally {
        setLoading(false);
      }
    };

    fetchPreSignedUrls();
  }, [logos]);

  const handleLogoClick = (s3Key: string) => {
    const newSelectedKeys = selectedKeys.includes(s3Key)
      ? selectedKeys.filter(key => key !== s3Key)
      : [...selectedKeys, s3Key];
    
    setSelectedKeys(newSelectedKeys);
    onSelectionChange(newSelectedKeys);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400 bg-green-500/20';
    if (confidence >= 0.7) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!logos || logos.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
        <div className="text-gray-400">
          <p className="text-lg font-medium mb-2">No logos detected</p>
          <p className="text-sm">The PDF analysis didn't find any logos. You can manually upload logo files later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Select Extracted Logos</h3>
        <div className="text-sm text-gray-400">
          {selectedKeys.length} of {logos.length} selected
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {logos.map((logo, index) => {
          const isSelected = selectedKeys.includes(logo.s3_key);
          const confidencePercent = Math.round(logo.confidence * 100);
          
          return (
            <div
              key={logo.s3_key}
              onClick={() => handleLogoClick(logo.s3_key)}
              className={`
                relative cursor-pointer rounded-lg border-2 transition-all
                ${isSelected 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }
              `}
            >
              {/* Checkbox overlay */}
              <div className={`
                absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center
                ${isSelected 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-700 border border-gray-600'
                }
              `}>
                {isSelected && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Logo image */}
              <div className="aspect-square p-4 flex items-center justify-center bg-white/5 rounded-t-lg">
                {preSignedUrls[logo.s3_key] ? (
                  <img
                    src={preSignedUrls[logo.s3_key]}
                    alt={`Logo from page ${logo.page_number}`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      console.error('Failed to load image:', logo.s3_key, 'URL:', preSignedUrls[logo.s3_key]?.substring(0, 100) + '...');
                      // Show fallback instead of hiding
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-20 h-20 bg-gray-700 rounded flex items-center justify-center"><span class="text-gray-500 text-xs">Logo</span></div>';
                      }
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-700 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-xs">Logo</span>
                  </div>
                )}
              </div>

              {/* Logo info */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Page {logo.page_number}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(logo.confidence)}`}>
                    {confidencePercent}%
                  </span>
                </div>
                
                {logo.bounding_box && (
                  <div className="text-xs text-gray-500">
                    {logo.bounding_box.width} × {logo.bounding_box.height}px
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>Tip:</strong> Select all logos that represent your brand. You can select multiple variations if needed.
        </p>
      </div>
    </div>
  );
};

export default ExtractedLogos;