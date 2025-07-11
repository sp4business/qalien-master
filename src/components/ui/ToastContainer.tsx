'use client';

import { createContext, useContext } from 'react';
import { useToast as useToastHook } from '@/hooks/useToast';
import { Toast } from './Toast';

const ToastContext = createContext<ReturnType<typeof useToastHook> | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastHelpers = useToastHook();

  return (
    <ToastContext.Provider value={toastHelpers}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toastHelpers.toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={toastHelpers.removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}