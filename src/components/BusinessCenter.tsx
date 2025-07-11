'use client';

import { useState, useEffect } from 'react';
import { fetchAuthSession } from '../lib/auth-stubs';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_ENDPOINT, fetchWithAuth } from '../lib/aws-stubs';
import QAlienLoadingScreen from './QAlienLoadingScreen';

interface Organization {
  org_id: string;
  org_name: string;
  industry: string;
  role: string;
  asset_quota_gb: number;
  created_ts: string;
}

interface Brand {
  brand_id: string;
  brand_name: string;
  industry: string;
  description?: string;
  created_at: string;
  status: string;
  org_id?: string;
}

export default function BusinessCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingType, setLoadingType] = useState<'organizations' | 'brands'>('organizations');
  const [loadingMessage, setLoadingMessage] = useState('Loading organizations...');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const orgIdFromUrl = searchParams.get('org');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (orgIdFromUrl) {
      fetchBrands(orgIdFromUrl);
    }
  }, [orgIdFromUrl]);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      setLoadingType('organizations');
      setLoadingMessage('Loading your organizations...');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetchWithAuth(`${API_ENDPOINT}/organizations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrands = async (orgId: string) => {
    try {
      setIsLoading(true);
      setLoadingType('brands');
      setLoadingMessage('Loading brands...');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetchWithAuth(`${API_ENDPOINT}/brands?org_id=${orgId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Log raw data for debugging
        console.log('Raw brands data from API:', data);
        
        // Filter out any archived brands that might have slipped through
        const allBrands = data || [];
        const archivedBrands = allBrands.filter((brand: Brand) => brand.status === 'archived');
        const activeBrands = allBrands.filter((brand: Brand) => brand.status !== 'archived');
        
        if (archivedBrands.length > 0) {
          console.warn('⚠️ Backend returned archived brands:', archivedBrands);
        }
        
        setBrands(activeBrands);
        console.log(`✅ Fetched ${activeBrands.length} active brands (filtered out ${archivedBrands.length} archived)`);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      setBrands([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationClick = (org: Organization) => {
    router.push(`/?org=${org.org_id}`);
  };

  const handleBrandClick = (brand: Brand) => {
    router.push(`/brand/${brand.brand_id}`);
  };

  const handleDeleteBrand = (brand: Brand, e: React.MouseEvent) => {
    e.stopPropagation();
    setBrandToDelete(brand);
    setShowDeleteModal(true);
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;

    console.log('🗑️ Attempting to delete brand:', brandToDelete);

    try {
      setIsDeleting(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetchWithAuth(`${API_ENDPOINT}/brand/${brandToDelete.brand_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Successfully archived - remove from UI
        setBrands(brands.filter(b => b.brand_id !== brandToDelete.brand_id));
        setShowDeleteModal(false);
        setBrandToDelete(null);
        
        // Refresh brand list to ensure consistency
        if (orgIdFromUrl) {
          await fetchBrands(orgIdFromUrl);
        }
      } else if (response.status === 400) {
        // Check if it's already archived
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        if (errorData.error === 'Brand is already archived') {
          // Brand is already archived, remove it from UI
          setBrands(brands.filter(b => b.brand_id !== brandToDelete.brand_id));
          setShowDeleteModal(false);
          setBrandToDelete(null);
          console.log('Brand was already archived, removed from UI');
          
          // Refresh brand list to ensure consistency
          if (orgIdFromUrl) {
            await fetchBrands(orgIdFromUrl);
          }
        } else {
          // Other 400 error
          console.error('Failed to delete brand:', response.status, errorData);
          alert(`Failed to delete brand: ${errorData.error || errorText}`);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to delete brand:', response.status, errorText);
        alert(`Failed to delete brand (${response.status}): ${errorText}. Please try again.`);
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Error deleting brand. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteBrand = () => {
    setShowDeleteModal(false);
    setBrandToDelete(null);
  };

  const handleAddBrand = () => {
    if (orgIdFromUrl) {
      router.push(`/brand/onboard?org=${orgIdFromUrl}`);
    } else {
      alert("Cannot add a brand without an active organization.");
    }
  };

  const getOrgColor = (index: number) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  const getBrandColor = (index: number) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  const selectedOrg = orgIdFromUrl ? organizations.find(o => o.org_id === orgIdFromUrl) : null;

  if (isLoading && organizations.length === 0) {
    return (
      <QAlienLoadingScreen
        isVisible={isLoading}
        type={loadingType}
        message={loadingMessage}
        duration={1500}
      />
    );
  }

  return (
    <>
      {/* QAlien Loading Screen for brand loading */}
      <QAlienLoadingScreen
        isVisible={isLoading && organizations.length > 0}
        type={loadingType}
        message={loadingMessage}
        duration={800}
      />
      
    <div className="bg-[#1A1F2E] text-white">
      {/* Main Content */}
      <div className="px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl font-semibold mb-2">
                {orgIdFromUrl && selectedOrg ? selectedOrg.org_name : 'Business Center'}
              </h2>
              <p className="text-gray-400 text-lg">
                {orgIdFromUrl
                  ? 'Select a brand to manage assets and guidelines' 
                  : 'Select an organization to manage brands and campaigns'}
              </p>
            </div>
            {orgIdFromUrl && (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleAddBrand}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
                >
                  + Add Brand
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  ← Back to Organizations
                </button>
              </div>
            )}
          </div>

          {/* Organization/Brand Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!orgIdFromUrl ? (
              // Organizations View
              organizations.map((org, index) => (
                <div
                  key={org.org_id}
                  onClick={() => handleOrganizationClick(org)}
                  className="bg-[#2A3142] hover:bg-[#323B4F] rounded-2xl p-8 cursor-pointer transition-all hover:scale-[1.02] border border-gray-700"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-20 h-20 ${getOrgColor(index)} rounded-2xl flex items-center justify-center`}>
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">{org.org_name}</h3>
                  <p className="text-gray-400 mb-2">{org.industry}</p>
                  <p className="text-gray-500 text-sm">Role: {org.role}</p>
                </div>
              ))
            ) : (
              // Brands View
              brands.map((brand, index) => {
                const isArchived = brand.status === 'archived';
                return (
                  <div
                    key={brand.brand_id}
                    onClick={() => !isArchived && handleBrandClick(brand)}
                    className={`bg-[#2A3142] rounded-2xl p-8 transition-all border border-gray-700 relative group ${
                      isArchived 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-[#323B4F] cursor-pointer hover:scale-[1.02]'
                    }`}
                  >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-20 h-20 ${getBrandColor(index)} rounded-2xl flex items-center justify-center`}>
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteBrand(brand, e)}
                        className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete brand"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 5h4l2-1h6l2 1h4" />
                        </svg>
                      </button>
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">
                    {brand.brand_name}
                    {isArchived && <span className="text-sm text-red-400 ml-2">(Archived)</span>}
                  </h3>
                  <p className="text-gray-400 mb-2">{selectedOrg?.org_name}</p>
                  <p className="text-gray-500 text-sm">{brand.description || brand.industry}</p>
                </div>
                );
              })
            )}
          </div>

          {/* Empty States */}
          {!orgIdFromUrl && organizations.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">No Organizations Yet</h3>
              <p className="text-gray-400 mb-6">Create your first organization to get started</p>
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Create Organization
              </button>
            </div>
          )}

          {orgIdFromUrl && brands.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">No Brands Yet</h3>
              <p className="text-gray-400 mb-6">Create your first brand in this organization</p>
              <button 
                onClick={handleAddBrand}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add Brand
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && brandToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2A3142] rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Brand</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "<span className="font-semibold text-white">{brandToDelete.brand_name}</span>"? 
              This will permanently remove all associated campaigns, assets, and compliance data.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDeleteBrand}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBrand}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Brand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}