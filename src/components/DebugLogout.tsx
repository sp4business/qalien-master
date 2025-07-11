'use client';

import { completeLogout } from '../utils/auth';

export default function DebugLogout() {
  const handleForceLogout = async () => {
    console.log('Force logout initiated...');
    await completeLogout();
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleForceLogout}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-lg"
      >
        🚨 Force Logout
      </button>
    </div>
  );
}