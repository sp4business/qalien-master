'use client';

import QAlienModal from './QAlienModal';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assetName: string;
  isDeleting?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  assetName,
  isDeleting = false
}: DeleteConfirmationModalProps) {
  return (
    <QAlienModal isOpen={isOpen} onClose={onClose} title="Delete Asset">
      <div className="space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm">
              <p className="font-semibold text-red-500 mb-1">Warning: This action cannot be undone</p>
              <p className="text-gray-300">
                You are about to permanently delete <span className="font-semibold text-white">"{assetName}"</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-400">
          <p className="font-semibold text-white">This will permanently delete:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>The asset file from storage</li>
            <li>All AI analysis and compliance data</li>
            <li>Historical performance metrics</li>
            <li>Any associated reports or exports</li>
          </ul>
        </div>

        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500">
            <strong>Note:</strong> If this asset is referenced in any campaigns or reports, those references will be broken. Consider archiving instead of deleting if you need to maintain historical records.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              'Delete Asset'
            )}
          </button>
        </div>
      </div>
    </QAlienModal>
  );
}