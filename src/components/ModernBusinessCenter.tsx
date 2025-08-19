'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrganizationList, useOrganization, useUser } from '@clerk/nextjs';
import { useBrands, useCreateBrand, useDeleteBrand } from '@/hooks/useBrands';
import QAlienLoadingScreen from './QAlienLoadingScreen';
import { Brand } from '@/hooks/useBrands';

export default function ModernBusinessCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgIdFromUrl = searchParams.get('org');
  
  // Clerk hooks - fetch user's organizations
  const { userMemberships, isLoaded: orgsLoaded, setActive, revalidate, userInvitations } = useOrganizationList({
    userMemberships: true,
    userInvitations: true,
  });
  const { organization, isLoaded: currentOrgLoaded } = useOrganization();
  const { user } = useUser();
  
  // Supabase hooks
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  const createBrand = useCreateBrand();
  const deleteBrand = useDeleteBrand();
  
  // Local state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationChecked, setDeleteConfirmationChecked] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDescription, setNewBrandDescription] = useState('');
  const [newBrandIndustry, setNewBrandIndustry] = useState('');
  const [hasRevalidated, setHasRevalidated] = useState(false);
  const [hasCheckedInvitations, setHasCheckedInvitations] = useState(false);

  // Switch organization when URL changes
  useEffect(() => {
    if (orgIdFromUrl && orgsLoaded && userMemberships?.data && setActive) {
      const targetMembership = userMemberships.data.find(mem => mem.organization.id === orgIdFromUrl);
      if (targetMembership && targetMembership.organization.id !== organization?.id) {
        console.log('Switching to organization:', targetMembership.organization.id);
        setActive({ organization: targetMembership.organization.id }).catch(err => {
          console.error('Error switching organization:', err);
        });
      }
    }
  }, [orgIdFromUrl, orgsLoaded, userMemberships, organization, setActive]);

  // Debug logging and revalidation for new invitations
  useEffect(() => {
    try {
      console.log('ModernBusinessCenter Debug:', {
        orgsLoaded,
        userMembershipsCount: userMemberships?.data?.length,
        userInvitationsCount: userInvitations?.data?.length,
        currentOrg: organization,
        orgIdFromUrl,
        brandsCount: brands.length,
        setActiveExists: !!setActive
      });

      // Check if we came from an invitation (check for referrer or URL params)
      const urlParams = new URLSearchParams(window.location.search);
      const fromInvite = urlParams.get('from_invite') === 'true' || 
                        document.referrer.includes('accept-org-invite');
      
      // Revalidate organization list if we haven't already and came from invitation
      if (orgsLoaded && !hasRevalidated && fromInvite && revalidate) {
        console.log('Revalidating organization list after invitation...');
        revalidate().then(() => {
          console.log('Organization list revalidated');
          setHasRevalidated(true);
        });
      }
    } catch (error) {
      console.error('Debug logging error:', error);
    }
  }, [orgsLoaded, userMemberships, userInvitations, organization, orgIdFromUrl, brands, hasRevalidated, revalidate]);

  // Check for pending invitations on first load
  useEffect(() => {
    if (!orgsLoaded || !userInvitations || hasCheckedInvitations) return;

    const checkPendingInvitations = async () => {
      if (userInvitations.data && userInvitations.data.length > 0) {
        console.log('Found pending invitations in BusinessCenter:', userInvitations.data.length);
        setHasCheckedInvitations(true);
        
        // Show a message to the user
        const pendingOrg = userInvitations.data[0].publicOrganizationData.name;
        if (confirm(`You have a pending invitation to join "${pendingOrg}". Would you like to accept it now?`)) {
          try {
            await userInvitations.data[0].accept();
            console.log('Invitation accepted from BusinessCenter');
            window.location.reload();
          } catch (error) {
            console.error('Error accepting invitation:', error);
          }
        }
      }
      setHasCheckedInvitations(true);
    };

    checkPendingInvitations();
  }, [orgsLoaded, userInvitations, hasCheckedInvitations]);

  const handleOrganizationClick = (membership: any) => {
    router.push(`/?org=${membership.organization.id}`);
  };

  const handleBrandClick = (brand: Brand) => {
    router.push(`/brand/${brand.id}`);
  };

  const handleDeleteBrand = (brand: Brand, e: React.MouseEvent) => {
    e.stopPropagation();
    setBrandToDelete(brand);
    setShowDeleteModal(true);
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteBrand.mutateAsync(brandToDelete.id);
      setShowDeleteModal(false);
      setBrandToDelete(null);
      setDeleteConfirmationChecked(false);
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
    setDeleteConfirmationChecked(false);
  };

  const handleAddBrand = () => {
    if (orgIdFromUrl && organization) {
      // Navigate to the brand onboarding wizard
      router.push(`/brand/onboard?org=${orgIdFromUrl}`);
    } else {
      alert("Please select an organization first.");
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Creating brand with data:', {
        name: newBrandName,
        description: newBrandDescription,
        industry: newBrandIndustry,
        orgId: organization?.id
      });
      
      await createBrand.mutateAsync({
        name: newBrandName,
        description: newBrandDescription || undefined,
        industry: newBrandIndustry || undefined,
      });
      
      // Reset form
      setNewBrandName('');
      setNewBrandDescription('');
      setNewBrandIndustry('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating brand:', error);
      alert('Error creating brand. Please try again.');
    }
  };

  const getOrgColor = (index: number) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-green-500',
      'bg-purple-500'
    ];
    return colors[index % colors.length];
  };

  const getBrandColor = (index: number) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-green-500',
      'bg-purple-500'
    ];
    return colors[index % colors.length];
  };

  // Loading state
  if (!orgsLoaded || !currentOrgLoaded) {
    return (
      <QAlienLoadingScreen
        isVisible={true}
        type="organizations"
        message="Loading organizations..."
        duration={1500}
      />
    );
  }

  const isLoadingBrands = brandsLoading && orgIdFromUrl;

  return (
    <>
      {/* Loading screen for brands */}
      <QAlienLoadingScreen
        isVisible={isLoadingBrands}
        type="brands"
        message="Loading brands..."
        duration={800}
      />
      
      <div className="bg-[#1A1F2E] text-white min-h-screen">
        {/* Main Content */}
        <div className="px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-semibold mb-2">
                  {orgIdFromUrl && organization ? organization.name : 'Business Center'}
                </h2>
                <p className="text-gray-400 text-lg">
                  {orgIdFromUrl && organization
                    ? 'Select a brand to manage assets and guidelines' 
                    : 'Select an organization to manage brands and campaigns'}
                </p>
              </div>
              {orgIdFromUrl && organization && (
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
              {!orgIdFromUrl && revalidate && (
                <button 
                  onClick={() => {
                    console.log('Manually refreshing organizations...');
                    revalidate();
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                  title="Refresh organizations list"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>

            {/* Create Brand Form */}
            {showCreateForm && (
              <div className="mb-8 bg-[#2A3142] rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Create New Brand</h3>
                <form onSubmit={handleCreateBrand} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-[#1A1F2E] border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
                      placeholder="Enter brand name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newBrandDescription}
                      onChange={(e) => setNewBrandDescription(e.target.value)}
                      className="w-full px-4 py-2 bg-[#1A1F2E] border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
                      placeholder="Enter brand description"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={newBrandIndustry}
                      onChange={(e) => setNewBrandIndustry(e.target.value)}
                      className="w-full px-4 py-2 bg-[#1A1F2E] border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
                      placeholder="e.g., Technology, Fashion, Food & Beverage"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={createBrand.isPending}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                      {createBrand.isPending ? 'Creating...' : 'Create Brand'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Organization/Brand Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!orgIdFromUrl ? (
                // Organizations View - Show when no org selected in URL
                (userMemberships?.data || []).map((membership, index) => (
                  <div
                    key={membership.organization.id}
                    onClick={() => handleOrganizationClick(membership)}
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
                    <h3 className="text-2xl font-semibold mb-2">{membership.organization.name}</h3>
                    <p className="text-gray-400 mb-2">{membership.organization.slug}</p>
                    <p className="text-gray-500 text-sm">Role: {membership.role || 'member'}</p>
                  </div>
                ))
              ) : (
                // Brands View
                brands.map((brand, index) => {
                  const isArchived = brand.status === 'archived';
                  return (
                    <div
                      key={brand.id}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/brand/${brand.id}/settings`);
                            }}
                            className="w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Brand settings"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
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
                        {brand.name}
                        {isArchived && <span className="text-sm text-red-400 ml-2">(Archived)</span>}
                      </h3>
                      <p className="text-gray-400 mb-2">{organization?.name || ''}</p>
                      <p className="text-gray-500 text-sm">{brand.description || brand.industry}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Empty States - Alpha Invitation Only */}
            {!orgIdFromUrl && (!userMemberships?.data || userMemberships.data.length === 0) && !isLoadingBrands && (
              <div className="text-center py-16 max-w-2xl mx-auto">
                {/* Alpha Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full mb-8">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  <span className="text-blue-400 text-sm font-medium">ALPHA ACCESS</span>
                </div>

                {/* Icon */}
                <div className="w-24 h-24 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-semibold mb-3">Welcome to QAlien Alpha</h3>
                
                {/* Main Message */}
                <p className="text-gray-400 mb-8 leading-relaxed max-w-md mx-auto">
                  QAlien is currently in alpha and available by invitation only. 
                  Please check your email{user?.emailAddresses?.[0]?.emailAddress && <span className="text-gray-300"> ({user.emailAddresses[0].emailAddress})</span>} for an invitation from your organization administrator.
                </p>

                {/* Info Box */}
                <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6 mb-8 max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-sm text-gray-300 mb-2 font-medium">Waiting for an invitation?</p>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Organization invitations are sent via email. If you haven't received one yet, 
                        please contact your organization administrator.
                      </p>
                      {document.referrer.includes('accept-org-invite') && (
                        <p className="text-sm text-yellow-400 mt-2">
                          If you just accepted an invitation, click refresh below to see your organization.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-4">
                  {revalidate && (
                    <button 
                      onClick={() => {
                        console.log('Checking for organizations...');
                        revalidate();
                      }}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Check for Invitations
                    </button>
                  )}
                  <button 
                    onClick={() => window.location.href = '/login'}
                    className="px-6 py-3 bg-transparent border border-gray-600 hover:border-gray-500 rounded-lg transition-colors text-gray-400 hover:text-gray-300"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {orgIdFromUrl && organization && brands.length === 0 && !brandsLoading && !showCreateForm && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium mb-2">No Brands Yet</h3>
                <p className="text-gray-400 mb-6">Create your first brand to get started</p>
                <button
                  onClick={handleAddBrand}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Create Your First Brand
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && brandToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#2A3142] rounded-lg p-8 max-w-lg w-full mx-4 border-2 border-red-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-red-400">Delete Brand Permanently</h3>
              </div>
              
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-300 font-medium mb-2">⚠️ This action will permanently delete:</p>
                <ul className="text-gray-300 ml-6 space-y-1 list-disc">
                  <li>The brand "{brandToDelete.name}"</li>
                  <li>All campaigns associated with this brand</li>
                  <li>All creative assets and compliance reports</li>
                  <li>All brand guidelines and settings</li>
                  <li>All team access and permissions</li>
                </ul>
              </div>
              
              <p className="text-gray-400 mb-6">
                This action <span className="text-red-400 font-semibold">CANNOT be undone</span>. 
                All data will be permanently removed from our servers.
              </p>
              
              <div className="mb-6">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={deleteConfirmationChecked}
                    onChange={(e) => setDeleteConfirmationChecked(e.target.checked)}
                    className="mt-1 w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-300">
                    I understand that I am permanently deleting this brand and all associated data, 
                    including campaigns, assets, and reports. This action cannot be reversed.
                  </span>
                </label>
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  onClick={cancelDeleteBrand}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteBrand}
                  disabled={isDeleting || !deleteConfirmationChecked}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-gray-500 rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Brand Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}