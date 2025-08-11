'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useSupabaseClient } from '@/lib/supabase';

interface DangerZoneProps {
  brand: {
    id: string;
    name?: string;
    brand_name?: string;
    clerk_org_id: string;
  };
}

export default function DangerZone({ brand }: DangerZoneProps) {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const brandName = brand.name || brand.brand_name || 'this brand';
  const expectedConfirmText = 'DELETE';

  const handleDelete = async () => {
    if (confirmText !== expectedConfirmText) {
      alert(`Please type ${expectedConfirmText} to confirm`);
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete the brand (this will cascade delete related records due to foreign key constraints)
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brand.id);

      if (error) throw error;
      
      // Redirect to the organization page
      router.push(`/?org=${brand.clerk_org_id}`);
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Failed to delete brand. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">Danger Zone</h2>
          <p className="text-gray-400">Irreversible and destructive actions</p>
        </div>

        <div className="border border-red-500/30 rounded-lg p-6 bg-red-500/10">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white mb-2">Delete this brand</h3>
              <p className="text-gray-300 mb-4">
                Once you delete a brand, there is no going back. This action will permanently delete:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 mb-4">
                <li>All brand settings and configurations</li>
                <li>All uploaded assets (logos, guidelines, etc.)</li>
                <li>All golden set creatives</li>
                <li>All campaigns and analytics data</li>
                <li>All team member associations</li>
              </ul>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete this brand
              </button>
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-400">Warning</h3>
              <div className="mt-2 text-sm text-yellow-300">
                <p>
                  Deleting a brand is permanent and cannot be undone. All data associated with this brand
                  will be permanently removed from our servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black opacity-80"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-[#2A3142] rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-white">
                    Delete brand
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-400">
                      Are you absolutely sure you want to delete <strong>{brandName}</strong>? 
                      This action cannot be undone and will permanently delete all associated data.
                    </p>
                    <div className="mt-4">
                      <label htmlFor="confirm-delete" className="block text-sm font-medium text-gray-300 mb-2">
                        Type <strong>{expectedConfirmText}</strong> to confirm:
                      </label>
                      <input
                        type="text"
                        id="confirm-delete"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder={expectedConfirmText}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={confirmText !== expectedConfirmText || isDeleting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete brand'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmText('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-[#2A3142] text-base font-medium text-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}